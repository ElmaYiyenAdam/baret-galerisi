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
const IMGBB_API_KEY = "6fcfb13dfb45994a4cfadbed6e5f7c23"; // 🔄 Buraya kendi imgbb API anahtarını koy

export default function DesignGallery() {
  const { user, login, logout } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});

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
      const votes: Record<string, string> = {};
      Object.values(data || {}).forEach((vote: any) => {
        if (vote.userId === user.uid) {
          votes[vote.designId] = vote.type;
        }
      });
      setUserVotes(votes);
    });
  }, [user]);

  const getVoteType = (designId: string) => {
    return userVotes[designId];
  };

  const handleVote = async (id: string, type: 'like' | 'dislike') => {
    if (!user) return;

    const voteRef = ref(db, `votes/${user.uid}_${id}`);
    const designRef = ref(db, `designs/${id}`);
    const snapshot = await get(designRef);
    const design = snapshot.val();
    if (!design) return;

    const currentVote = getVoteType(id);

    if (currentVote === type) {
      await remove(voteRef);
      await set(designRef, {
        ...design,
        likes: type === 'like' ? (design.likes || 0) - 1 : design.likes || 0,
        dislikes: type === 'dislike' ? (design.dislikes || 0) - 1 : design.dislikes || 0,
      });
      setUserVotes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      return;
    }

    let newLikes = design.likes || 0;
    let newDislikes = design.dislikes || 0;
    if (currentVote === 'like') newLikes--;
    if (currentVote === 'dislike') newDislikes--;
    if (type === 'like') newLikes++;
    if (type === 'dislike') newDislikes++;

    await set(voteRef, {
      userId: user.uid,
      designId: id,
      type,
      votedAt: Date.now(),
    });

    await set(designRef, {
      ...design,
      likes: newLikes,
      dislikes: newDislikes,
    });

    setUserVotes((prev) => ({ ...prev, [id]: type }));
  };

  const handleAddDesign = async () => {
    if (!title || !file || !user) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const imageUrl = data.data.url;

      const newRef = push(ref(db, 'designs'));
      await set(newRef, {
        title,
        imageUrl,
        likes: 0,
        dislikes: 0,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonim',
        ownerAvatar: user.photoURL || null,
        createdAt: Date.now(),
      });

      setTitle('');
      setFile(null);
    } catch (error) {
      console.error("Yükleme hatası:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await remove(ref(db, `designs/${id}`));
  };

  const top3 = [...designs].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3);

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
              accept="image/*"
              className="border p-2 rounded w-full"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleAddDesign}
              disabled={uploading}
            >
              {uploading ? "Yükleniyor..." : "Yükle"}
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-500 italic">
            Tasarım yüklemek için giriş yapmalısınız.
          </div>
        )}
      </div>

      {/* geri kalan tasarım listesi bölümü aynı kalıyor */}
    </div>
  );
}
