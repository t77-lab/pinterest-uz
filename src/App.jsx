import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  Search, Bell, MessageSquare, Plus, Download, 
  Camera, Mic, LogIn, LogOut, X, Bookmark, Home, Send
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
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'saved' | 'notifications' | 'messages'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Namuna xabarlar holati
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
      setPins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
    try {
      await addDoc(collection(db, 'pins'), {
        title: title || 'Nomsiz rasm',
        imageUrl: imageUrl,
        userId: user?.uid || 'anon',
        userName: user?.displayName || 'Foydalanuvchi',
        saves: [],
        createdAt: serverTimestamp()
      });
      setTitle('');
      setImageUrl('');
      setIsAddModalOpen(false);
      setActiveTab('feed');
    } catch (err) {
      alert("Yuklashda xatolik: " + err.message);
    } finally {
      setIsUploading(false);
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
    return matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen bg-white text-zinc-900 font-sans overflow-hidden">
      
      {/* Chap Yon Panel */}
      <aside className="w-16 md:w-20 border-r border-zinc-200 flex flex-col items-center py-5 justify-between flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-5 w-full">
          {/* Logo - Bosh sahifaga qaytaradi */}
          <div 
            onClick={() => setActiveTab('feed')}
            className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer hover:scale-105 transition"
            title="Bosh sahifa"
          >
            P
          </div>

          {/* Bosh sahifa tugmasi */}
          <button 
            onClick={() => setActiveTab('feed')} 
            className={`p-3 rounded-2xl transition ${activeTab === 'feed' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Lenta"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Saqlangan rasmlar */}
          <button 
            onClick={() => setActiveTab('saved')} 
            className={`p-3 rounded-2xl transition ${activeTab === 'saved' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Saqlanganlar"
          >
            <Bookmark className="w-5 h-5" />
          </button>

          {/* Rasm yuklash oynasi */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 rounded-2xl hover:bg-zinc-100 text-zinc-600 transition"
            title="Yangi rasm qo'shish"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Bildirishnomalar */}
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`p-3 rounded-2xl relative transition ${activeTab === 'notifications' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Bildirishnomalar"
          >
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-2"></span>
          </button>

          {/* Xabarlar */}
          <button 
            onClick={() => setActiveTab('messages')}
            className={`p-3 rounded-2xl transition ${activeTab === 'messages' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title="Xabarlar"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        {/* Profil / Kirish */}
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

        {/* Kontent qismi */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          
          {/* 1. Lenta yoki Saqlanganlar sahifasi */}
          {(activeTab === 'feed' || activeTab === 'saved') && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                  {activeTab === 'feed' ? 'Barcha Rasmlar' : 'Saqlangan Pinlar'}
                </h1>
                {activeTab === 'saved' && (
                  <span className="text-sm text-zinc-500 font-medium">{displayedPins.length} ta saqlangan</span>
                )}
              </div>

              {displayedPins.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400">
                  <p className="text-lg">
                    {activeTab === 'saved' ? "Siz hali hech qanday rasm saqlamadingiz" : "Hozircha rasmlar yo'q"}
                  </p>
                  {activeTab === 'feed' && (
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-3 px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition"
                    >
                      Birinchi rasmni yuklang
                    </button>
                  )}
                </div>
              ) : (
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                  {displayedPins.map((pin) => {
                    const isSaved = pin.saves?.includes(user?.uid);
                    return (
                      <div 
                        key={pin.id}
                        onClick={() => setSelectedPin(pin)}
                        className="relative group rounded-2xl overflow-hidden cursor-zoom-in bg-zinc-100 break-inside-avoid shadow-sm hover:shadow-md transition"
                      >
                        <img 
                          src={pin.imageUrl} 
                          alt={pin.title} 
                          className="w-full object-cover rounded-2xl group-hover:brightness-90 transition"
                        />

                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between pointer-events-none">
                          <div className="flex justify-end pointer-events-auto">
                            <button 
                              onClick={(e) => handleToggleSave(pin, e)}
                              className={`px-4 py-2 rounded-full font-bold text-sm shadow transition ${
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
                            <button 
                              onClick={(e) => handleDownload(pin.imageUrl, e)}
                              className="p-2 rounded-full bg-white/90 hover:bg-white text-zinc-800 shadow"
                              title="Yuklab olish"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Bildirishnomalar sahifasi */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto py-4">
              <h1 className="text-2xl font-bold mb-6">Bildirishnomalar</h1>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      P
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Tizim yangilandi</p>
                      <p className="text-xs text-zinc-500">Pinterest Uz loyihangiz muvaffaqiyatli ishga tushdi!</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">Hozirgina</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Xabarlar sahifasi */}
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

      {/* Rasm qo'shish oynasi */}
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
                <div className="h-44 w-full rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center">
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

      {/* Rasm ko'rish modali */}
      {selectedPin && (
        <div 
          onClick={() => setSelectedPin(null)} 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl"
          >
            <div className="md:w-3/5 bg-black flex items-center justify-center">
              <img src={selectedPin.imageUrl} alt={selectedPin.title} className="max-h-[85vh] w-full object-contain" />
            </div>
            <div className="md:w-2/5 p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <button 
                    onClick={(e) => handleDownload(selectedPin.imageUrl, e)}
                    className="p-2.5 rounded-full hover:bg-zinc-100 text-zinc-700"
                    title="Yuklab olish"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => handleToggleSave(selectedPin, e)}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-sm"
                  >
                    {selectedPin.saves?.includes(user?.uid) ? 'Saqlandi' : 'Saqlash'}
                  </button>
                </div>
                <h1 className="text-2xl font-bold mb-2">{selectedPin.title}</h1>
                <div className="text-xs text-zinc-400">
                  Yuklovchi: <span className="font-semibold text-zinc-700">{selectedPin.userName}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPin(null)} 
                className="w-full mt-6 py-2.5 border border-zinc-200 rounded-full font-bold text-sm hover:bg-zinc-50"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}