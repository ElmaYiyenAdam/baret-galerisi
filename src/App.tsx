import React from "react";
import { AuthProvider } from "./AuthContext";
import Navbar from "./Navbar";
import DesignGallery from "./DesignGallery";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="p-4">
          <DesignGallery />
        </main>
      </div>
    </AuthProvider>
  );
}