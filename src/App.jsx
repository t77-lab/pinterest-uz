import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  Search, Bell, MessageSquare, Plus, Download, 
  Camera, Mic, LogIn, LogOut, X, Bookmark, Home, Send, MessageCircle, User, Trash2, Eye, EyeOff
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBo28UW3zSeYK03GAMZy2Yu17ofWcIZ_Bo",
  authDomain: "pinterest-uz.firebaseapp.com",
  projectId: "pinterest-uz",
  storageBucket: "pinterest-uz.firebasestorage.app",
  messagingSenderId: "359477093544",
  appId: "1:359477093544:web:1023cd63294f89fe0bce9d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [pins, setPins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'saved' | 'my-pins' | 'notifications' | 'messages'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAnonymousPost, setIsAnonymousPost] = useState(false); // Anonim yoki ochiq tanlovi
  const [isUploading, setIsUploading] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Pinterest Bot', text: 'Pinterest Uz platformasiga xush kelibsiz!', time: '14:20' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'pins'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const pinsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPins(pinsData);
      
      setSelectedPin(prev => {
        if (!prev) return null;
        return pinsData.find(p => p.id === prev.id) || prev;
      });
    }, (err) => console.log("Firestore xatosi:", err));

    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      alert("Login xatosi: " + e.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    signInAnonymously(auth);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (img.width > MAX_WIDTH) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePin = async (e) => {
    e.preventDefault();
    if (!imageUrl) return alert("Rasm tanlang!");

    setIsUploading(true);

    // Foydalanuvchi tanloviga qarab ism va suratni belgilash
    const authorName = isAnonymousPost 
      ? 'Anonim' 
      : (user?.displayName || (user?.isAnonymous ? 'Mehmon' : 'Foydalanuvchi'));
      
    const authorPhoto = isAnonymousPost ? '' : (user?.photoURL || '');

    try {
      await addDoc(collection(db, 'pins'), {
        title: title || 'Nomsiz rasm',
        description: description || '',
        imageUrl: imageUrl,
        userId: user?.uid || 'anon',
        userName: authorName,
        userPhoto: authorPhoto,
        isAnonymous: isAnonymousPost,
        saves: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      setTitle('');
      setDescription('');
      setImageUrl('');
      setIsAnonymousPost(false);
      setIsAddModalOpen(false);
      setActiveTab('my-pins');
    } catch (err) {
      alert("Yuklashda xatolik: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePin = async (pinId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Rostdan ham bu rasmni o'chirmoqchimisiz?")) return;

    try {
      await deleteDoc(doc(db, 'pins', pinId));
      if (selectedPin?.id === pinId) {
        setSelectedPin(null);
      }
    } catch (err) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  const handleToggleSave = async (pin, e) => {
    e?.stopPropagation();
    if (!user) return;
    const pinRef = doc(db, 'pins', pin.id);
    const isSaved = pin.saves?.includes(user.uid);
    try {
      await updateDoc(pinRef, {
        saves: isSaved ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = (imgUrl, e) => {
    e?.stopPropagation();
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `pinterest-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPin) return;

    const newComment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      userName: user?.displayName || (user?.isAnonymous ? 'Mehmon' : 'Foydalanuvchi'),
      userPhoto: user?.photoURL || '',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const pinRef = doc(db, 'pins', selectedPin.id);
      await updateDoc(pinRef, {
        comments: arrayUnion(newComment)
      });
      setCommentText('');
    } catch (err) {
      alert("Izoh qoldirishda xatolik: " + err.message);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: user?.displayName || 'Siz',
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setNewMessage('');
  };

  const displayedPins = pins.filter(pin => {
    const matchesSearch = pin.title?.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'saved') {
      return matchesSearch && pin.saves?.includes(user?.uid);
    }
    if (activeTab === 'my-pins') {
      return matchesSearch && pin.userId === user?.uid;
    }
    return matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen bg-white text-zinc-900 font-sans overflow-hidden">
      
      {/* Chap Yon Panel */}
      <aside className="w-16 md:w-20 border-r border-zinc-200 flex flex-col items-center py-5 justify-between flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-5 w-full">
          <div 
            onClick={() => setActiveTab('feed')}
            className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer hover:scale-105 transition"
            title="Bosh sahifa"
          >
            P
          </div>

          <button 
            onClick={() => setActiveTab('feed')} 
            className={`p-3 rounded-2xl transition ${activeTab === 'feed' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Lenta"
          >
            <Home className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveTab('saved')} 
            className={`p-3 rounded-2xl transition ${activeTab === 'saved' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Saqlanganlar"
          >
            <Bookmark className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setActiveTab('my-pins')} 
            className={`p-3 rounded-2xl transition ${activeTab === 'my-pins' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Men yuklagan rasmlar"
          >
            <User className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 rounded-2xl hover:bg-zinc-100 text-zinc-600 transition"
            title="Yangi rasm qo'shish"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button 
            onClick={() => setActiveTab('notifications')}
            className={`p-3 rounded-2xl relative transition ${activeTab === 'notifications' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Bildirishnomalar"
          >
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-2"></span>
          </button>

          <button 
            onClick={() => setActiveTab('messages')}
            className={`p-3 rounded-2xl transition ${activeTab === 'messages' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Xabarlar"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        <div>
          {user && !user.isAnonymous ? (
            <button 
              onClick={handleLogout} 
              title="Chiqish" 
              className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden border hover:ring-2 hover:ring-red-500 transition"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-zinc-700">{user.displayName?.[0] || 'U'}</span>
              )}
            </button>
          ) : (
            <button 
              onClick={handleGoogleLogin} 
              title="Kirish" 
              className="p-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition"
            >
              <LogIn className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Asosiy Ish Maydoni */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-20 px-6 flex items-center gap-4 flex-shrink-0 border-b border-zinc-100">
          <div className="flex-1 relative flex items-center">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 pointer-events-none" />
            <input 
              type="text"
              placeholder="Qidiruv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f1f1f1] hover:bg-[#e9e9e9] focus:bg-white text-zinc-900 rounded-full py-3.5 pl-12 pr-24 outline-none border border-transparent focus:border-red-500 transition text-sm font-medium"
            />
            <div className="absolute right-4 flex items-center gap-2 text-zinc-500">
              <Camera className="w-5 h-5 cursor-pointer" />
              <Mic className="w-5 h-5 cursor-pointer" />
            </div>
          </div>

          <div 
            onClick={user?.isAnonymous ? handleGoogleLogin : undefined}
            className="w-10 h-10 rounded-full bg-red-600 text-white font-bold flex items-center justify-center cursor-pointer shadow-sm flex-shrink-0"
          >
            {user?.displayName ? user.displayName[0].toUpperCase() : 'P'}
          </div>
        </header>

        {/* Asosiy Kontent */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          
          {(activeTab === 'feed' || activeTab === 'saved' || activeTab === 'my-pins') && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {activeTab === 'feed' && 'Barcha Rasmlar'}
                    {activeTab === 'saved' && 'Saqlangan Pinlar'}
                    {activeTab === 'my-pins' && 'Men yuklagan rasmlar'}
                  </h1>
                  {activeTab === 'my-pins' && (
                    <p className="text-xs text-zinc-500 mt-1">Siz tomoningizdan joylangan rasmlar (anonim yoki ochiq)</p>
                  )}
                </div>
                <span className="text-sm text-zinc-500 font-medium">{displayedPins.length} ta pin</span>
              </div>

              {displayedPins.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400">
                  <p className="text-lg">
                    {activeTab === 'saved' && "Siz hali hech qanday rasm saqlamadingiz"}
                    {activeTab === 'my-pins' && "Siz hali rasm yuklamadingiz"}
                    {activeTab === 'feed' && "Hozircha rasmlar yo'q"}
                  </p>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition"
                  >
                    Rasm yuklash
                  </button>
                </div>
              ) : (
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                  {displayedPins.map((pin) => {
                    const isSaved = pin.saves?.includes(user?.uid);
                    const isOwner = pin.userId === user?.uid;

                    return (
                      <div 
                        key={pin.id}
                        onClick={() => setSelectedPin(pin)}
                        className="relative group rounded-2xl overflow-hidden cursor-zoom-in bg-zinc-100 break-inside-avoid shadow-sm hover:shadow-md transition flex flex-col"
                      >
                        <div className="relative">
                          <img 
                            src={pin.imageUrl} 
                            alt={pin.title} 
                            className="w-full object-cover rounded-2xl group-hover:brightness-95 transition"
                          />

                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between pointer-events-none rounded-2xl">
                            <div className="flex justify-between items-center pointer-events-auto">
                              {isOwner ? (
                                <button 
                                  onClick={(e) => handleDeletePin(pin.id, e)}
                                  className="p-2 rounded-full bg-white/90 hover:bg-red-600 hover:text-white text-zinc-700 shadow transition"
                                  title="O'chirish"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : <span />}

                              <button 
                                onClick={(e) => handleToggleSave(pin, e)}
                                className={`px-4 py-2 rounded-full font-bold text-xs shadow transition ${
                                  isSaved ? 'bg-zinc-950 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                              >
                                {isSaved ? 'Saqlandi' : 'Saqlash'}
                              </button>
                            </div>

                            <div className="flex justify-between items-center pointer-events-auto">
                              <span className="text-white text-xs font-semibold drop-shadow truncate max-w-[120px]">
                                {pin.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {pin.comments?.length > 0 && (
                                  <span className="px-2 py-1 rounded-full bg-white/90 text-zinc-800 text-[11px] font-bold flex items-center gap-1 shadow">
                                    <MessageCircle className="w-3 h-3" />
                                    {pin.comments.length}
                                  </span>
                                )}
                                <button 
                                  onClick={(e) => handleDownload(pin.imageUrl, e)}
                                  className="p-2 rounded-full bg-white/90 hover:bg-white text-zinc-800 shadow"
                                  title="Yuklab olish"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Kim yuklagani haqida */}
                        <div className="p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pin.isAnonymous ? (
                              <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center">
                                <EyeOff className="w-3 h-3" />
                              </div>
                            ) : pin.userPhoto ? (
                              <img src={pin.userPhoto} alt={pin.userName} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 font-bold text-xs flex items-center justify-center">
                                {pin.userName?.[0] || 'U'}
                              </div>
                            )}
                            <span className="text-xs font-medium text-zinc-700 truncate max-w-[100px]">
                              {pin.userName}
                            </span>
                          </div>
                          {isOwner && (
                            <span className="text-[10px] bg-zinc-100 text-zinc-500 font-bold px-1.5 py-0.5 rounded">Siz</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bildirishnomalar */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto py-4">
              <h1 className="text-2xl font-bold mb-6">Bildirishnomalar</h1>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                    P
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Tizim yangilandi</p>
                    <p className="text-xs text-zinc-500">Anonim yuklash funksiyasi qo'shildi!</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-400">Hozirgina</span>
              </div>
            </div>
          )}

          {/* Xabarlar */}
          {activeTab === 'messages' && (
            <div className="max-w-2xl mx-auto h-[75vh] flex flex-col bg-zinc-50 border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 bg-white border-b border-zinc-200 font-bold">
                Muloqotlar
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === (user?.displayName || 'Siz') ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                      msg.sender === (user?.displayName || 'Siz') 
                        ? 'bg-zinc-950 text-white rounded-br-none' 
                        : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none'
                    }`}>
                      <p className="text-xs font-semibold opacity-70 mb-1">{msg.sender}</p>
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-zinc-200 flex gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Xabar yozing..." 
                  className="flex-1 px-4 py-2 bg-zinc-100 rounded-full outline-none text-sm focus:bg-white focus:border focus:border-red-500"
                />
                <button type="submit" className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* Rasm qo'shish oynasi (SHAXSINI OCHIQ QILISH YOKI ANONIM TANLOVI BILAN) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-100 text-zinc-500"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Yangi Pin qo'shish</h2>
            
            <form onSubmit={handleCreatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Kompyuterdan rasm tanlang
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                />
              </div>

              <div className="text-center text-xs text-zinc-400 font-bold">YOKI RASM HAVOLASI</div>

              <div>
                <input 
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-red-500 outline-none text-sm"
                />
              </div>

              {imageUrl && (
                <div className="h-40 w-full rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-contain" />
                </div>
              )}

              <div>
                <input 
                  type="text"
                  placeholder="Sarlavha kiriting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-red-500 outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <textarea 
                  placeholder="Tavsif (ixtiyoriy)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-red-500 outline-none text-sm"
                />
              </div>

              {/* Shaxsni ko'rsatish yoki anonim qilish tanlovi */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                <span className="block text-xs font-bold text-zinc-700 mb-2">
                  Shaxsingiz qanday ko'rinsin?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnonymousPost(false)}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                      !isAnonymousPost 
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    Ochiq profil
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAnonymousPost(true)}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition ${
                      isAnonymousPost 
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" />
                    Anonim (Maxfiy)
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2 text-center">
                  {isAnonymousPost 
                    ? "Ismingiz va profilingiz yashiriladi, 'Anonim' deb chiqadi." 
                    : `Profilingiz (${user?.displayName || 'Ismingiz'}) ochiq ko'rsatiladi.`}
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isUploading || !imageUrl}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-full font-bold shadow transition"
              >
                {isUploading ? 'Yuklanmoqda...' : 'Joylash'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rasm ko'rish va Muhokama Modali */}
      {selectedPin && (
        <div 
          onClick={() => setSelectedPin(null)} 
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl"
          >
            <div className="md:w-3/5 bg-zinc-950 flex items-center justify-center p-2">
              <img src={selectedPin.imageUrl} alt={selectedPin.title} className="max-h-[82vh] w-full object-contain rounded-xl" />
            </div>

            <div className="md:w-2/5 p-6 flex flex-col justify-between h-[82vh] bg-white">
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDownload(selectedPin.imageUrl, e)}
                      className="p-2.5 rounded-full hover:bg-zinc-100 text-zinc-700 border border-zinc-200"
                      title="Yuklab olish"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    {selectedPin.userId === user?.uid && (
                      <button 
                        onClick={(e) => handleDeletePin(selectedPin.id, e)}
                        className="p-2.5 rounded-full hover:bg-red-50 text-red-600 border border-red-200"
                        title="O'chirish"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleToggleSave(selectedPin, e)}
                      className={`px-5 py-2.5 rounded-full font-bold text-sm shadow transition ${
                        selectedPin.saves?.includes(user?.uid) 
                          ? 'bg-zinc-950 text-white' 
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {selectedPin.saves?.includes(user?.uid) ? 'Saqlandi' : 'Saqlash'}
                    </button>
                    <button 
                      onClick={() => setSelectedPin(null)}
                      className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <h1 className="text-xl font-bold mb-1">{selectedPin.title}</h1>
                {selectedPin.description && (
                  <p className="text-zinc-600 text-xs mb-3">{selectedPin.description}</p>
                )}

                <div className="flex items-center gap-3 py-3 border-y border-zinc-100 my-2">
                  {selectedPin.isAnonymous ? (
                    <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                      <EyeOff className="w-4 h-4" />
                    </div>
                  ) : selectedPin.userPhoto ? (
                    <img src={selectedPin.userPhoto} alt={selectedPin.userName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center">
                      {selectedPin.userName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{selectedPin.userName}</p>
                    <p className="text-[11px] text-zinc-400">
                      {selectedPin.isAnonymous ? "Maxfiy yuklangan" : "Muallif"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 mt-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Muhokama ({selectedPin.comments?.length || 0})
                  </h3>
                  
                  {(!selectedPin.comments || selectedPin.comments.length === 0) ? (
                    <p className="text-xs text-zinc-400 py-4 text-center">Fikr bildirilmagan. Birinchi bo'lib yozing!</p>
                  ) : (
                    selectedPin.comments.map(c => (
                      <div key={c.id} className="flex items-start gap-2 text-xs">
                        {c.userPhoto ? (
                          <img src={c.userPhoto} alt={c.userName} className="w-6 h-6 rounded-full object-cover mt-0.5" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 font-bold text-[10px] flex items-center justify-center mt-0.5">
                            {c.userName?.[0] || 'U'}
                          </div>
                        )}
                        <div className="flex-1 bg-zinc-50 border border-zinc-100 p-2.5 rounded-2xl">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-zinc-800">{c.userName}</span>
                            <span className="text-[9px] text-zinc-400">{c.createdAt}</span>
                          </div>
                          <p className="text-zinc-600">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={handleAddComment} className="pt-3 border-t border-zinc-100 flex items-center gap-2 mt-2">
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Fikr bildiring..." 
                  className="flex-1 px-4 py-2.5 bg-zinc-100 rounded-full text-xs outline-none focus:bg-white focus:border focus:border-red-500 transition"
                />
                <button 
                  type="submit" 
                  disabled={!commentText.trim()}
                  className="p-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-full transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}