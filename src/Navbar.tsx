// src/Navbar.tsx
import React from "react";
import { useAuth } from "./AuthContext";

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="bg-white shadow p-4 flex justify-between items-center mb-6">
      <h1 className="text-xl font-bold text-blue-600">🪖 Baret Tasarım Galerisi</h1>
      <div>
        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full" />
            <span className="text-sm">{user.displayName}</span>
            <button
              onClick={logout}
              className="text-sm text-red-500 underline"
            >
              Çıkış Yap
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Google ile Giriş Yap
          </button>
        )}
      </div>
    </nav>
  );
}