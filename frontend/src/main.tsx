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
import "./index.css";
import "./i18n";

// Lazy-load heavy components to reduce initial bundle size
const RoomTV = lazy(() => import("./pages/RoomTV"));
const RoomMobile = lazy(() => import("./pages/RoomMobile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterHost />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/guest-register" element={<GuestRegister />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/join/:code" element={<JoinRedirect />} />
              <Route path="/room/:code/tv" element={<RoomTV />} />
              <Route path="/room/:code/tv/login" element={<TvLogin />} />
              <Route path="/room/:code" element={<RoomMobile />} />
              <Route path="/admin" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
