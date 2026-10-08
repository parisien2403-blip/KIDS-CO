// Kids & Co (Famille & partage) — agenda, messages et pense-bête partagés par la famille.
// Un seul code pour la tablette de la cuisine, les PC et les téléphones (Android / iOS).
// Les données passent par Firebase (voir config.js) ; sans configuration, mode démo local.
import { firebaseConfig } from './config.js';

/* ================= Utilitaires ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayStr = () => ymd(new Date());
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtLong = (d) => cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const clockHtml = (d) => `${pad(d.getHours())}<span class="colon">:</span>${pad(d.getMinutes())}`;
const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...crypto.getRandomValues(new Uint8Array(8))].map((x) => A[x % A.length]).join('');
}

const COLORS = ['#E8505B', '#F08A24', '#2FA84F', '#2D8CF0', '#8E5CE6', '#E056A0', '#14A3A3', '#8A7560'];
const CATEGORIES = {
  rdv: '📅 Rendez-vous', sante: '🩺 Santé', ecole: '🎒 École', travail: '💼 Travail',
  anniv: '🎂 Anniversaire', loisir: '⚽ Loisirs', admin: '📄 Administratif', autre: '📌 Autre',
};
const REPEATS = { none: 'Jamais', weekly: 'Chaque semaine', monthly: 'Chaque mois', yearly: 'Chaque année' };
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
};

/* ================= Accès aux données ================= */
// Les deux « backends » exposent la même interface ; le reste de l'appli ne sait pas lequel tourne.

function makeDemoBackend() {
  const P = 'maison-demo:';
  const subs = {};
  const read = (col) => { try { return JSON.parse(localStorage.getItem(P + col)) || []; } catch { return []; } };
  const emit = (col) => (subs[col] || []).forEach((cb) => cb(read(col)));
  const write = (col, arr) => { ls.set(P + col, JSON.stringify(arr)); emit(col); };
  // Un autre onglet a écrit : on rafraîchit (permet de simuler deux personnes).
  addEventListener('storage', (e) => { if (e.key && e.key.startsWith(P)) emit(e.key.slice(P.length)); });

  return {
    mode: 'demo',
    onAuth(cb) {
      let id = ls.get(P + 'uid');
      if (!id) { id = 'local-' + newCode(); ls.set(P + 'uid', id); }
      cb({ uid: id, email: null });
    },
    async signOut() { ls.del(P + 'uid'); location.reload(); },
    async getProfile(uid) { try { return JSON.parse(ls.get(P + 'profile:' + uid)); } catch { return null; } },
    async saveProfile(uid, data) { const cur = (await this.getProfile(uid)) || {}; ls.set(P + 'profile:' + uid, JSON.stringify({ ...cur, ...data })); },
    async createFamily() { return 'DEMO'; },
    async joinFamily() {},
    async getFamily(id) { return { id, name: ls.get(P + 'familyName', 'Notre famille') }; },
    async renameFamily(name) { ls.set(P + 'familyName', name); },
    setFamily() {},
    subscribe(col, cb) { (subs[col] ||= []).push(cb); cb(read(col)); return () => { subs[col] = subs[col].filter((f) => f !== cb); }; },
    async add(col, data) { write(col, [...read(col), { id: newCode() + Date.now().toString(36), ...data }]); },
    async set(col, id, data) {
      const arr = read(col); const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) arr[i] = { ...arr[i], ...data }; else arr.push({ id, ...data });
      write(col, arr);
    },
    async update(col, id, data) { write(col, read(col).map((x) => (x.id === id ? { ...x, ...data } : x))); },
    async remove(col, id) { write(col, read(col).filter((x) => x.id !== id)); },
  };
}

async function makeCloudBackend(cfg) {
  const V = '10.12.2';
  const base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  let db;
  try {
    // Cache local : l'appli reste utilisable sans réseau et se resynchronise ensuite.
    db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch { db = F.getFirestore(app); }
  let fid = null;
  const col = (c) => F.collection(db, 'families', fid, c);
  const ref = (c, id) => F.doc(db, 'families', fid, c, id);

  return {
    mode: 'cloud',
    onAuth(cb) { A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)); },
    signIn: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    signUp: (e, p) => A.createUserWithEmailAndPassword(auth, e, p),
    resetPassword: (e) => A.sendPasswordResetEmail(auth, e),
    signOut: () => A.signOut(auth),
    async getProfile(uid) { const s = await F.getDoc(F.doc(db, 'users', uid)); return s.exists() ? s.data() : null; },
    saveProfile: (uid, data) => F.setDoc(F.doc(db, 'users', uid), data, { merge: true }),
    async createFamily(uid, name) {
      const id = newCode();
      await F.setDoc(F.doc(db, 'families', id), { name, members: [uid], createdAt: Date.now() });
      return id;
    },
    joinFamily: (uid, id) => F.updateDoc(F.doc(db, 'families', id), { members: F.arrayUnion(uid) }),
    async getFamily(id) { const s = await F.getDoc(F.doc(db, 'families', id)); return s.exists() ? { id, ...s.data() } : null; },
    renameFamily: (name) => F.updateDoc(F.doc(db, 'families', fid), { name }),
    setFamily(id) { fid = id; },
    subscribe(c, cb, opts = {}) {
      const q = opts.limit ? F.query(col(c), F.orderBy('ts', 'desc'), F.limit(opts.limit)) : col(c);
      return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => {
        console.error(err); toast('Synchronisation impossible : ' + (err.code || err.message), true);
      });
    },
    add: (c, data) => F.addDoc(col(c), data),
    set: (c, id, data) => F.setDoc(ref(c, id), data, { merge: true }),
    update: (c, id, data) => F.updateDoc(ref(c, id), data),
    remove: (c, id) => F.deleteDoc(ref(c, id)),
  };
}

let backend;
// Les écritures ne bloquent jamais l'écran : hors ligne, Firebase les garde et les envoie plus tard.
const save = (p) => Promise.resolve(p).catch((e) => { console.error(e); toast('Enregistrement impossible : ' + (e.code || e.message), true); });

/* ================= État ================= */
const state = {
  user: null, me: null, family: null,
  members: [], events: [], messages: [], notes: [],
  view: 'accueil',
  month: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  selected: todayStr(),
  noteImportant: false,
  showDone: false,
  loadedMessages: false,
};
let unsubs = [];
let renderedMsgTs = 0;
const stopSubs = () => { unsubs.forEach((u) => u && u()); unsubs = []; };

const member = (id) => state.members.find((m) => m.id === id) || { id, name: 'Ancien membre', color: '#999' };
const lastSeenKey = () => 'maison-lastseen:' + (state.family?.id || '');
const unreadCount = () => {
  const seen = Number(ls.get(lastSeenKey(), 0));
  return state.messages.filter((m) => m.author !== state.user.uid && m.ts > seen).length;
};
function markSeen() {
  const last = state.messages[state.messages.length - 1];
  if (last && state.view === 'messages' && !document.hidden) ls.set(lastSeenKey(), String(last.ts));
}

/* ================= Agenda : occurrences ================= */
// Renvoie les dates (AAAA-MM-JJ) où l'événement a lieu entre `from` et `to` inclus.
function occurrences(ev, from, to) {
  if (!ev.date) return [];
  const rep = ev.repeat || 'none';
  if (rep === 'none') return ev.date >= from && ev.date <= to ? [ev.date] : [];
  const start = parseYmd(ev.date), f = parseYmd(from), t = parseYmd(to), out = [];
  if (start > t) return out;
  if (rep === 'weekly') {
    let d = new Date(start);
    if (d < f) d = addDays(d, Math.floor((f - d) / (7 * 864e5)) * 7);
    for (; d <= t; d = addDays(d, 7)) if (d >= f) out.push(ymd(d));
    return out;
  }
  const sy = start.getFullYear(), sm = start.getMonth(), sd = start.getDate();
  const step = rep === 'yearly' ? 12 : 1;
  let k = Math.max(0, Math.floor(((f.getFullYear() - sy) * 12 + f.getMonth() - sm) / step) - 1);
  for (;; k++) {
    const d = new Date(sy, sm + k * step, sd);
    if (d > t) break;
    if (d.getDate() !== sd) continue; // ex. le 31 dans un mois de 30 jours
    if (d >= f) out.push(ymd(d));
  }
  return out;
}
const byTime = (a, b) => (a.allDay ? '' : a.time || '').localeCompare(b.allDay ? '' : b.time || '') || a.title.localeCompare(b.title);
function eventsByDay(from, to) {
  const map = {};
  for (const ev of state.events) for (const d of occurrences(ev, from, to)) (map[d] ||= []).push(ev);
  Object.values(map).forEach((l) => l.sort(byTime));
  return map;
}
const evColor = (ev) => (ev.who && ev.who.length ? member(ev.who[0]).color : 'var(--accent)');
const evTime = (ev) => (ev.allDay || !ev.time ? 'Journée' : ev.time + (ev.end ? '–' + ev.end : ''));

/* ================= Petits composants ================= */
function toast(text, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = text;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), err ? 6000 : 3500);
}
const avatar = (m) => `<span class="avatar" style="--c:${esc(m.color)}" title="${esc(m.name)}">${esc(initial(m.name))}</span>`;
const avatars = (ids) => (ids && ids.length ? `<span class="avatars">${ids.map((id) => avatar(member(id))).join('')}</span>` : '');
const colorPicker = (current) => `<div class="colors">${COLORS.map((c) =>
  `<button type="button" class="color-dot ${c === current ? 'on' : ''}" style="--c:${c}" data-action="pick-color" data-color="${c}" aria-label="Couleur"></button>`).join('')}</div>`;

function evItem(ev, withDate) {
  const meta = [CATEGORIES[ev.category] || '', withDate ? fmtLong(parseYmd(withDate)) : '', ev.notes ? '📝' : ''].filter(Boolean).join(' · ');
  return `<button class="ev" style="--c:${esc(evColor(ev))}" data-action="edit-event" data-id="${esc(ev.id)}">
    <span class="ev-time">${ev.allDay || !ev.time ? '<span class="ev-allday">Journée</span>' : `${esc(ev.time)}${ev.end ? `<small>${esc(ev.end)}</small>` : ''}`}</span>
    <span class="ev-body"><span class="ev-title">${esc(ev.title)}</span>${meta ? `<div class="ev-meta">${esc(meta)}</div>` : ''}</span>
    ${avatars(ev.who)}
  </button>`;
}

/* ================= Écrans de connexion ================= */
function renderLogin(mode = 'login', error = '') {
  $('#app').innerHTML = `<div class="auth"><form class="card" id="login-form">
    <div class="auth-logo"><img src="logo.png" alt=""><div><h1 class="wordmark">Kids &amp; Co</h1><div class="tagline">Famille &amp; partage</div></div></div>
    <div class="seg"><button type="button" class="${mode === 'login' ? 'on' : ''}" data-action="auth-mode" data-mode="login">Se connecter</button>
      <button type="button" class="${mode === 'signup' ? 'on' : ''}" data-action="auth-mode" data-mode="signup">Créer un compte</button></div>
    <label class="field"><span>Adresse e-mail</span><input type="email" name="email" autocomplete="email" required></label>
    <label class="field"><span>Mot de passe</span><input type="password" name="password" minlength="6" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></label>
    <div class="error">${esc(error)}</div>
    <button class="btn btn-primary" style="width:100%">${mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
    ${mode === 'login' ? '<button type="button" class="link" data-action="reset-password">Mot de passe oublié ?</button>' : '<p class="muted small">Chaque membre de la famille crée son compte. Pour la tablette de la cuisine, vous pouvez créer un compte « Maison ».</p>'}
  </form></div>`;
  $('#login-form').dataset.mode = mode;
}
const AUTH_ERRORS = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.', 'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec cet e-mail.', 'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).', 'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/network-request-failed': 'Pas de connexion internet.', 'auth/too-many-requests': 'Trop d’essais, réessayez dans quelques minutes.',
};

function renderSetup(profile) {
  const cloud = backend.mode === 'cloud';
  const color = profile?.color || COLORS[Math.floor(Math.random() * COLORS.length)];
  $('#app').innerHTML = `<div class="auth"><form class="card" id="setup-form" data-color="${color}" data-choice="create">
    <div class="auth-logo"><img src="logo.png" alt=""><div><h1>Bienvenue !</h1><div class="muted">Présentez-vous à la famille</div></div></div>
    <label class="field"><span>Votre prénom (ou « Maison » pour la tablette)</span><input type="text" name="name" value="${esc(profile?.name || '')}" maxlength="30" required></label>
    <div class="field"><span>Votre couleur</span>${colorPicker(color)}</div>
    ${cloud ? `<div class="seg" style="margin-top:8px"><button type="button" class="on" data-action="setup-choice" data-choice="create">Créer notre foyer</button>
      <button type="button" data-action="setup-choice" data-choice="join">Rejoindre un foyer</button></div>
      <label class="field" id="f-family"><span>Nom du foyer</span><input type="text" name="family" placeholder="Famille Martin" maxlength="40"></label>
      <label class="field hidden" id="f-code"><span>Code d’invitation (dans Réglages, sur un appareil déjà installé)</span><input type="text" name="code" placeholder="ABCD2345" maxlength="8" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.15em"></label>`
    : '<p class="demo-banner">Mode démo : les données restent sur cet appareil. Ouvrez un 2ᵉ onglet pour simuler une autre personne.</p>'}
    <div class="error"></div>
    <button class="btn btn-primary" style="width:100%">C’est parti</button>
    ${cloud ? '<button type="button" class="link" data-action="logout">Changer de compte</button>' : ''}
  </form></div>`;
}

async function submitSetup(form) {
  const fd = new FormData(form);
  const name = fd.get('name').trim(), color = form.dataset.color, uid = state.user.uid;
  const errEl = form.querySelector('.error');
  const btn = form.querySelector('.btn-primary');
  if (!name) return;
  btn.disabled = true; errEl.textContent = '';
  try {
    let familyId = 'DEMO';
    if (backend.mode === 'cloud') {
      if (form.dataset.choice === 'join') {
        familyId = String(fd.get('code') || '').trim().toUpperCase();
        if (familyId.length !== 8) throw new Error('Le code fait 8 caractères.');
        try { await backend.joinFamily(uid, familyId); } catch { throw new Error('Code introuvable. Vérifiez-le dans Réglages sur un appareil déjà connecté.'); }
      } else {
        familyId = await backend.createFamily(uid, String(fd.get('family') || '').trim() || 'Notre famille');
      }
    }
    await backend.saveProfile(uid, { name, color, familyId });
    await enter(state.user);
  } catch (e) {
    errEl.textContent = e.message; btn.disabled = false;
  }
}

/* ================= Démarrage ================= */
async function enter(user) {
  stopSubs();
  state.user = user;
  if (!user) return renderLogin();
  let profile, family;
  try {
    profile = await backend.getProfile(user.uid);
    family = profile?.familyId ? await backend.getFamily(profile.familyId) : null;
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="auth"><div class="card"><h1>Connexion impossible</h1><p class="muted">${esc(e.code || e.message)}</p>
      <p class="small muted">Vérifiez votre connexion internet et que les règles Firestore (firestore.rules) sont bien publiées.</p>
      <button class="btn btn-primary" data-action="reload">Réessayer</button> <button class="btn" data-action="logout">Se déconnecter</button></div></div>`;
    return;
  }
  if (!profile?.name || !family) return renderSetup(profile);

  state.me = { name: profile.name, color: profile.color };
  state.family = family;
  state.loadedMessages = false;
  backend.setFamily(family.id);
  save(backend.set('membres', user.uid, { name: profile.name, color: profile.color }));

  renderShell();
  unsubs.push(
    backend.subscribe('membres', (list) => { state.members = list.sort((a, b) => a.name.localeCompare(b.name)); refresh(); }),
    backend.subscribe('events', (list) => { state.events = list; refresh(); }),
    backend.subscribe('notes', (list) => { state.notes = list; refresh(); }),
    backend.subscribe('messages', onMessages, { limit: 300 }),
  );
}

function onMessages(list) {
  list.sort((a, b) => a.ts - b.ts);
  const prevMax = state.messages.length ? state.messages[state.messages.length - 1].ts : 0;
  const fresh = state.loadedMessages ? list.filter((m) => m.ts > prevMax && m.author !== state.user.uid) : [];
  state.messages = list;
  state.loadedMessages = true;
  for (const m of fresh) {
    const who = member(m.author).name;
    if (state.view !== 'messages' || document.hidden) toast(`💬 ${who} : ${m.text.slice(0, 80)}`);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(`${who} — Kids & Co`, { body: m.text.slice(0, 140), icon: 'icon-192.png', tag: 'maison-msg' }); } catch {}
    }
  }
  markSeen();
  refresh();
}

/* ================= Coquille (navigation) ================= */
const NAV = [
  ['accueil', 'Accueil', 'home'], ['agenda', 'Agenda', 'cal'], ['messages', 'Messages', 'chat'],
  ['important', 'Pense-bête', 'star'], ['reglages', 'Réglages', 'gear'],
];
function navButtons() {
  const n = unreadCount();
  return NAV.map(([id, label, icon]) => `<button class="nav-btn ${state.view === id ? 'active' : ''}" data-action="nav" data-view="${id}">
    ${ICON[icon]}<span>${label}</span>${id === 'messages' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('');
}
function renderShell() {
  $('#app').innerHTML = `<div class="shell">
    <nav class="sidebar"><div class="brand"><img src="logo.png" alt=""><span class="brand-name">Kids &amp; Co</span><small id="fam-name">${esc(state.family.name)}</small></div>
      <div id="nav-side"></div></nav>
    <header class="topbar"><img src="logo.png" alt=""><div><span class="brand-name">Kids &amp; Co</span><small id="fam-name-top">${esc(state.family.name)}</small></div>
      <button class="me-btn" data-action="nav" data-view="reglages" aria-label="Réglages" id="me-btn"></button></header>
    <main id="main"></main>
    <nav class="tabbar" id="nav-tab"></nav>
  </div>`;
  refresh();
}

// Redessine la vue en gardant ce que l'utilisateur est en train de taper.
function refresh() {
  const main = $('#main');
  if (!main) return;
  $('#nav-side').innerHTML = navButtons();
  $('#nav-tab').innerHTML = navButtons();
  $('#fam-name').textContent = state.family.name;
  $('#fam-name-top').textContent = state.family.name;
  $('#me-btn').innerHTML = avatar(state.me);
  document.title = (unreadCount() ? `(${unreadCount()}) ` : '') + 'Kids & Co';

  const kept = {};
  main.querySelectorAll('input[id],textarea[id]').forEach((el) => { kept[el.id] = el.value; });
  const active = document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : null;
  const chat = $('#chat');
  const nearBottom = !chat || chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;

  main.className = (state.view === 'messages' ? 'fill' : '') + (entering ? ' enter' : '');
  main.innerHTML = (backend.mode === 'demo' && state.view !== 'messages'
    ? '<div class="demo-banner">Mode démo — les données restent sur cet appareil. Ajoutez votre configuration Firebase dans <b>config.js</b> pour synchroniser tous les appareils (voir LISEZMOI.md).</div>' : '')
    + VIEWS[state.view]();

  for (const [id, v] of Object.entries(kept)) { const el = document.getElementById(id); if (el && el.type !== 'file') el.value = v; }
  if (active) { const el = document.getElementById(active); if (el) { el.focus(); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } }
  const c2 = $('#chat');
  if (c2 && nearBottom) c2.scrollTop = c2.scrollHeight;
  autoGrow($('#msg-input'));
}
// L'animation d'entrée ne joue qu'au changement d'écran, pas à chaque synchronisation.
let entering = false, enterTimer = null;
function go(view) {
  state.view = view;
  entering = true; clearTimeout(enterTimer);
  enterTimer = setTimeout(() => { entering = false; $('#main')?.classList.remove('enter'); }, 800);
  markSeen();
  refresh();
  $('#main').scrollTop = 0;
  if (view === 'messages') { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; }
}

/* ================= Vues ================= */
const VIEWS = {
  accueil() {
    const now = new Date(), t = todayStr();
    const map = eventsByDay(t, ymd(addDays(now, 14)));
    const today = map[t] || [];
    const upcoming = Object.keys(map).filter((d) => d > t).sort().slice(0, 7);
    const important = state.notes.filter((n) => !n.done).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || b.ts - a.ts).slice(0, 7);
    const lastMsgs = state.messages.slice(-4);
    const hello = now.getHours() < 5 ? 'Bonne nuit' : now.getHours() < 18 ? 'Bonjour' : 'Bonsoir';
    const dateTxt = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `<div class="dash-head">
        <div class="hero">
          <div class="greet">${hello} ${esc(state.me.name)}</div>
          <div class="clock" id="clock">${clockHtml(now)}</div>
          <div class="today-label">${esc(dateTxt)}</div></div>
        <div class="quick">
          <button class="btn btn-primary" data-action="new-event" data-date="${t}">${ICON.plus} Rendez-vous</button>
          <button class="btn" data-action="nav" data-view="important">${ICON.star} Pense-bête</button>
          <button class="btn" data-action="nav" data-view="messages">${ICON.chat} Message</button>
        </div></div>
      <div class="dash-grid">
        <section class="card tint-peach"><div class="card-head"><h2>Aujourd’hui</h2><span class="muted small">${today.length || 'Rien'} prévu${today.length > 1 ? 's' : ''}</span></div>
          <div class="list">${today.map((ev) => evItem(ev)).join('') || '<div class="empty">Journée libre ☀️</div>'}</div></section>
        <section class="card tint-butter"><div class="card-head"><h2>À ne pas oublier</h2><button class="btn btn-sm" data-action="nav" data-view="important">Tout voir</button></div>
          <div class="list">${important.map(noteItem).join('') || '<div class="empty">Rien à signaler.</div>'}</div></section>
        <section class="card tint-mint"><div class="card-head"><h2>À venir</h2><button class="btn btn-sm" data-action="nav" data-view="agenda">Agenda</button></div>
          ${upcoming.map((d) => `<div class="day-group"><h3>${d === ymd(addDays(now, 1)) ? 'Demain' : esc(fmtLong(parseYmd(d)))}</h3>
            <div class="list">${map[d].map((ev) => evItem(ev)).join('')}</div></div>`).join('') || '<div class="empty">Rien dans les 2 prochaines semaines.</div>'}</section>
        <section class="card tint-sky"><div class="card-head"><h2>Derniers messages</h2><button class="btn btn-sm" data-action="nav" data-view="messages">Discuter</button></div>
          <div class="list">${lastMsgs.map((m) => { const a = member(m.author); return `<div class="mini-msg">${avatar(a)}<div><b>${esc(a.name)}</b> <span class="muted small">${fmtTime(m.ts)}</span><p>${esc(m.text)}</p></div></div>`; }).join('') || '<div class="empty">Aucun message pour l’instant.</div>'}</div></section>
      </div>`;
  },

  agenda() {
    const m = state.month;
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const gridStart = addDays(first, -((first.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const map = eventsByDay(ymd(days[0]), ymd(days[41]));
    const t = todayStr();
    const sel = state.selected;
    const selEvents = eventsByDay(sel, sel)[sel] || [];
    const cells = days.map((d) => {
      const k = ymd(d), list = map[k] || [];
      return `<button class="cal-day ${d.getMonth() !== m.getMonth() ? 'out' : ''} ${k === t ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-action="select-day" data-date="${k}">
        <span class="num">${d.getDate()}</span>
        ${list.slice(0, 3).map((ev) => `<span class="chip" style="--c:${esc(evColor(ev))}">${ev.allDay || !ev.time ? '' : esc(ev.time) + ' '}${esc(ev.title)}</span>`).join('')}
        ${list.length > 3 ? `<span class="more">+${list.length - 3}</span>` : ''}
        ${list.length ? `<span class="dots">${list.slice(0, 4).map((ev) => `<span class="dot" style="--c:${esc(evColor(ev))}"></span>`).join('')}</span>` : ''}
      </button>`;
    }).join('');
    return `<div class="view-head"><div><div class="eyebrow">Le planning de la famille</div><h1>Agenda</h1></div>
        <div class="cal-nav"><button class="btn btn-icon" data-action="month" data-delta="-1" aria-label="Mois précédent">${ICON.left}</button>
          <h2>${m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
          <button class="btn btn-icon" data-action="month" data-delta="1" aria-label="Mois suivant">${ICON.right}</button>
          <button class="btn btn-sm" data-action="month" data-delta="0">Aujourd’hui</button></div>
        <button class="btn btn-primary" data-action="new-event" data-date="${sel}">${ICON.plus} Ajouter</button></div>
      <div class="agenda">
        <div class="cal">${DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
        <section class="card day-panel"><div class="card-head"><h2>${esc(fmtLong(parseYmd(sel)))}</h2>
          <button class="btn btn-icon" data-action="new-event" data-date="${sel}" aria-label="Ajouter ce jour">${ICON.plus}</button></div>
          <div class="list">${selEvents.map((ev) => evItem(ev)).join('') || '<div class="empty">Rien de prévu ce jour-là.</div>'}</div></section>
      </div>`;
  },

  messages() {
    let html = '', lastDay = '';
    const popAfter = renderedMsgTs;
  renderedMsgTs = state.messages.length ? state.messages[state.messages.length - 1].ts : 0;
  for (const m of state.messages) {
      const day = ymd(new Date(m.ts));
      if (day !== lastDay) {
        lastDay = day;
        const label = day === todayStr() ? 'Aujourd’hui' : day === ymd(addDays(new Date(), -1)) ? 'Hier' : fmtLong(parseYmd(day));
        html += `<div class="day-sep">${esc(label)}</div>`;
      }
      const mine = m.author === state.user.uid, a = member(m.author);
      html += `<div class="msg ${mine ? 'mine' : ''} ${popAfter && m.ts > popAfter ? 'pop' : ''}">${mine ? '' : `<span class="msg-author" style="--c:${esc(a.color)}">${esc(a.name)}</span>`}${esc(m.text)}<span class="msg-time">${fmtTime(m.ts)}</span></div>`;
    }
    return `<div class="view-head" style="margin-bottom:8px"><div><div class="eyebrow">${esc(state.family.name)}</div><h1>Messages</h1></div><div class="avatars">${state.members.map(avatar).join('')}</div></div>
      <div class="chat" id="chat">${html || '<div class="empty" style="margin:auto">Écrivez le premier message à la famille 👋</div>'}</div>
      <form class="composer" id="msg-form"><textarea id="msg-input" rows="1" placeholder="Écrire un message…" maxlength="2000"></textarea>
        <button class="btn btn-primary" aria-label="Envoyer">${ICON.send}</button></form>`;
  },

  important() {
    const open = state.notes.filter((n) => !n.done).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || b.ts - a.ts);
    const done = state.notes.filter((n) => n.done).sort((a, b) => (b.doneTs || 0) - (a.doneTs || 0));
    return `<div class="view-head"><div><div class="eyebrow">Ce qu’il ne faut pas oublier</div><h1>Pense-bête</h1></div></div>
      <form class="note-add" id="note-form">
        <input type="text" id="note-input" placeholder="Choses importantes, courses, à faire…" maxlength="300">
        <button type="button" class="toggle-imp ${state.noteImportant ? 'on' : ''}" data-action="toggle-imp">★ Important</button>
        <button class="btn btn-primary">${ICON.plus} Ajouter</button>
      </form>
      <div class="list">${open.map(noteItem).join('') || '<div class="empty">Rien à faire, profitez-en !</div>'}</div>
      ${done.length ? `<div class="section-title"><span>Terminé (${done.length})</span><span>
        <button class="btn btn-sm" data-action="toggle-done">${state.showDone ? 'Masquer' : 'Afficher'}</button>
        <button class="btn btn-sm btn-danger" data-action="clear-done">Tout effacer</button></span></div>
        ${state.showDone ? `<div class="list">${done.map(noteItem).join('')}</div>` : ''}` : ''}`;
  },

  reglages() {
    const tablet = ls.get('maison-tablet') === '1';
    const theme = ls.get('maison-theme', 'auto');
    const notif = !('Notification' in window) ? 'unsupported' : Notification.permission;
    return `<div class="view-head"><div><div class="eyebrow">Profil, foyer et appareil</div><h1>Réglages</h1></div></div>
      <div class="settings">
        <section class="card"><h2 style="margin-bottom:14px">Mon profil</h2>
          <form id="profile-form" data-color="${esc(state.me.color)}">
            <label class="field"><span>Prénom</span><input type="text" id="p-name" value="${esc(state.me.name)}" maxlength="30" required></label>
            <div class="field"><span>Couleur</span>${colorPicker(state.me.color)}</div>
            <button class="btn btn-primary">Enregistrer</button></form></section>
        <section class="card"><h2>Notre foyer</h2>
          ${backend.mode === 'cloud' ? `<p class="muted small" style="margin:10px 0 0">Code d’invitation à donner aux autres membres pour qu’ils rejoignent le foyer :</p>
            <div class="invite">${esc(state.family.id)}</div>
            <button class="btn btn-sm" data-action="share-code">Partager le code</button>` : '<p class="muted small">En mode démo, le foyer est local à cet appareil.</p>'}
          <form id="family-form" style="margin-top:16px"><label class="field"><span>Nom du foyer</span>
            <input type="text" id="f-name" value="${esc(state.family.name)}" maxlength="40"></label></form>
          <div class="small muted" style="font-weight:650;margin-bottom:4px">Membres</div>
          ${state.members.map((m) => `<div class="member-line">${avatar(m)}<span>${esc(m.name)}${m.id === state.user.uid ? ' <span class="muted small">(vous)</span>' : ''}</span></div>`).join('')}
        </section>
        <section class="card"><h2 style="margin-bottom:6px">Cet appareil</h2>
          <div class="switch-line"><div><b>Mode tablette de la maison</b><div class="small muted">Écran toujours allumé, retour à l’accueil après 2 min.</div></div>
            <button class="btn btn-sm ${tablet ? 'btn-primary' : ''}" data-action="toggle-tablet">${tablet ? 'Activé' : 'Activer'}</button></div>
          <div class="switch-line"><b>Thème</b><select data-action="theme">
            ${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<option value="${v}" ${theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="switch-line"><div><b>Notifications</b><div class="small muted">Alerte quand un message arrive et que l’appli est en arrière-plan.</div></div>
            ${notif === 'granted' ? '<span class="small muted">Activées</span>' : notif === 'denied' ? '<span class="small muted">Bloquées par le navigateur</span>'
              : notif === 'unsupported' ? '<span class="small muted">Non disponible</span>' : '<button class="btn btn-sm" data-action="notif">Activer</button>'}</div>
          <div class="switch-line"><div><b>Installer l’appli</b><div class="small muted">iPhone/iPad : Partager → « Sur l’écran d’accueil ». Android/PC : menu du navigateur → « Installer l’application ».</div></div></div>
        </section>
        <section class="card"><h2 style="margin-bottom:6px">Compte</h2>
          <p class="muted small">${backend.mode === 'cloud' ? 'Connecté : ' + esc(state.user.email) : 'Mode démo (pas de compte).'}</p>
          <button class="btn btn-danger" data-action="logout">${backend.mode === 'cloud' ? 'Se déconnecter' : 'Changer de personne'}</button></section>
      </div>`;
  },
};

function noteItem(n) {
  const a = member(n.author);
  return `<div class="note ${n.important ? 'imp' : ''} ${n.done ? 'done' : ''}">
    <button class="check" data-action="toggle-note" data-id="${esc(n.id)}" aria-label="Fait">${n.done ? ICON.check : ''}</button>
    <div class="note-text">${esc(n.text)}<div class="note-meta">${esc(a.name)} · ${new Date(n.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div></div>
    <button class="star" data-action="star-note" data-id="${esc(n.id)}" aria-label="Important">${n.important ? '★' : '☆'}</button>
    <button class="del" data-action="del-note" data-id="${esc(n.id)}" aria-label="Supprimer">${ICON.trash}</button>
  </div>`;
}

/* ================= Fenêtre rendez-vous ================= */
function openEventModal(ev, date) {
  const isNew = !ev;
  ev = ev || { title: '', date: date || todayStr(), time: '', end: '', allDay: false, category: 'rdv', repeat: 'none', who: [], notes: '' };
  const who = new Set(ev.who || []);
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="event-form" data-id="${esc(ev.id || '')}">
    <h2 style="margin-bottom:16px;font-size:20px">${isNew ? 'Nouveau rendez-vous' : 'Modifier'}</h2>
    <label class="field"><span>Quoi ?</span><input type="text" name="title" value="${esc(ev.title)}" placeholder="Dentiste, réunion d’école, anniversaire de Mamie…" maxlength="100" required></label>
    <div class="row"><label class="field"><span>Date</span><input type="date" name="date" value="${esc(ev.date)}" required></label>
      <label class="field"><span>Catégorie</span><select name="category">${Object.entries(CATEGORIES).map(([k, l]) => `<option value="${k}" ${ev.category === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <label class="check-line"><input type="checkbox" name="allDay" ${ev.allDay ? 'checked' : ''}> Toute la journée</label>
    <div class="row ${ev.allDay ? 'hidden' : ''}" id="time-row"><label class="field"><span>Début</span><input type="time" name="time" value="${esc(ev.time)}"></label>
      <label class="field"><span>Fin (facultatif)</span><input type="time" name="end" value="${esc(ev.end)}"></label></div>
    <label class="field"><span>Répéter</span><select name="repeat">${Object.entries(REPEATS).map(([k, l]) => `<option value="${k}" ${ev.repeat === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="field"><span>Qui est concerné ? (personne = toute la famille)</span><div class="who">
      ${state.members.map((m) => `<button type="button" class="who-chip ${who.has(m.id) ? 'on' : ''}" style="--c:${esc(m.color)}" data-action="toggle-who" data-id="${esc(m.id)}">${esc(m.name)}</button>`).join('')}</div></div>
    <label class="field"><span>Notes</span><textarea name="notes" maxlength="1000" placeholder="Adresse, documents à apporter…">${esc(ev.notes)}</textarea></label>
    ${!isNew && ev.createdBy ? `<p class="small muted">Ajouté par ${esc(member(ev.createdBy).name)}</p>` : ''}
    <div class="modal-actions">${isNew ? '' : `<button type="button" class="btn btn-danger" data-action="delete-event">${ICON.trash} Supprimer</button>`}
      <span class="grow"></span><button type="button" class="btn" data-action="close-modal">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
  if (isNew) setTimeout(() => $('#event-form [name=title]')?.focus(), 50);
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };

function submitEvent(form) {
  const fd = new FormData(form);
  const data = {
    title: fd.get('title').trim(), date: fd.get('date'), allDay: !!fd.get('allDay'),
    time: fd.get('allDay') ? '' : fd.get('time'), end: fd.get('allDay') ? '' : fd.get('end'),
    category: fd.get('category'), repeat: fd.get('repeat'), notes: fd.get('notes').trim(),
    who: [...form.querySelectorAll('.who-chip.on')].map((b) => b.dataset.id),
  };
  if (!data.title || !data.date) return;
  const id = form.dataset.id;
  if (id) save(backend.update('events', id, data));
  else save(backend.add('events', { ...data, createdBy: state.user.uid, ts: Date.now() }));
  state.selected = data.date;
  closeModal();
  toast(id ? 'Rendez-vous modifié' : 'Rendez-vous ajouté — visible sur tous les appareils');
}

/* ================= Actions ================= */
const ACTIONS = {
  nav: (el) => go(el.dataset.view),
  reload: () => location.reload(),
  'auth-mode': (el) => renderLogin(el.dataset.mode),
  async 'reset-password'() {
    const email = $('#login-form [name=email]').value.trim();
    if (!email) return toast('Saisissez d’abord votre e-mail.', true);
    try { await backend.resetPassword(email); toast('E-mail de réinitialisation envoyé.'); } catch (e) { toast(AUTH_ERRORS[e.code] || e.message, true); }
  },
  'setup-choice'(el) {
    const form = el.closest('form');
    form.dataset.choice = el.dataset.choice;
    form.querySelectorAll('[data-action=setup-choice]').forEach((b) => b.classList.toggle('on', b === el));
    $('#f-family').classList.toggle('hidden', el.dataset.choice !== 'create');
    $('#f-code').classList.toggle('hidden', el.dataset.choice !== 'join');
  },
  'pick-color'(el) {
    const form = el.closest('form');
    form.dataset.color = el.dataset.color;
    form.querySelectorAll('.color-dot').forEach((b) => b.classList.toggle('on', b === el));
  },
  async logout() {
    if (backend.mode === 'cloud' && state.me && !confirm('Se déconnecter de cet appareil ?')) return;
    stopSubs(); await backend.signOut();
  },
  'new-event': (el) => openEventModal(null, el.dataset.date),
  'edit-event': (el) => { const ev = state.events.find((x) => x.id === el.dataset.id); if (ev) openEventModal(ev); },
  'close-modal': (el, e) => { if (e.target === el) closeModal(); },
  'toggle-who': (el) => el.classList.toggle('on'),
  'delete-event'() {
    const id = $('#event-form').dataset.id;
    const ev = state.events.find((x) => x.id === id);
    if (!confirm(`Supprimer « ${ev?.title} »${ev?.repeat !== 'none' ? ' (toutes les répétitions)' : ''} ?`)) return;
    save(backend.remove('events', id)); closeModal(); toast('Rendez-vous supprimé');
  },
  'select-day'(el) {
    state.selected = el.dataset.date;
    const d = parseYmd(el.dataset.date);
    if (d.getMonth() !== state.month.getMonth()) state.month = new Date(d.getFullYear(), d.getMonth(), 1);
    refresh();
  },
  month(el) {
    const n = Number(el.dataset.delta);
    if (n === 0) { const d = new Date(); state.month = new Date(d.getFullYear(), d.getMonth(), 1); state.selected = todayStr(); }
    else state.month = new Date(state.month.getFullYear(), state.month.getMonth() + n, 1);
    refresh();
  },
  'toggle-imp'() { state.noteImportant = !state.noteImportant; refresh(); },
  'toggle-note'(el) { const n = state.notes.find((x) => x.id === el.dataset.id); if (n) save(backend.update('notes', n.id, { done: !n.done, doneTs: Date.now() })); },
  'star-note'(el) { const n = state.notes.find((x) => x.id === el.dataset.id); if (n) save(backend.update('notes', n.id, { important: !n.important })); },
  'del-note'(el) { save(backend.remove('notes', el.dataset.id)); },
  'toggle-done'() { state.showDone = !state.showDone; refresh(); },
  'clear-done'() {
    const done = state.notes.filter((n) => n.done);
    if (confirm(`Effacer ${done.length} élément(s) terminé(s) ?`)) done.forEach((n) => save(backend.remove('notes', n.id)));
  },
  async 'share-code'() {
    const text = `Rejoins notre foyer sur Kids & Co avec le code : ${state.family.id}\n${location.href.split('#')[0]}`;
    if (navigator.share) { try { await navigator.share({ title: 'Kids & Co', text }); } catch {} return; }
    try { await navigator.clipboard.writeText(text); toast('Code copié'); } catch { toast('Code : ' + state.family.id); }
  },
  'toggle-tablet'() { ls.set('maison-tablet', ls.get('maison-tablet') === '1' ? '0' : '1'); applyTablet(); refresh(); },
  async notif() { await Notification.requestPermission(); refresh(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT') return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) { if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault(); fn(el, e); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.action === 'theme') { ls.set('maison-theme', t.value); applyTheme(); }
  if (t.form?.id === 'event-form' && t.name === 'allDay') $('#time-row').classList.toggle('hidden', t.checked);
  if (t.form?.id === 'event-form' && t.name === 'category' && t.value === 'anniv') t.form.repeat.value = 'yearly';
  if (t.id === 'f-name' && t.value.trim()) {
    state.family.name = t.value.trim();
    save(backend.renameFamily(state.family.name)); refresh();
  }
});

document.addEventListener('submit', async (e) => {
  const f = e.target;
  e.preventDefault();
  if (f.id === 'login-form') {
    const email = f.email.value.trim(), pw = f.password.value;
    const btn = f.querySelector('.btn-primary'); btn.disabled = true;
    try { await (f.dataset.mode === 'signup' ? backend.signUp(email, pw) : backend.signIn(email, pw)); }
    catch (err) { renderLogin(f.dataset.mode, AUTH_ERRORS[err.code] || err.message); $('#login-form [name=email]').value = email; }
  } else if (f.id === 'setup-form') submitSetup(f);
  else if (f.id === 'event-form') submitEvent(f);
  else if (f.id === 'msg-form') sendMessage();
  else if (f.id === 'note-form') {
    const input = $('#note-input'), text = input.value.trim();
    if (!text) return;
    save(backend.add('notes', { text, important: state.noteImportant, done: false, author: state.user.uid, ts: Date.now() }));
    input.value = ''; state.noteImportant = false; refresh();
  } else if (f.id === 'profile-form') {
    const name = $('#p-name').value.trim(), color = f.dataset.color;
    if (!name) return;
    state.me = { name, color };
    save(backend.saveProfile(state.user.uid, { name, color }));
    save(backend.set('membres', state.user.uid, { name, color }));
    toast('Profil enregistré');
  } else if (f.id === 'family-form') $('#f-name').blur();
});

function sendMessage() {
  const input = $('#msg-input'), text = input.value.trim();
  if (!text) return;
  input.value = '';
  save(backend.add('messages', { text, author: state.user.uid, ts: Date.now() }));
  input.focus();
}
function autoGrow(el) { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }
document.addEventListener('input', (e) => { if (e.target.id === 'msg-input') autoGrow(e.target); });
document.addEventListener('keydown', (e) => {
  // Entrée envoie le message, Maj+Entrée fait un retour à la ligne.
  if (e.target.id === 'msg-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  if (e.key === 'Escape' && $('#modal-root').innerHTML) closeModal();
});

/* ================= Thème, horloge, mode tablette ================= */
function applyTheme() {
  const t = ls.get('maison-theme', 'auto');
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}

let wakeLock = null, idleTimer = null;
async function applyTablet() {
  const on = ls.get('maison-tablet') === '1';
  document.body.classList.toggle('tablet', on);
  if (on && 'wakeLock' in navigator && !document.hidden) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  } else if (!on && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  resetIdle();
}
function resetIdle() {
  clearTimeout(idleTimer);
  if (ls.get('maison-tablet') !== '1') return;
  idleTimer = setTimeout(() => {
    if (state.view !== 'accueil' && !$('#modal-root').innerHTML && $('#main')) go('accueil');
  }, 120000);
}
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, resetIdle, { passive: true }));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { applyTablet(); markSeen(); refresh(); }
});

let lastDay = todayStr();
setInterval(() => {
  const now = new Date();
  const clock = $('#clock');
  if (clock) clock.innerHTML = clockHtml(now);
  if (todayStr() !== lastDay) { lastDay = todayStr(); if ($('#main') && !$('#modal-root').innerHTML) refresh(); } // minuit : on passe au jour suivant
}, 15000);

/* ================= Lancement ================= */
(async function boot() {
  applyTheme();
  applyTablet();
  try {
    backend = firebaseConfig ? await makeCloudBackend(firebaseConfig) : makeDemoBackend();
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="auth"><div class="card"><h1>Impossible de démarrer</h1>
      <p class="muted">Le service de synchronisation ne répond pas (${esc(e.message)}). Vérifiez la connexion internet et le fichier config.js.</p>
      <button class="btn btn-primary" data-action="reload">Réessayer</button></div></div>`;
    return;
  }
  backend.onAuth((user) => { enter(user); });
})();
