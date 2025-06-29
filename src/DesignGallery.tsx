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
  child,
} from 'firebase/database';

const ADMIN_EMAIL = "saygincamsoy2005@hotmail.com";

export default function DesignGallery() {
  const { user, login, logout } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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

    // Oy aynıysa: kaldır
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

    // Oy değiştiriliyorsa
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
    if (!title || !imageUrl || !user) return;
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
    setImageUrl('');
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
              className="border p-2 rounded w-full"
              placeholder="Görsel URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleAddDesign}
            >
              Yükle
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
                <div className="text-sm">👍 {design.likes || 0} | 👎 {design.dislikes || 0}</div>
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
                <div className="text-sm">👍 {design.likes || 0} | 👎 {design.dislikes || 0}</div>
                {user ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVote(design.id, 'like')}
                      className={`text-sm ${getVoteType(design.id) === 'like' ? 'text-green-600' : 'text-gray-500'} hover:underline`}
                    >
                      Beğen
                    </button>
                    <button
                      onClick={() => handleVote(design.id, 'dislike')}
                      className={`text-sm ${getVoteType(design.id) === 'dislike' ? 'text-red-600' : 'text-gray-500'} hover:underline`}
                    >
                      Beğenme
                    </button>
                  </div>
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
