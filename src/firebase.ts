// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDFlf1NoPFy207PMhwihX_MqBhEpMlR-zs",
  authDomain: "tasarim-galerisi.firebaseapp.com",
  databaseURL: "https://tasarim-galerisi-default-rtdb.europe-west1.firebasedatabase.app", // DÜZELTİLDİ
  projectId: "tasarim-galerisi",
  storageBucket: "tasarim-galerisi.appspot.com",
  messagingSenderId: "252036872044",
  appId: "1:252036872044:web:c4b85e5ecdac165d326549"
};

// Uygulama başlatılıyor
const app = initializeApp(firebaseConfig);

// Auth ve DB dışa aktarılıyor
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);
