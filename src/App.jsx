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
  const [activeTab, setActiveTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
      const pinsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPins(pinsData);
    }, (err) => console.log("Firestore error:", err));

    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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
        description: description || '',
        imageUrl: imageUrl,
        userId: user?.uid || 'anon',
        userName: user?.displayName || 'User',
        userPhoto: user?.photoURL || '',
        saves: [],
        likes: [],
        createdAt: serverTimestamp()
      });
      setTitle('');
      setDescription('');
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
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
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
    link.download = `pinterest-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPins = pins.filter(pin => 
    pin.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pin.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-white text-zinc-900 font-sans overflow-hidden">
      
      {/* Yon panel */}
      <aside className="w-16 md:w-20 border-r border-zinc-200 flex flex-col items-center py-5 justify-between flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm cursor-pointer hover:opacity-90">
            P
          </div>
          <button 
            onClick={() => setActiveTab('all')} 
            className={`p-3 rounded-2xl transition ${activeTab === 'all' ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-100 text-zinc-600'}`}
          >
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
            <Message