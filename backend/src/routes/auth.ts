import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import {
  hashPassword,
  verifyPassword,
  generateUserToken,
  generateResetToken,
  verifyToken,
  UserTokenPayload,
  ResetTokenPayload,
} from "../lib/auth.js";
import { Resend } from 'resend';

// Initialize resend only if API key is present to prevent crash
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

// Validation schemas
const registerGuestSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
});

const completeRegistrationSchema = z.object({
  phone: z.string().min(10, "Telefone inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  city: z.string().min(2, "Cidade inválida"),
  birthDate: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), "Data inválida"),
  gender: z.enum(["masculino", "feminino", "outro", "prefiro_nao_informar"]),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Middleware to extract user from token
export async function getUserFromRequest(
  request: FastifyRequest
): Promise<UserTokenPayload | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload || payload.type !== "user") return null;
  return payload;
}

// Middleware to require authenticated user
export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await getUserFromRequest(request);
  if (!user) {
    reply
      .code(401)
      .send({ error: "unauthorized", message: "Token inválido ou expirado" });
    return;
  }
  // Attach user to request for later use
  (request as any).user = user;
}

// Middleware to require host (can_host = true)
export async function requireHost(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireUser(request, reply);
  if (reply.sent) return;

  const user = (request as any).user as UserTokenPayload;
  if (!user.canHost) {
    reply.code(403).send({
      error: "forbidden",
      message: "Você precisa completar seu cadastro para criar salas",
    });
  }
}

// Middleware to require admin user
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await getUserFromRequest(request);
  if (!user || !user.isAdmin) {
    reply.code(403).send({
      error: "forbidden",
      message: "Acesso negado. Apenas administradores.",
    });
    return;
  }
  (request as any).user = user;
}

export default async function authRoutes(app: FastifyInstance) {
  // Register as guest (name + email + phone)
  app.post<{ Body: { name: string; email: string; phone: string } }>(
    "/api/auth/register-guest",
    async (request, reply) => {
      const parsed = registerGuestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "validation_error",
          details: parsed.error.errors,
        });
      }

      const { name, email, phone } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        // User exists - check if they have a password (is a host)
        if (user.passwordHash) {
          // This is a registered host - they need to login with password
          return reply.code(409).send({
            error: "email_registered",
            message: "Este email já está cadastrado. Faça login com sua senha.",
            requiresLogin: true,
          });
        }

        // Guest user exists - update name/phone if different and return token
        if (user.name !== name || user.phone !== phone) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name, phone },
          });
        }
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            name,
            email: normalizedEmail,
            phone,
          },
        });
      }

      const token = generateUserToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        canHost: user.canHost,
        isAdmin: user.isAdmin,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          canHost: user.canHost,
          isAdmin: user.isAdmin,
          isComplete: !!user.passwordHash,
        },
      };
    }
  );

  // Register as host (full registration in one step)
  app.post<{
    Body: {
      name: string;
      email: string;
      password: string;
    };
  }>("/api/auth/register-host", async (request, reply) => {
    const { name, email, password } = request.body;

    // Validate basic fields
    if (!name || name.length < 2) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Nome deve ter pelo menos 2 caracteres",
      });
    }
    if (!email || !email.includes("@")) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Email inválido" });
    }
    if (!password || password.length < 6) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Senha deve ter pelo menos 6 caracteres",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // User exists - check if already a host
      if (user.canHost) {
        return reply.code(400).send({
          error: "already_host",
          message: "Este email já está cadastrado como Host. Faça login.",
        });
      }

      // Update existing user to become host
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          passwordHash,
          canHost: true,
        },
      });
    } else {
      // Create new user as host
      user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          canHost: true,
        },
      });
    }

    const token = generateUserToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      canHost: true,
      isAdmin: user.isAdmin,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        canHost: true,
        isAdmin: user.isAdmin,
        isComplete: true,
      },
    };
  });

  // Complete registration (become a host)
  app.post<{
    Body: {
      phone: string;
      password: string;
      city: string;
      birthDate: string;
      gender: string;
    };
  }>("/api/auth/complete-registration", async (request, reply) => {
    const user = await getUserFromRequest(request);
    if (!user) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const parsed = completeRegistrationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        details: parsed.error.errors,
      });
    }

    const { phone, password, city, birthDate, gender } = parsed.data;

    // Check if already complete
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!existingUser) {
      return reply.code(404).send({ error: "user_not_found" });
    }

    if (existingUser.canHost) {
      return reply.code(400).send({
        error: "already_complete",
        message: "Cadastro já está completo",
      });
    }

    // Update user with complete info
    const passwordHash = await hashPassword(password);
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        phone,
        passwordHash,
        city,
        birthDate: new Date(birthDate),
        gender,
        canHost: true,
      },
    });

    // Generate new token with updated canHost
    const newToken = generateUserToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      canHost: true,
      isAdmin: updatedUser.isAdmin,
    });

    return {
      token: newToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        city: updatedUser.city,
        canHost: true,
        isAdmin: updatedUser.isAdmin,
        isComplete: true,
      },
    };
  });

  // Login via Google
  app.post<{ Body: { accessToken: string } }>(
    "/api/auth/google",
    async (request, reply) => {
      const { accessToken } = request.body;
      if (!accessToken) {
        return reply.code(400).send({ error: "validation_error", message: "Token ausente" });
      }

      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoRes.ok) {
          throw new Error("Google token invalido");
        }

        const data = await userInfoRes.json();
        const email = data.email.toLowerCase().trim();
        const name = data.name || "Usuario Google";

        let user = await prisma.user.findUnique({
          where: { email },
        });

        const isOwnerEmail = email === "adolfomarques@gmail.com";

        if (!user) {
          user = await prisma.user.create({
            data: {
              name,
              email,
              canHost: true,
              isAdmin: isOwnerEmail,
            },
          });
        } else {
          // Update canHost and also check for owner fail-safe promotion
          const updateData: any = { canHost: true };
          if (isOwnerEmail && !user.isAdmin) {
            updateData.isAdmin = true;
          }
          
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }

        const token = generateUserToken({
          userId: user.id,
          email: user.email,
          name: user.name,
          canHost: true,
          isAdmin: user.isAdmin,
        });

        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            city: user.city,
            canHost: true,
            isAdmin: user.isAdmin,
            isComplete: true,
          },
        };
      } catch (err: any) {
        console.error("ERRO GOOGLE LOGIN:", err);
        return reply.code(401).send({
          error: "invalid_credentials",
          message: "Acesso via Google falhou: " + (err.message || "Erro desconhecido"),
        });
      }
    }
  );

  // Login (email + password)
  app.post<{ Body: { email: string; password: string } }>(
    "/api/auth/login",
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "validation_error",
          details: parsed.error.errors,
        });
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return reply.code(401).send({
          error: "invalid_credentials",
          message: "Email ou senha inválidos",
        });
      }

      if (!user.passwordHash) {
        return reply.code(401).send({
          error: "no_password",
          message: "Esta conta não possui senha. Complete o cadastro primeiro.",
        });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({
          error: "invalid_credentials",
          message: "Email ou senha inválidos",
        });
      }

      const token = generateUserToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        canHost: user.canHost,
        isAdmin: user.isAdmin,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          city: user.city,
          canHost: user.canHost,
          isAdmin: user.isAdmin,
          isComplete: !!user.passwordHash,
        },
      };
    }
  );

  // Get current user
  app.get("/api/auth/me", async (request, reply) => {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    // Cache private info for a short time to avoid DB pressure on every route change
    reply.header("Cache-Control", "private, max-age=60");

    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        birthDate: true,
        gender: true,
        canHost: true,
        passwordHash: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: "user_not_found" });
    }

    // Owner fail-safe promotion in /me as well
    const isOwnerEmail = user.email === "adolfomarques@gmail.com";
    if (isOwnerEmail && !user.isAdmin) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
      user.isAdmin = true;
    }

    reply.header("Cache-Control", "private, max-age=60");
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        birthDate: user.birthDate,
        gender: user.gender,
        canHost: user.canHost,
        isAdmin: user.isAdmin,
        isComplete: !!user.passwordHash,
        createdAt: user.createdAt,
      },
    };
  });

  // Forgot Password (REAL)
  app.post<{ Body: { email: string; lng?: string } }>(
    "/api/auth/forgot-password",
    async (request, reply) => {
      const { email, lng = "pt" } = request.body;
      if (!email) {
        return reply.code(400).send({ error: "validation_error", message: "Email obrigatório" });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      let isEn = lng.startsWith("en");

      if (user) {
        const resetToken = generateResetToken(user.id);
        const resetLink = `https://karaokefactory.org/reset-password?token=${resetToken}`;
        const resendInstance = getResend();

        if (!resendInstance) {
          console.error("ERRO: RESEND_API_KEY não encontrada no servidor.");
          return reply.code(500).send({ 
            error: "email_error", 
            message: "Serviço de email indisponível. Verifique as configurações do servidor." 
          });
        }

        // Localized content
        isEn = lng.startsWith("en");
        const subject = isEn 
          ? 'Password Recovery - KaraokeFactory' 
          : 'Recuperação de Senha - KaraokeFactory';
        
        const html = isEn ? `
          <h1>Password Recovery</h1>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset at KaraokeFactory.</p>
          <p>Click the link below to create a new password (link expires in 15 minutes):</p>
          <a href="${resetLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
        ` : `
          <h1>Recuperação de Senha</h1>
          <p>Olá ${user.name},</p>
          <p>Você solicitou a redefinição de sua senha no KaraokeFactory.</p>
          <p>Clique no link abaixo para criar uma nova senha (o link expira em 15 minutos):</p>
          <a href="${resetLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
          <p>Se você não solicitou isso, ignore este email.</p>
        `;

        try {
          const { data, error } = await resendInstance.emails.send({
            from: 'KaraokeFactory <autenticacao@karaokefactory.org>',
            to: user.email,
            subject,
            html
          });

          if (error) {
            console.error("ERRO DO RESEND:", error);
          } else {
            console.log("Email enviado com sucesso via Resend:", data);
          }
        } catch (err) {
          console.error("Erro inesperado ao enviar email:", err);
        }
      }

      return { success: true, message: isEn ? "If the email is registered, a link has been sent." : "Se o email estiver cadastrado, um link foi enviado." };
    }
  );

  // Reset Password
  app.post<{ Body: { token: string; password: string } }>(
    "/api/auth/reset-password",
    async (request, reply) => {
      const bodySchema = z.object({
        token: z.string(),
        password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
      });

      const { token, password } = bodySchema.parse(request.body);
      
      const payload = verifyToken(token) as ResetTokenPayload | null;
      if (!payload || payload.type !== "reset") {
        return reply.code(401).send({ error: "invalid_token", message: "Link expirado ou inválido" });
      }

      const hashedPassword = await hashPassword(password);
      await prisma.user.update({
        where: { id: payload.userId },
        data: { passwordHash: hashedPassword },
      });

      return { success: true, message: "Senha atualizada com sucesso!" };
    }
  );
}
