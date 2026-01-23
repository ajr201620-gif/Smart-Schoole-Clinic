// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHKcmkLwv_In-HaAQV3rPV2k4HJ8k0dWQ",
  authDomain: "studio-3300351439-d6e30.firebaseapp.com",
  projectId: "studio-3300351439-d6e30",
  storageBucket: "studio-3300351439-d6e30.firebasestorage.app",
  messagingSenderId: "76182920806",
  appId: "1:76182920806:web:f81804b26b7dd2a2bc17a7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
