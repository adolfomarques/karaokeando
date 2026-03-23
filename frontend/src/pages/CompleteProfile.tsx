import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CompleteProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, completeRegistration } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("createRoom.passwordsDontMatch", "As senhas não coincidem"));
      return;
    }

    if (password.length < 6) {
      setError(t("complete.passwordTooShort", "A senha deve ter pelo menos 6 caracteres"));
      return;
    }

    setLoading(true);

    const result = await completeRegistration({
      phone,
      password,
      city,
      birthDate,
      gender,
    });

    if (result.success) {
      navigate("/");
    } else {
      setLoading(false);
      setError(result.error || t("complete.error", "Erro ao completar cadastro"));
    }
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
      <Logo width={220} style={{ marginBottom: "24px" }} />
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", marginBottom: "32px", fontSize: "1rem" }}>
        {t("complete.desc", "Complete seu cadastro para criar salas")}
      </p>

      <div className="glass-card" style={{ padding: "40px 36px", width: "100%", maxWidth: "480px" }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          padding: "16px 20px",
          borderRadius: "16px",
          marginBottom: "28px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#fff" }}>
            <strong>{user.name}</strong>
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{user.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: "rgba(255,80,80,0.15)", color: "#ff6b6b",
              padding: "12px 14px", borderRadius: "10px", marginBottom: "20px", fontSize: "0.88rem",
              border: "1px solid rgba(255,80,80,0.3)",
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {t("complete.phone", "Telefone")}
              </label>
              <input
                type="tel" value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {t("complete.city", "Cidade")}
              </label>
              <input
                type="text" value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Nome da Cidade"
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {t("complete.dob", "Nascimento")}
              </label>
              <input
                type="date" value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {t("complete.gender", "Gênero")}
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                required
                style={{
                  width: "100%", padding: "12px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: "0.95rem", outline: "none"
                }}
              >
                <option value="" disabled>{t("complete.select", "Selecione...")}</option>
                <option value="masculino">{t("register.male", "Masculino")}</option>
                <option value="feminino">{t("register.female", "Feminino")}</option>
                <option value="outro">{t("register.other", "Outro")}</option>
                <option value="prefiro_nao_informar">{t("register.preferNotToSay", "Prefiro não informar")}</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {t("complete.password", "Senha")}
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mín 6 chars"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 500, fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
                {t("complete.confirmPassword", "Confirmar")}
              </label>
              <input
                type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Senha novamente"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="glow-pulse" style={{ width: "100%", padding: "16px", fontWeight: "800" }}>
            {loading ? t("complete.saving", "Salvando...") : t("complete.btn", "Completar Cadastro")}
          </button>
        </form>
      </div>
    </div>
  );
}
