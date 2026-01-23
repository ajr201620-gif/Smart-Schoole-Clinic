// firebase-init.js (ESM) — GitHub Pages friendly
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/** ✅ ضع إعداداتك هنا */
const firebaseConfig = {
  apiKey: "AIzaSyBHKcmkLwv_In-HaAQV3rPV2k4HJ8k0dWQ",
  authDomain: "studio-3300351439-d6e30.firebaseapp.com",
  projectId: "studio-3300351439-d6e30",
  storageBucket: "studio-3300351439-d6e30.firebasestorage.app",
  messagingSenderId: "76182920806",
  appId: "1:76182920806:web:f81804b26b7dd2a2bc17a7"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Expose helpers globally so your non-module scripts can use them بسهولة
window.__FB = {
  db, auth,
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp
};

async function ensureAnonAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) return resolve(user);
      try {
        const cred = await signInAnonymously(auth);
        resolve(cred.user);
      } catch (e) {
        console.error("Firebase Auth error:", e);
        resolve(null);
      }
    });
  });
}

// Auto-init on every page
(async () => {
  const user = await ensureAnonAuth();
  window.__FB_USER = user;

  // Optional: stamp session
  try {
    const sid = localStorage.getItem("ssc_session_id") || crypto.randomUUID();
    localStorage.setItem("ssc_session_id", sid);

    // lightweight heartbeat (لا تحرق الفاتورة 😅)
    await setDoc(doc(db, "sessions", sid), {
      sid,
      uid: user?.uid || null,
      role: localStorage.getItem("ssc_role") || null,
      page: document.body?.getAttribute("data-page") || location.pathname,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn("Session stamp skipped:", e);
  }
})();
