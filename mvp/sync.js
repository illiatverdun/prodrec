/* prod.rec MVP · Google login, cloud sync and the account menu (Firebase Auth + Firestore). D-015.
   Signed out, nothing changes: data lives in localStorage as before.
   Signed in, the whole state is one document, users/{uid}, and every commit is pushed to it.
   Firestore rules (set in the console) let a user read and write only their own document,
   and only create documents in feedback/.
   The config below is public by design: it identifies the project, the rules guard the data. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithCredential, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const { store, ui } = window.PR;
const demo = new URLSearchParams(location.search).has("demo");
const $ = (s) => document.querySelector(s);

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

const loginBtn = $("#login");
const acct = $("#acct");
const toggle = $("#acct-toggle");
const pop = $("#acct-pop");

let ref = null;          // users/{uid} while signed in
let unlisten = null;     // Firestore live listener
let applyingRemote = false;
let lastSent = "";       // JSON last written or received, so an echo is not applied twice
let pushTimer;

const fail = (title, err) => { console.error(title, err); ui.toast({ title }); };

/* ───── Header: Log in button, or the avatar with its menu ───── */

// Avatar from the Google account; the first letter when there is no photo or it fails to load.
function renderAvatar(user) {
  const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
  document.querySelectorAll("[data-avatar]").forEach((el) => {
    el.textContent = initial;
    if (!user.photoURL) return;
    const img = new Image();
    img.alt = "";
    img.referrerPolicy = "no-referrer"; // Google photo URLs refuse some referrers
    img.onload = () => { el.textContent = ""; el.appendChild(img); };
    img.src = user.photoURL;
  });
}

function renderHeader(user) {
  loginBtn.disabled = false;
  loginBtn.hidden = !!user;
  acct.hidden = !user;
  if (!user) { setMenu(false); return; }
  renderAvatar(user);
  $("#acct-email").textContent = user.email || user.displayName || "";
  toggle.setAttribute("aria-label", `Account, ${user.email || ""}`.trim());
}

const items = () => [...pop.querySelectorAll(".ds-menu-item")];
function setMenu(open, { focus = false } = {}) {
  if (open === ui.isOpen(pop)) return;
  if (open) {
    ui.closeFloats(closeMenu);
    ui.openFloat(pop);
    if (focus) items()[0].focus({ preventScroll: true });
  } else {
    ui.closeFloat(pop);
    if (pop.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  }
  toggle.setAttribute("aria-expanded", String(open));
}
const closeMenu = () => setMenu(false);
ui.floats.add(closeMenu);

toggle.addEventListener("click", () => setMenu(!ui.isOpen(pop)));
toggle.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); setMenu(true, { focus: true }); } });
pop.addEventListener("keydown", (e) => {
  const list = items();
  const i = list.indexOf(document.activeElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus(); }
  if (e.key === "Escape") { e.preventDefault(); setMenu(false); }
  if (e.key === "Tab") setMenu(false);
});
document.addEventListener("pointerdown", (e) => { if (ui.isOpen(pop) && !acct.contains(e.target)) setMenu(false); });

pop.addEventListener("click", (e) => {
  const item = e.target.closest("[data-acct]");
  if (!item) return;
  setMenu(false);
  if (item.dataset.acct === "feedback") openFeedback();
  if (item.dataset.acct === "logout") logOut();
});

/* ───── Feedback · text area in a modal, saved to feedback/ ───── */

function openFeedback() {
  const el = document.createElement("div");
  el.setAttribute("aria-labelledby", "fb-title");
  el.innerHTML = `
    <div class="modal__head">
      <div class="modal__title">
        <div class="modal__titles">
          <h2 class="modal__h" id="fb-title">Leave feedback</h2>
          <p class="modal__sub">What works, what's missing, what gets in the way.</p>
        </div>
      </div>
      <button class="ds-icon-btn" data-type="secondary" type="button" aria-label="Close" data-close><img src="assets/close-14.svg" alt="" width="14" height="14"></button>
    </div>
    <div class="ds-field fb-text" data-size="md" data-width="fill"><div class="ds-field__control"><span class="ds-field__slot">
      <textarea class="ds-field__input" id="fb-input" rows="5" maxlength="4000" aria-labelledby="fb-title" placeholder="Your message"></textarea>
    </span></div></div>
    <span class="ds-separator" role="presentation"></span>
    <div class="modal__foot">
      <button class="ds-btn" data-type="secondary" data-size="lg" type="button" data-close>Close</button>
      <button class="ds-btn" data-size="lg" type="button" id="fb-send" disabled>Send</button>
    </div>`;
  const input = el.querySelector("#fb-input");
  const send = el.querySelector("#fb-send");
  input.addEventListener("input", () => { send.disabled = !input.value.trim(); });
  send.addEventListener("click", async () => {
    const user = auth.currentUser;
    const text = input.value.trim();
    if (!user || !text) return;
    send.disabled = true;
    try {
      await addDoc(collection(db, "feedback"), {
        text, uid: user.uid, email: user.email || "", createdAt: serverTimestamp(),
        page: location.pathname, agent: navigator.userAgent,
      });
      ui.closeModal();
      ui.toast({ title: "Thanks! Feedback sent" });
    } catch (err) {
      send.disabled = false;
      fail("Couldn't send feedback. Try again", err);
    }
  });
  ui.openModal(el, { initialFocus: "#fb-input" });
}

/* ───── Sync ───── */

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

async function logOut() {
  clearTimeout(pushTimer);
  push();
  try { await signOut(auth); } catch (err) { fail("Couldn't log out. Try again", err); } // [?] local data stays on this device
}

/* Log in. iOS Safari blocks the third-party storage Firebase's own popup relies on
   (its handler lives on firebaseapp.com): the Google window closed and nothing happened.
   So Google's own token client runs the popup on this origin, and Firebase only gets the token.
   Needs https://illiatverdun.github.io in the OAuth client's Authorized JavaScript origins. */
const CLIENT_ID = "841980735190-3bfh7iqfhsgatm3d4eo4erm33im66vn7.apps.googleusercontent.com";
let tokenClient = null;
function getTokenClient() {
  if (tokenClient || !(window.google && google.accounts && google.accounts.oauth2)) return tokenClient;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "openid email profile",
    callback: async (resp) => {
      if (resp.error) { fail("Couldn't log in. Try again", resp); return; }
      try { await signInWithCredential(auth, GoogleAuthProvider.credential(null, resp.access_token)); }
      catch (err) { fail("Couldn't log in. Try again", err); }
    },
    error_callback: (err) => { if (err.type !== "popup_closed") fail(err.type === "popup_failed_to_open" ? "Allow pop-ups to log in" : "Couldn't log in. Try again", err); },
  });
  return tokenClient;
}

// No await before the popup opens: Safari only allows pop-ups straight from the tap.
function logIn() {
  if (demo) { ui.toast({ title: "Demo data isn't saved. Open the page without ?demo to log in" }); return; }
  const client = getTokenClient();
  if (client) { client.requestAccessToken({ prompt: "select_account" }); return; }
  // Google's script didn't load (blocked or offline): Firebase's popup still works on desktop browsers.
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  signInWithPopup(auth, provider).catch((err) => {
    if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") fail("Couldn't log in. Try again", err);
  });
}
loginBtn.addEventListener("click", logIn);

/* Footer "here" (desktop and tablet) opens the same feedback modal. Feedback needs an account,
   so a signed-out tap logs in first and the modal opens once the login lands. */
let feedbackAfterLogin = false;
$("#foot-feedback").addEventListener("click", () => {
  if (auth.currentUser) { openFeedback(); return; }
  feedbackAfterLogin = !demo;
  logIn();
});

onAuthStateChanged(auth, async (user) => {
  renderHeader(user);
  if (demo) return;
  disconnect();
  if (!user) return;
  if (feedbackAfterLogin) { feedbackAfterLogin = false; openFeedback(); }
  try { await connect(user); } catch (err) { disconnect(); fail("Couldn't load your account", err); }
});
