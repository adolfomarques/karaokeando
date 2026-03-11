import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { API_BASE } from "../api";

export default function ResetPassword() {
  const { } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token de recuperação ausente.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Senha atualizada com sucesso!");
        navigate("/login");
      } else {
        toast.error(data.message || "Erro ao redefinir senha");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container" style={{ paddingTop: 60, maxWidth: 400, textAlign: "center" }}>
        <Logo width={300} />
        <div className="card" style={{ marginTop: 32 }}>
          <p style={{ color: "#ff4444", marginBottom: 24 }}>Link de recuperação inválido ou expirado.</p>
          <button onClick={() => navigate("/forgot-password")}>Solicitar novo link</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 60, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 32 }}>
        Crie sua nova senha
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Nova Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="No mínimo 6 caracteres"
            required
            minLength={6}
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Confirmar Nova Senha
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirme sua senha"
            required
            style={{ marginBottom: 24 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Atualizando..." : "Redefinir Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
