import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import RegisterHost from "./pages/RegisterHost";
import CompleteProfile from "./pages/CompleteProfile";
import GuestRegister from "./pages/GuestRegister";
import CreateRoom from "./pages/CreateRoom";
import TvLogin from "./pages/TvLogin";
import JoinRedirect from "./pages/JoinRedirect";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import "./index.css";
import "./i18n";

// Lazy-load heavy components to reduce initial bundle size
const RoomTV = lazy(() => import("./pages/RoomTV"));
const RoomMobile = lazy(() => import("./pages/RoomMobile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSongs = lazy(() => import("./pages/admin/AdminSongs"));
const AdminPlaylists = lazy(() => import("./pages/admin/AdminPlaylists"));
const AdminScoreConfig = lazy(() => import("./pages/admin/AdminScoreConfig"));
const AdminBlockedChannels = lazy(() => import("./pages/admin/AdminBlockedChannels"));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎤</div>
        <div style={{ color: "#888", fontSize: "0.9rem" }}>Carregando...</div>
      </div>
    </div>
  );
}

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

import Terms from "./pages/Terms";
import ParticleBackground from "./components/ParticleBackground";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <ParticleBackground />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterHost />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/guest-register" element={<GuestRegister />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/join/:code" element={<JoinRedirect />} />
              <Route path="/room/:code/tv" element={<RoomTV />} />
              <Route path="/room/:code/tv/login" element={<TvLogin />} />
              <Route path="/room/:code" element={<RoomMobile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/songs" element={<AdminSongs />} />
              <Route path="/admin/playlists" element={<AdminPlaylists />} />
              <Route path="/admin/score-config" element={<AdminScoreConfig />} />
              <Route path="/admin/blocked-channels" element={<AdminBlockedChannels />} />
              <Route path="/old-admin" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
