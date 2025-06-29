// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDFlf1NoPFy207PMhwihX_MqBhEpMlR-zs',
  authDomain: 'tasarim-galerisi.firebaseapp.com',
  projectId: 'tasarim-galerisi',
  storageBucket: 'tasarim-galerisi.appspot.com',
  messagingSenderId: '252036872044',
  appId: '1:252036872044:web:c4b85e5ecdac165d326549',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
