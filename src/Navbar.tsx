// src/Navbar.tsx
import React from 'react';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <div className="bg-gray-100 px-4 py-3 flex justify-between items-center mb-4">
      <h1 className="text-xl font-bold">Baret Tasarım Galerisi</h1>
      {user ? (
        <div className="flex items-center gap-3">
          <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" />
          <span>{user.displayName}</span>
          <button onClick={logout} className="text-red-500 text-sm underline">
            Çıkış
          </button>
        </div>
      ) : (
        <button onClick={login} className="bg-blue-500 text-white px-3 py-1 rounded">
          Giriş Yap
        </button>
      )}
    </div>
  );
}
