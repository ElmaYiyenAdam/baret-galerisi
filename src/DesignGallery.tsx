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
  update,
} from 'firebase/database';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase());

export default function DesignGallery() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [trash, setTrash] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [likedDesigns, setLikedDesigns] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '');

  useEffect(() => {
    const designsRef = ref(db, 'designs');
    onValue(designsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries = Object.entries(data).map(([id, value]: any) => ({ id, ...value }));
        setDesigns(
          entries.sort((a, b) => {
            return isAdmin
              ? (b.likes || 0) - (a.likes || 0)
              : b.createdAt - a.createdAt;
          })
        );
      } else {
        setDesigns([]);
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    const likesRef = ref(db, 'likes');
    onValue(likesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const liked = new Set<string>();
      Object.values<any>(data).forEach((like: any) => {
        if (like.userId === user.uid) {
          liked.add(like.designId);
        }
      });
      setLikedDesigns(liked);
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const trashRef = ref(db, 'trash');
    onValue(trashRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries = Object.entries(data).map(([id, value]: any) => ({ id, ...value }));
        setTrash(entries);
      } else {
        setTrash([]);
      }
    });
  }, [isAdmin]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Lütfen sadece fotoğraf dosyası yükleyin.');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
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
      likes: 0,
      ownerId: user.uid,
      ownerName: user.displayName || 'Anonim',
      ownerAvatar: user.photoURL || null,
      ownerEmail: user.email || '',
      createdAt: Date.now(),
    });
    setTitle('');
    setImageUrl('');
  };

  const toggleLike = async (id: string) => {
    if (!user) return;
    const likeKey = `${user.uid}_${id}`;
    const designRef = ref(db, `designs/${id}`);
    const snapshot = await get(designRef);
    const current = snapshot.val();
    if (!current) return;

    const isLiked = likedDesigns.has(id);
    const newLikes = (current.likes || 0) + (isLiked ? -1 : 1);

    await update(designRef, { likes: newLikes });

    if (isLiked) {
      await remove(ref(db, `likes/${likeKey}`));
    } else {
      await set(ref(db, `likes/${likeKey}`), {
        userId: user.uid,
        designId: id,
        likedAt: Date.now(),
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const confirmDelete = window.confirm("Bu tasarımı silmek istediğinizden emin misiniz?");
    if (!confirmDelete) return;

    const designRef = ref(db, `designs/${id}`);
    const snapshot = await get(designRef);
    const designData = snapshot.val();
    if (!designData) return;

    await set(ref(db, `trash/${id}`), designData);
    await remove(designRef);
  };

  const handleRestore = async (id: string) => {
    const trashRef = ref(db, `trash/${id}`);
    const snapshot = await get(trashRef);
    const trashData = snapshot.val();
    if (!trashData) return;

    await set(ref(db, `designs/${id}`), trashData);
    await remove(trashRef);
  };

  const handlePermanentDelete = async (id: string) => {
    const confirm = window.confirm("Bu tasarımı kalıcı olarak silmek istediğinize emin misiniz?");
    if (!confirm) return;
    await remove(ref(db, `trash/${id}`));
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

      <div>
        <h2 className="text-xl font-bold mb-3">🖼️ Tüm Tasarımlar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {designs.map((design) => (
            <div key={design.id} className="bg-white rounded shadow p-2 relative">
              <img
                src={design.imageUrl}
                alt={design.title}
                className="rounded mb-2 h-40 w-full object-cover cursor-pointer"
                onClick={() => setPreviewUrl(design.imageUrl)}
              />
              <div className="font-semibold">{design.title}</div>
              <div className="flex justify-between items-center mt-2">
                {user ? (
                  <button
                    className={`text-sm px-2 py-1 rounded ${likedDesigns.has(design.id) ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => toggleLike(design.id)}
                  >
                    ❤ {isAdmin ? design.likes || 0 : ''}
                  </button>
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
              {isAdmin && design.ownerEmail && (
                <div className="text-xs text-gray-400 mt-1 italic">{design.ownerEmail}</div>
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

      {isAdmin && trash.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">🗑️ Çöp Kutusu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {trash.map((item) => (
              <div key={item.id} className="bg-gray-100 rounded shadow p-2 relative">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="rounded mb-2 h-40 w-full object-cover"
                />
                <div className="font-semibold">{item.title}</div>
                <div className="text-xs text-gray-500 italic mb-2">{item.ownerEmail}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(item.id)}
                    className="text-sm bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Geri Yükle
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item.id)}
                    className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Kalıcı Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Önizleme"
            className="max-w-full max-h-full rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
