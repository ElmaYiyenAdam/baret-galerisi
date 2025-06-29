// src/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, provider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";

// Context tipi
interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
}

// Context nesnesi
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

// Provider bileşeni
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const login = () => {
    signInWithPopup(auth, provider).catch(console.error);
  };

  const logout = () => {
    signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Kullanılabilir hale getir
export const useAuth = () => useContext(AuthContext);
