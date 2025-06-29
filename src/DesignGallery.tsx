import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import {
  ref,
  set,
  onValue,
  push,
  get,
  remove,
} from 'firebase/database';

const ADMIN_EMAIL = "saygincamsoy2005@hotmail.com";
const IMGBB_API_KEY = "SENIN_IMGBB_API_KEY"; // imgbb API key buraya

export default function DesignGallery() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const designsRef = ref(db, 'designs');
    onValue(designsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries = Object.entries(data).map(([id, value]: any) => ({ id, ...value }));
        setDesigns(entries.sort((a, b) => b.createdAt - a.createdAt));
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const votesRef = ref(db, 'votes');
    onValue(votesRef, (snapshot) => {
      const data = snapshot.val();
      const votedIds = Object.values(data || {}).filter((vote: any) => vote.userId === user.uid).map((v: any) => v.designId);
      setUserVotes(votedIds);
    });
  }, [user]);

  const hasVoted = (designId: string): boolean => {
    return userVotes.includes(designId);
  };

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
    const newRef = push(ref(db, 'designs'));
    await set(newRef, {
      title,
      imageUrl,
      rating: 0,
      ownerId: user.uid,
      ownerName: user.displayName || 'Anonim',
      ownerAvatar: user.photoURL || null,
      createdAt: Date.now(),
    });
    setTitle('');
    setImageUrl('');
  };

  const handleVote = async (id: string) => {
    if (!user || hasVoted(id)) return;

    await set(ref(db, `votes/${user.uid}_${id}`), {
      userId: user.uid,
      designId: id,
      votedAt: Date.now(),
    });

    const designRef = ref(db, `designs/${id}`);
    const snapshot = await get(designRef);
    const current = snapshot.val();
    const currentRating = current?.rating || 0;

    await set(designRef, {
      ...current,
      rating: currentRating + 1,
    });

    setUserVotes((prev) => [...prev, id]);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await remove(ref(db, `designs/${id}`));
  };

  const top3 = [...designs].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white p-4 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">Yeni Tasarım Ekle</h2>
        {user ? (
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
        ) : (
          <div className="text-center text-gray-500 italic">
            Tasarım yüklemek için giriş yapmalısınız.
          </div>
        )}
      </div>

      {top3.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3">🏆 En İyi 3 Tasarım</h2>
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
        <h2 className="text-xl font-bold mb-3">🖼️ Tüm Tasarımlar</h2>
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
