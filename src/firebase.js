// Firebase sozlamalari
// 1. https://console.firebase.google.com da yangi loyiha oching
// 2. Authentication -> Sign-in method -> Google'ni yoqing
// 3. Firestore Database -> Create database (production mode) qiling
// 4. Project Settings -> "Your apps" -> Web app qo'shing
// 5. U yerdagi firebaseConfig qiymatlarini pastga ko'chiring:

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDw3sWpE0sLd_fv-Fu2d3rwsd1oQWOAD00",
  authDomain: "jay---ai.firebaseapp.com",
  projectId: "jay---ai",
  storageBucket: "jay---ai.firebasestorage.app",
  messagingSenderId: "433511295465",
  appId: "1:433511295465:web:f9fe2e8858a1ec87348378",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export const loginGoogle = async () => {
  try {
    // Avval oddiy oyna (popup) bilan urinamiz
    return await signInWithPopup(auth, provider);
  } catch (e) {
    // Popup bloklansa yoki yopilsa — sahifa orqali kiramiz
    return signInWithRedirect(auth, provider);
  }
};
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
    }, { merge: true });
  } catch (e) {}
}

// Foydalanuvchi hujjatini to'liq olish (data + blocked)
export async function getUserDoc(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return null; }
}

// Admin: bloklash / blokdan chiqarish
export async function setBlocked(uid, blocked) {
  try { await setDoc(doc(db, "users", uid), { blocked }, { merge: true }); } catch (e) {}
}

// Istalgan maydonlarni yangilash (premium, limit, dayCount...)
export async function setUserField(uid, fields) {
  try { await setDoc(doc(db, "users", uid), fields, { merge: true }); } catch (e) {}
}

// Admin: foydalanuvchini butunlay o'chirish
export async function deleteUser(uid) {
  try { await deleteDoc(doc(db, "users", uid)); } catch (e) {}
}

// E'lon (barcha foydalanuvchilarga banner)
export async function getAnnouncement() {
  try {
    const snap = await getDoc(doc(db, "meta", "announcement"));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return null; }
}
export async function setAnnouncement(text) {
  try { await setDoc(doc(db, "meta", "announcement"), { text, ts: Date.now() }); } catch (e) {}
}

// Admin: barcha foydalanuvchilar ro'yxati
export async function listUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => {
      const v = d.data();
      return { uid: d.id, name: v.name, email: v.email, chats: v.chats || 0, msgs: v.msgs || 0, updated: v.updated || 0, created: v.created || 0, blocked: !!v.blocked, premium: !!v.premium, adminLimit: v.adminLimit || 0, data: v.data || "" };
    });
  } catch (e) { return []; }
}
export async function loadCloud(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? JSON.parse(snap.data().data) : null;
  } catch (e) { return null; }
}
