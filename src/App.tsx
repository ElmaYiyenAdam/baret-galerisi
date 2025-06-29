// src/App.tsx
import React from 'react';
import { AuthProvider } from './AuthContext';
import Navbar from './Navbar';
import DesignGallery from './DesignGallery';

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <DesignGallery />
    </AuthProvider>
  );
}
