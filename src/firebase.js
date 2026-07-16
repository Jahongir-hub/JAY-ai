// Firebase sozlamalari
// 1. https://console.firebase.google.com da yangi loyiha oching
// 2. Authentication -> Sign-in method -> Google'ni yoqing
// 3. Firestore Database -> Create database (production mode) qiling
// 4. Project Settings -> "Your apps" -> Web app qo'shing
// 5. U yerdagi firebaseConfig qiymatlarini pastga ko'chiring:

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "SIZNING_QIYMATINGIZ",
  authDomain: "SIZNING_QIYMATINGIZ.firebaseapp.com",
  projectId: "SIZNING_QIYMATINGIZ",
  storageBucket: "SIZNING_QIYMATINGIZ.appspot.com",
  messagingSenderId: "SIZNING_QIYMATINGIZ",
  appId: "SIZNING_QIYMATINGIZ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export const loginGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);
export const watchUser = (cb) => onAuthStateChanged(auth, cb);

// Chatlarni bulutga saqlash / olish
export async function saveCloud(uid, data, meta = {}) {
  try {
    await setDoc(doc(db, "users", uid), {
      data: JSON.stringify(data),
      name: meta.name || "",
      email: meta.email || "",
      chats: (data.list || []).length,
      msgs: (data.list || []).reduce((n, c) => n + (c.msgs?.length || 0), 0),
      updated: Date.now(),
    });
  } catch (e) {}
}

// Admin: barcha foydalanuvchilar ro'yxati
export async function listUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => {
      const v = d.data();
      return { uid: d.id, name: v.name, email: v.email, chats: v.chats || 0, msgs: v.msgs || 0, updated: v.updated || 0 };
    });
  } catch (e) { return []; }
}
export async function loadCloud(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? JSON.parse(snap.data().data) : null;
  } catch (e) { return null; }
}
