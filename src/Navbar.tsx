import React from 'react';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="bg-white shadow px-6 py-4 flex items-center justify-between">
      {/* Sol köşede YTU logosu */}
      <div className="w-24">
        <img
          src="/ytu-logo.png"
          alt="YTU Logo"
          className="h-20 w-auto object-contain"
        />
      </div>

      {/* Ortada Yapı Kulübü logosu */}
      <div className="flex-1 flex justify-center">
        <img
          src="/3.png"
          alt="Yapı Kulübü"
          className="h-16 w-auto object-contain"
        />
      </div>

      {/* Sağda giriş/çıkış butonu */}
      <div className="w-24 text-right">
        {user ? (
          <button
            onClick={logout}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
          >
            Çıkış Yap
          </button>
        ) : (
          <button
            onClick={login}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          >
            Giriş Yap
          </button>
        )}
      </div>
    </nav>
  );
}
