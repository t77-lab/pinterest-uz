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
  Camera, Mic, LogIn, LogOut, X, Bookmark
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  const handleCreatePin = async (e) => {
    e.preventDefault();
    if (!imageUrl) return alert("Rasm tanlang yoki ssilkasini kiriting!");

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
    } catch (err) {
      alert("Xatolik: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result);
      reader.readAsDataURL(file);
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
    link.download = `pin-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPins = pins.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-white text-zinc-900 font-sans overflow-hidden">
      
      {/* Chap Sidebar */}
      <aside className="w-16 md:w-20 border-r border-zinc-200 flex flex-col items-center py-5 justify-between flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer">
            P
          </div>
          <button className="p-3 rounded-2xl bg-zinc-950 text-white">
            <Bookmark className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 rounded-2xl hover:bg-zinc-100 text-zinc-600 transition"
            title="Rasm yuklash"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <button className="p-3 rounded-2xl hover:bg-zinc-100 text-zinc-600 relative transition">
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-red-600 absolute top-2 right-2"></span>
          </button>
          <button className="p-3 rounded-2xl hover:bg-zinc-100 text-zinc-600 transition">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        <div>
          {user && !user.isAnonymous ? (
            <button onClick={handleLogout} title="Chiqish" className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden border">
              {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <span className="font-bold text-zinc-700">{user.displayName?.[0] || 'U'}</span>}
            </button>
          ) : (
            <button onClick={handleGoogleLogin} title="Kirish" className="p-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition">
              <LogIn className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Asosiy qism */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-20 px-6 flex items-center gap-4 flex-shrink-0">
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

        {/* Lenta */}
        <main className="flex-1 overflow-y-auto px-6 pb-12">
          {filteredPins.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-400">
              <p className="text-lg">Hozircha rasmlar yo'q</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition"
              >
                Birinchi rasmni yuklang
              </button>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
              {filteredPins.map((pin) => {
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
        </main>
      </div>

      {/* Rasm yuklash modali */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-100 text-zinc-500"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Yangi Pin yaratish</h2>
            
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

              <div className="text-center text-xs text-zinc-400 font-bold">YOKI RASM SSILKASI</div>

              <div>
                <input 
                  type="url"
                  placeholder="https://..."
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
                  placeholder="Sarlavha qo'shing"
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