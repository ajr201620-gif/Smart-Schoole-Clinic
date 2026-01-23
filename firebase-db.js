/* =========================================================
   firebase-db.js — Firestore Adapter (PRO)
   - Uses Firebase modular SDK (v12+)
   - Provides CRUD for cases / visits / notifications / audits
   - Safe fallback if Firestore isn't available
   ========================================================= */

import { app } from "./firebase-init.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export const db = getFirestore(app);

/* ---------- Collections ---------- */
const col = {
  cases: () => collection(db, "cases"),
  visits: () => collection(db, "visits"),
  notifications: () => collection(db, "notifications"),
  audits: () => collection(db, "audits"),
  meta: () => collection(db, "meta"),
};

/* ---------- Utilities ---------- */
function withMeta(data = {}) {
  return { ...data, updatedAt: serverTimestamp() };
}

export async function pingFirestore() {
  // Creates/updates a tiny meta doc to confirm rules/connectivity
  const ref = doc(db, "meta", "ping");
  await setDoc(ref, { ok: true, at: serverTimestamp() }, { merge: true });
  return true;
}

/* ---------- CASES ---------- */
export async function createCaseFS(payload) {
  const data = withMeta({
    ...payload,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(col.cases(), data);
  return { id: ref.id };
}

export async function updateCaseFS(caseId, patch) {
  const ref = doc(db, "cases", caseId);
  await updateDoc(ref, withMeta(patch));
  return true;
}

export async function getCaseFS(caseId) {
  const ref = doc(db, "cases", caseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listCasesFS({ max = 20 } = {}) {
  const q = query(col.cases(), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function watchCasesFS({ max = 20, onData }) {
  const q = query(col.cases(), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData?.(rows);
  });
}

/* ---------- VISITS ---------- */
export async function createVisitFS(payload) {
  const data = withMeta({
    ...payload,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(col.visits(), data);
  return { id: ref.id };
}

export async function updateVisitFS(visitId, patch) {
  const ref = doc(db, "visits", visitId);
  await updateDoc(ref, withMeta(patch));
  return true;
}

export async function listVisitsFS({ max = 20 } = {}) {
  const q = query(col.visits(), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ---------- NOTIFICATIONS ---------- */
export async function pushNotificationFS(payload) {
  const data = withMeta({
    ...payload,
    createdAt: serverTimestamp(),
    seen: false,
  });
  const ref = await addDoc(col.notifications(), data);
  return { id: ref.id };
}

export function watchNotificationsFS({ toRole, max = 20, onData }) {
  // Note: simple version: we fetch latest then filter client-side by toRole
  // (If you want query(where("toRole","==",toRole)) we add it next)
  const q = query(col.notifications(), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const filtered = toRole ? rows.filter(r => r.toRole === toRole) : rows;
    onData?.(filtered);
  });
}

/* ---------- AUDIT ---------- */
export async function auditFS(payload) {
  const data = withMeta({
    ...payload,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(col.audits(), data);
  return { id: ref.id };
}

export async function listAuditsFS({ max = 50 } = {}) {
  const q = query(col.audits(), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
