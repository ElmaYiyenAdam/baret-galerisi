import React, { useState, useEffect } from 'react';
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
const IMGBB_API_KEY = "SENIN_IMGBB_API_KEY"; // Burayı kendi API key'inle değiştir

type Design = {
  id: string;
  title: string;
  imageUrl: string;
  rating: number;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  createdAt: Timestamp;
};

type Vote = 'like' | 'dislike';

export default function DesignGallery() {
  const { user, login, logout } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [userVotes, setUserVotes] = useState<Record<string, Vote>>({});
  const [isUploading, setIsUploading] = useState(false);

  const designsRef = collection(db, 'designs');
  const votesRef = collection(db, 'votes');

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const q = query(designsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Design[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Design[];
      setDesigns(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchVotes = async () => {
      const q = query(votesRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const votes: Record<string, Vote> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        votes[data.designId] = data.vote;
      });
      setUserVotes(votes);
    };
    fetchVotes();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setImageUrl(data.data.url);
    setIsUploading(false);
  };

  const handleAddDesign = async () => {
    if (!title || !imageUrl || !user) return;

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
    setImageUrl('');
  };

  const handleVote = async (id: string, vote: Vote) => {
    if (!user) return;

    const existingVote = userVotes[id];
    const newVotes = { ...userVotes };

    if (existingVote === vote) return; // aynı oyu tekrar verme

    const designDoc = doc(db, 'designs', id);
    const design = designs.find((d) => d.id === id);
    if (!design) return;

    if (existingVote) {
      // eski oyu sil
      const q = query(votesRef, where('userId', '==', user.uid), where('designId', '==', id));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docu) => await deleteDoc(doc(db, 'votes', docu.id)));
    }

    // yeni oyu kaydet
    await addDoc(votesRef, {
      userId: user.uid,
      designId: id,
      vote,
      votedAt: Timestamp.now(),
    });

    let newRating = design.rating;
    if (!existingVote) newRating += vote === 'like' ? 1 : -1;
    else newRating += vote === 'like' ? 2 : -2;

    await updateDoc(designDoc, { rating: newRating });
    newVotes[id] = vote;
    setUserVotes(newVotes);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, 'designs', id));
  };

  const top3 = [...designs].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-end items-center gap-4 my-4">
        {user ? (
          <div className="flex items-center gap-2">
            <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full" />
            <span className="text-sm text-gray-600">{user.displayName}</span>
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

      {user ? (
        <div className="bg-white p-4 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-2">Yeni Tasarım Ekle</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="border p-2 rounded w-full"
              placeholder="Tasarım Başlığı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="file"
              className="border p-2 rounded w-full"
              onChange={handleFileUpload}
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleAddDesign}
              disabled={isUploading}
            >
              {isUploading ? "Yükleniyor..." : "Yükle"}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 italic mb-8">
          Tasarım yüklemek için giriş yapmalısınız.
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">En İyi 3 Baret Tasarımı</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {top3.map((design) => (
          <div key={design.id} className="border rounded p-2">
            <img src={design.imageUrl} alt={design.title} className="w-full h-40 object-cover rounded" />
            <h3 className="font-semibold mt-2">{design.title}</h3>
            <p className="text-sm text-gray-500">Oy: {design.rating}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Tüm Tasarımlar</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {designs.map((design) => (
          <div key={design.id} className="border rounded p-2 relative">
            {isAdmin && (
              <button
                className="absolute top-1 right-1 text-xs text-red-600"
                onClick={() => handleDelete(design.id)}
              >
                Sil
              </button>
            )}
            <img src={design.imageUrl} alt={design.title} className="w-full h-40 object-cover rounded" />
            <h3 className="font-semibold mt-2">{design.title}</h3>
            <p className="text-sm text-gray-500">Oy: {design.rating}</p>
            {user && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleVote(design.id, 'like')}
                  className={`px-2 py-1 rounded text-sm ${userVotes[design.id] === 'like' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                >
                  👍 Like
                </button>
                <button
                  onClick={() => handleVote(design.id, 'dislike')}
                  className={`px-2 py-1 rounded text-sm ${userVotes[design.id] === 'dislike' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                >
                  👎 Dislike
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}