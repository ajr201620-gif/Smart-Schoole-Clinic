/* ===========================================================
   firebase-init.js  (ESM Module for GitHub Pages)
   - Firebase App + Auth + Firestore + Storage
   - Exposes: window.FB (app/auth/db/storage + helpers)
   =========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  getFirestore,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

/** 🔧 Firebase Config (Public web config — safe to be public) */
const firebaseConfig = {
  apiKey: "AIzaSyBHKcmkLwv_In-HaAQV3rPV2k4HJ8k0dWQ",
  authDomain: "studio-3300351439-d6e30.firebaseapp.com",
  projectId: "studio-3300351439-d6e30",
  storageBucket: "studio-3300351439-d6e30.firebasestorage.app",
  messagingSenderId: "76182920806",
  appId: "1:76182920806:web:f81804b26b7dd2a2bc17a7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/** Small helpers */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

/** Ensure auth session persists (for GitHub Pages) */
async function ensureAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    // ignore (some browsers/iframes)
  }

  // If already signed in, ok.
  if (auth.currentUser) return auth.currentUser;

  // Otherwise sign in anonymously (fast + works for demo)
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.error("Firebase auth error:", e);
    throw e;
  }
}

/** Wait until auth ready */
async function waitForUser({ timeoutMs = 6000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (auth.currentUser) return auth.currentUser;
    await sleep(80);
  }
  return auth.currentUser || null;
}

/** Write a session log (page/role) */
async function logSession({ page = "unknown", role = null, extra = {} } = {}) {
  const user = (auth.currentUser || (await ensureAuth()));
  const sid = (localStorage.getItem("SID") || uid());
  localStorage.setItem("SID", sid);

  const payload = {
    sid,
    uid: user?.uid || null,
    role: role || localStorage.getItem("ROLE") || null,
    page,
    ua: navigator.userAgent,
    ts: serverTimestamp(),
    ...extra,
  };

  // sessions/{sid} (upsert)
  try {
    await setDoc(doc(db, "sessions", sid), payload, { merge: true });
  } catch (e) {
    console.warn("logSession failed:", e);
  }

  return { sid, payload };
}

/** Expose one global namespace */
window.FB = {
  app,
  auth,
  db,
  storage,

  // firestore helpers
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  onSnapshot,

  // auth helpers
  ensureAuth,
  waitForUser,
  onAuthStateChanged,
  signOut,

  // app helpers
  logSession,
};

console.log("✅ Firebase initialized. (window.FB ready)");
