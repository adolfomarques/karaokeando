import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function promote() {
  const email = "adolfomarques@gmail.com";
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { isAdmin: true },
      create: {
        email,
        name: "Adolfo Marques (Admin)",
        isAdmin: true,
      },
    });
    console.log(`✅ Usuário ${email} agora é ADMINISTRADOR.`);
  } catch (error) {
    console.error(`❌ Erro:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

promote();
