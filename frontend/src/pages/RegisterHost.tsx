import { useTranslation } from 'react-i18next';
import Logo from "../components/Logo";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterHost() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { registerHost } = useAuth();

  // All fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const result = await registerHost({
        name,
        email,
        phone,
        password,
        city,
        birthDate,
        gender,
      });

      if (result.success) {
        navigate("/create-room");
      } else {
        setError(result.error || "Erro ao criar conta");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 400 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 24 }}>
        {t("register.desc", "Crie sua conta para poder criar salas de karaokê")}
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "#ff4444",
                color: "white",
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Dados básicos */}
          <h3
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: "1rem",
              color: "#888",
            }}
          >
            Dados pessoais
          </h3>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("register.namePlaceholder", "Seu nome")}
            required
            style={{ marginBottom: 12 }}
          />

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t("register.emailPlaceholder", "Seu email")}
            required
            style={{ marginBottom: 12 }}
          />

          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={t("register.phonePlaceholder", "Celular (ex: 11999998888)")}
            required
            style={{ marginBottom: 20 }}
          />

          {/* Dados de host */}
          <h3
            style={{
              marginTop: 0,
              marginBottom: 16,
              fontSize: "1rem",
              color: "#888",
            }}
          >
            Dados para criar salas
          </h3>

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t("register.passwordPlaceholder", "Crie uma senha (mín. 6 caracteres)")}
            required
            minLength={6}
            style={{ marginBottom: 12 }}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={t("register.confirmPasswordPlaceholder", "Confirme sua senha")}
            required
            minLength={6}
            style={{ marginBottom: 12 }}
          />

          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder={t("register.cityPlaceholder", "Sua cidade")}
            required
            style={{ marginBottom: 12 }}
          />

          <input
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            placeholder="Data de nascimento"
            required
            style={{ marginBottom: 12 }}
          />

          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            required
            style={{
              marginBottom: 24,
              padding: "12px",
              fontSize: "16px",
              background: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: "8px",
              color: gender ? "#fff" : "#888",
              width: "100%",
            }}
          >
            <option value="" disabled>
              Gênero
            </option>
            <option value="masculino">{t("register.male", "Masculino")}</option>
            <option value="feminino">{t("register.female", "Feminino")}</option>
            <option value="outro">{t("register.other", "Outro")}</option>
            <option value="prefiro_nao_informar">{t("register.preferNotToSay", "Prefiro não informar")}</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginBottom: 16 }}
          >
            {loading ? t("register.creating", "Criando conta...") : t("register.createBtn", "Criar conta e continuar")}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#888", fontSize: "0.9rem" }}>
          Já tem conta?{" "}
          <Link to="/login" style={{ color: "#4CAF50" }}>
            Fazer login
          </Link>
        </p>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/" style={{ color: "#888" }}>
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}
