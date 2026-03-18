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
      setError(t("createRoom.passwordsDontMatch", "Passwords do not match"));
      return;
    }

    if (password.length < 6) {
      setError(t("complete.passwordTooShort", "Password must be at least 6 characters"));
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

    setLoading(true); // Manter loading enquanto navega

    if (result.success) {
      navigate("/");
    } else {
      setLoading(false);
      setError(result.error || t("complete.error", "Error completing registration"));
    }
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="container" style={{ paddingTop: 40, maxWidth: 450 }}>
      <Logo width={300} />
      <p style={{ textAlign: "center", color: "#888", marginBottom: 24 }}>
        {t("complete.desc", "Complete your registration to create rooms")}
      </p>

      <div className="card">
        <div
          style={{
            background: "#333",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            <strong>{user.name}</strong>
            <br />
            <span style={{ color: "#888" }}>{user.email}</span>
          </p>
        </div>

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

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("complete.phone", "Phone")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("complete.city", "City")}
          </label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City Name"
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("complete.dob", "Date of Birth")}
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("complete.gender", "Gender")}
          </label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            required
            style={{
              marginBottom: 16,
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
            }}
          >
            <option value="">{t("complete.select", "Select...")}</option>
            <option value="masculino">{t("register.male", "Male")}</option>
            <option value="feminino">{t("register.female", "Female")}</option>
            <option value="outro">{t("register.other", "Other")}</option>
            <option value="prefiro_nao_informar">{t("register.preferNotToSay", "Prefer not to say")}</option>
          </select>

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("complete.password", "Password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t("complete.passwordPlaceholder", "Min 6 characters")}
            required
            style={{ marginBottom: 16 }}
          />

          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            {t("complete.confirmPassword", "Confirm Password")}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={t("complete.confirmPlaceholder", "Type password again")}
            required
            style={{ marginBottom: 24 }}
          />

          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? t("complete.saving", "Saving...") : t("complete.btn", "Complete Registration")}
          </button>
        </form>
      </div>
    </div>
  );
}
