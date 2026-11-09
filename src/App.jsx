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
  Search, Bell, MessageSquare, Plus, Download, Heart, 
  Share2, Camera, Mic, LogIn, LogOut, Check, X, Bookmark
} from 'lucide-react';

// O'zingizning Firebase kalitlaringizni shu yerga qo'ying:
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
    }, (err) => console.log("Firebase xatosi:", err));

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
        userName: user?.displayName || 'Foy