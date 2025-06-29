import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

const ADMIN_EMAIL = "saygincamsoy2005@hotmail.com";
const IMGBB_API_KEY = "6fcfb13dfb45994a4cfadbed6e5f7c23"; // 🔁 Buraya kendi API anahtarını yaz

type HelmetDesign = {
  id: string;
  title: string;
  imageUrl: string;
  rating: number;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  createdAt: Timestamp;
};

export default function DesignGallery() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<HelmetDesign[]>([]);
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const designsRef = collection(db, 'designs');
  const votesRef = collection(db, 'votes');

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const q = query(designsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: HelmetDesign[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as HelmetDesign[];
      setDesigns(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchVotes = async () => {
      const q = query(votesRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const votedDesignIds = snapshot.docs.map((doc) => doc.data().designId);
      setUserVotes(votedDesignIds);
    };
    fetchVotes();
  }, [user]);

  const hasVoted = (designId: string): boolean => {
    return userVotes.includes(designId);
  };

  const uploadToImgbb = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const formData = new FormData();
        formData.append('image', base64);

        try {
          const res = await axios.post(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            formData
          );
          resolve(res.data.data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddDesign = async () => {
    if (!title || !imageFile || !user) return;

    setUploading(true);
    try {
      const imageUrl = await uploadToImgbb(imageFile);

      const newDesign = {
        title,
        imageUrl,
        rating: 0,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonim',
        ownerAvatar: user.photoURL || null,
        createdAt: Timestamp.now(),
      };

      await addDoc(designsRef, newDesign);
      setTitle('');
      setImageFile(null);
    } catch (error) {
      console.error("Görsel yükleme hatası:", error);
      alert("Görsel yüklenemedi.");
    }
    setUploading(false);
  };

  const handleVote = async (id: string) => {
    if (!user || hasVoted(id)) return;

    await addDoc(votesRef, {
      userId: user.uid,
      designId: id,
      votedAt: Timestamp.now(),
    });

    const designDoc = doc(db, 'designs', id);
    await updateDoc(designDoc, {
      rating: (designs.find((d) => d.id === id)?.rating || 0) + 1,
    });

    setUserVotes((prev) => [...prev, id]);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'designs', id));
  };

  const top3 = [...designs].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto">
      {user ? (
        <div className="bg-white p-4 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-2">Yeni Baret Tasarımı Ekle</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="border p-2 rounded w-full"
              placeholder="Baret Tasarımı Adı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              className="border p-2 rounded w-full"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleAddDesign}
              disabled={uploading}
            >
              {uploading ? 'Yükleniyor...' : 'Yükle'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 italic mb-8">
          Baret tasarımı yüklemek için giriş yapmalısınız.
        </div>
      )}

      {top3.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3">🏆 En İyi 3 Baret Tasarımı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((design) => (
              <div key={design.id} className="bg-white rounded shadow p-2 relative">
                <img
                  src={design.imageUrl}
                  alt={design.title}
                  className="rounded mb-2 h-40 w-full object-cover"
                />
                <div className="font-semibold">{design.title}</div>
                <div className="text-sm">⭐ {design.rating}</div>
                {design.ownerAvatar && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <img src={design.ownerAvatar} className="w-5 h-5 rounded-full" />
                    <span>{design.ownerName}</span>
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(design.id)}
                    className="absolute top-2 right-2 text-xs text-red-500 hover:underline"
                  >
                    Sil
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-3">Tüm Baret Tasarımları</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {designs.map((design) => (
            <div key={design.id} className="bg-white rounded shadow p-2 relative">
              <img
                src={design.imageUrl}
                alt={design.title}
                className="rounded mb-2 h-40 w-full object-cover"
              />
              <div className="font-semibold">{design.title}</div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-sm">⭐ {design.rating}</div>
                {user ? (
                  hasVoted(design.id) ? (
                    <span className="text-sm text-gray-400">Oy kullandın</span>
                  ) : (
                    <button
                      onClick={() => handleVote(design.id)}
                      className="text-blue-500 text-sm hover:underline"
                    >
                      Oyla
                    </button>
                  )
                ) : (
                  <span className="text-sm text-gray-400">Giriş yapmalısın</span>
                )}
              </div>
              {design.ownerAvatar && (
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <img src={design.ownerAvatar} className="w-5 h-5 rounded-full" />
                  <span>{design.ownerName}</span>
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => handleDelete(design.id)}
                  className="absolute top-2 right-2 text-xs text-red-500 hover:underline"
                >
                  Sil
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
