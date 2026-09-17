/* prod.rec MVP · Google login and cloud sync (Firebase Auth + Firestore). D-015.
   Signed out, nothing changes: data lives in localStorage as before.
   Signed in, the whole state is one document, users/{uid}, and every commit is pushed to it.
   Firestore rules (set in the console) let a user read and write only their own document.
   The config below is public by design: it identifies the project, the rules guard the data. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const { store, ui } = window.PR;
const demo = new URLSearchParams(location.search).has("demo");

const app = initializeApp({
  apiKey: "AIzaSyB6Ar_THPCeJAdStE1evJzS4C5jtG97DOI",
  authDomain: "prodrec-c9d54.firebaseapp.com",
  projectId: "prodrec-c9d54",
  storageBucket: "prodrec-c9d54.firebasestorage.app",
  messagingSenderId: "841980735190",
  appId: "1:841980735190:web:705b6a9391c6bafe56a377",
});
const auth = getAuth(app);
const db = getFirestore(app);

const btn = document.querySelector("#login");
const label = btn.querySelector("[data-label]");
const icon = btn.querySelector("[data-icon]");

let ref = null;          // users/{uid} while signed in
let unlisten = null;     // Firestore live listener
let applyingRemote = false;
let lastSent = "";       // JSON last written or received, so an echo is not applied twice
let pushTimer;

const fail = (title, err) => { console.error(title, err); ui.toast({ title }); };

function renderButton(user) {
  btn.disabled = false;
  if (user) {
    label.textContent = "Log out";
    icon.src = user.photoURL || "assets/google.svg";
    icon.classList.toggle("login__photo", !!user.photoURL);
    btn.setAttribute("aria-label", `Log out ${user.email || ""}`.trim());
  } else {
    label.textContent = "Log in";
    icon.src = "assets/google.svg";
    icon.classList.remove("login__photo");
    btn.removeAttribute("aria-label");
  }
}

function applyRemote(json) {
  lastSent = json;
  applyingRemote = true;
  try { store.restore(JSON.parse(json)); } finally { applyingRemote = false; }
}

function push() {
  if (!ref) return;
  const json = JSON.stringify(store.snapshot());
  if (json === lastSent) return;
  lastSent = json;
  setDoc(ref, { data: json, savedAt: serverTimestamp() }).catch((err) => fail("Couldn't save to your account", err));
}

store.subscribe(() => {
  if (applyingRemote || !ref) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 600);
});
// Don't lose the last edit when the tab closes inside the debounce window.
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && ref) { clearTimeout(pushTimer); push(); } });

/* First sign-in on a device: [?] the newer copy wins, by state.updatedAt (last data change).
   A fresh device (updatedAt 0) takes the account; a device with newer local edits uploads them. */
async function connect(user) {
  ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const local = store.snapshot();
  if (snap.exists()) {
    const remote = JSON.parse(snap.data().data);
    if ((local.updatedAt || 0) > (remote.updatedAt || 0)) push();
    else applyRemote(snap.data().data);
  } else {
    push(); // first login ever: what was entered without an account moves into it
  }
  // Edits from another device arrive live.
  unlisten = onSnapshot(ref, (s) => {
    if (!s.exists() || s.metadata.hasPendingWrites) return;
    const json = s.data().data;
    if (json && json !== lastSent) applyRemote(json);
  }, (err) => fail("Sync stopped. Reload the page", err));
}

function disconnect() {
  if (unlisten) unlisten();
  unlisten = null;
  ref = null;
  lastSent = "";
}

btn.addEventListener("click", async () => {
  if (demo) { ui.toast({ title: "Demo data isn't saved. Open the page without ?demo to log in" }); return; }
  btn.disabled = true;
  try {
    if (auth.currentUser) {
      clearTimeout(pushTimer);
      push();
      await signOut(auth); // [?] local data stays on this device after logging out
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") await signInWithRedirect(auth, provider);
        else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") throw err;
      }
    }
  } catch (err) {
    fail(err.code === "auth/unauthorized-domain" ? "This site isn't allowed to log in yet" : "Couldn't log in. Try again", err);
  } finally {
    renderButton(auth.currentUser);
  }
});

onAuthStateChanged(auth, async (user) => {
  renderButton(user);
  if (demo) return;
  disconnect();
  if (!user) return;
  try { await connect(user); } catch (err) { disconnect(); fail("Couldn't load your account", err); }
});
