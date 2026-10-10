// Kids & Co (Famille & partage) — agenda, messages et pense-bête partagés par la famille.
// Un seul code pour la tablette de la cuisine, les PC et les téléphones (Android / iOS).
// Les données passent par Firebase (voir config.js) ; sans configuration, mode démo local.
import { firebaseConfig } from './config.js';
import { APP_VERSION, CHANGELOG } from './version.js';

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
// Avatars proposés pour les profils (les enfants adorent choisir le leur).
const EMOJIS = ['🦁', '🐼', '🦊', '🐱', '🐶', '🐸', '🦄', '🐙', '🐝', '🦋', '🐢', '🐬', '⭐', '🌈', '⚽', '🎮', '🎨', '🚀', '🎸', '🌸', '🍕', '🧁', '👑', '🏠'];
const isMaison = (m) => !!m && m.role === 'maison';
const isParent = (m) => !!m && m.role !== 'enfant' && m.role !== 'maison';
// Âge et règle des moins de 13 ans : lecture seule partout sauf messages et missions.
function ageOf(m) {
  if (!m?.birthDate) return null;
  const b = parseYmd(m.birthDate), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
const isYoung = (m) => !!m && !isMaison(m) && ageOf(m) !== null && ageOf(m) < 13;
const roleLabel = (m) => (isMaison(m) ? 'Maison' : isParent(m) ? 'Parent' : 'Enfant');
const fullName = (m) => [m.name, m.lastName].filter(Boolean).join(' ');
// Photos de profil : petites images JPEG (data URL) enregistrées avec le profil.
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const cssId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '');
const hasPhoto = (m) => !!(m && m.photo && PHOTO_RE.test(m.photo));
const faceText = (m) => (hasPhoto(m) ? '' : esc(m.emoji || (isMaison(m) ? '🏠' : initial(m.name))));
const faceClass = (m) => (hasPhoto(m) ? ` photo ph-${cssId(m.id)}` : m.emoji || isMaison(m) ? ' emo' : '');
const REPEATS = {
  none: 'Jamais (une seule fois)', daily: 'Tous les jours', weekdays: 'Du lundi au vendredi', weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines', monthly: 'Chaque mois', yearly: 'Chaque année',
};
const IMPORTANCE = [
  { v: 0, label: 'Normal', short: '' },
  { v: 1, label: '❗ Important', short: '❗ Important' },
  { v: 2, label: '🔴 Urgent', short: '🔴 Urgent' },
];
const ALERT_OFFSETS = [
  [0, 'À l’heure prévue'], [5, '5 min avant'], [15, '15 min avant'], [30, '30 min avant'], [60, '1 h avant'],
  [120, '2 h avant'], [1440, 'La veille (même heure)'], [2880, '2 jours avant'], ['custom', 'Date et heure précises…'],
];
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8S10.5 3 7.5 3.5 6 8 12 8zm0 0s1.5-5 4.5-4.5S18 8 12 8z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
  verif: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5v-2"/><path d="M8 7h7M8 11h5"/></svg>',
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
      // Comme Firestore (merge) : les sous-objets sont fusionnés, pas remplacés.
      const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a?.[k] && typeof a[k] === 'object' ? merge(a[k], v) : v; return o; };
      if (i >= 0) arr[i] = merge(arr[i], data); else arr.push({ id, ...data });
      write(col, arr);
    },
    async get(col, id) { return read(col).find((x) => x.id === id) || null; },
    async update(col, id, data) { write(col, read(col).map((x) => (x.id === id ? { ...x, ...data } : x))); },
    async arrayAdd(col, id, field, value) {
      write(col, read(col).map((x) => (x.id === id && !(x[field] || []).includes(value) ? { ...x, [field]: [...(x[field] || []), value] } : x)));
    },
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
    async get(c, id) { const d = await F.getDoc(ref(c, id)); return d.exists() ? { id: d.id, ...d.data() } : null; },
    update: (c, id, data) => F.updateDoc(ref(c, id), data),
    arrayAdd: (c, id, field, value) => F.updateDoc(ref(c, id), { [field]: F.arrayUnion(value) }),
    remove: (c, id) => F.deleteDoc(ref(c, id)),
  };
}

let backend;
// Les écritures ne bloquent jamais l'écran : hors ligne, Firebase les garde et les envoie plus tard.
const save = (p) => Promise.resolve(p).catch((e) => { console.error(e); toast('Enregistrement impossible : ' + (e.code || e.message), true); });

/* ================= État ================= */
const state = {
  user: null, me: null, family: null,
  members: [], events: [], messages: [], notes: [], cours: [], edtNotes: [], edtConfig: {}, absences: [], presence: [], missions: [], push: [], photos: [], polls: [], wishes: [], activity: [],
  view: 'accueil',
  month: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  selected: todayStr(),
  noteImportant: false,
  showDone: false,
  loadedMessages: false,
};
let unsubs = [];
const stopSubs = () => { unsubs.forEach((u) => u && u()); unsubs = []; };

const member = (id) => state.members.find((m) => m.id === id) || { id, name: 'Ancien membre', color: '#999' };
const profileKey = () => 'kc-profile:' + (state.family?.id || '');

/* Présence : chaque appareil signale régulièrement qui l'utilise, pour savoir qui est connecté. */
const deviceId = (() => { let id = ls.get('kc-device'); if (!id) { id = 'd' + newCode().toLowerCase(); ls.set('kc-device', id); } return id; })();
function deviceKind() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return 'tablette';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'telephone';
  return 'ordinateur';
}
const DEVICES = { telephone: '📱 Téléphone', tablette: '📲 Tablette', ordinateur: '💻 Ordinateur' };
const ONLINE_MS = 4 * 60000;
function beat(active = true) {
  if (!state.family || !state.membersLoaded || !backend) return;
  save(backend.set('presence', deviceId, {
    memberId: state.me?.id || '', active: active && !!state.me && !document.hidden,
    kind: isMaison(state.me) ? 'tablette' : deviceKind(), lastSeen: Date.now(),
  }));
}
function presenceOf(memberId) {
  const docs = state.presence.filter((p) => p.memberId === memberId);
  const online = docs.filter((p) => p.active && Date.now() - p.lastSeen < ONLINE_MS);
  return { online: online.length > 0, kinds: [...new Set(online.map((p) => p.kind))], last: Math.max(0, ...docs.map((p) => p.lastSeen || 0)) };
}
function ago(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  if (h < 48) return 'hier';
  return 'le ' + new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
const presenceText = (pr) => (pr.online ? `🟢 En ligne · ${pr.kinds.map((k) => DEVICES[k] || k).join(' + ')}` : pr.last ? `Vu ${ago(pr.last)}` : 'Pas encore connecté');
let onlineBefore = null;
function onPresence(list) {
  state.presence = list;
  const now = new Set(state.members.filter((m) => presenceOf(m.id).online).map((m) => m.id));
  if (onlineBefore && state.me) {
    for (const id of now) if (!onlineBefore.has(id) && id !== state.me.id) toast(`🟢 ${member(id).name} vient de se connecter`);
  }
  onlineBefore = now;
  if (state.me) refresh();
  else if (state.membersLoaded && !$('#modal-root').innerHTML && $('#welcome-form[data-linked="1"]')) renderWho();
}
setInterval(() => { if (!document.hidden) beat(); }, 90000);
addEventListener('pagehide', () => beat(false));
document.addEventListener('visibilitychange', () => beat(!document.hidden));
// Les « vu il y a… » de l'accueil se mettent à jour chaque minute.
setInterval(() => { if (state.me && state.view === 'accueil' && !$('#modal-root').innerHTML) refresh(); }, 60000);

/* Mini carte d'identité (rangée « Qui est connecté ? » et barre latérale) */
function miniCard(m, { action = 'show-card' } = {}) {
  const pr = presenceOf(m.id);
  return `<button class="mini-id ${pr.online ? 'online' : ''} ${isMaison(m) ? 'maison' : ''}" data-action="${action}" data-id="${esc(m.id)}" style="--c:${esc(m.color)}">
    <span class="mini-top"><img src="logo.png" alt=""><b>KIDS &amp; CO</b><span class="status-dot" title="${pr.online ? 'En ligne' : 'Hors ligne'}"></span></span>
    <span class="mini-body"><span class="idcard-photo${faceClass(m)}" style="--c:${esc(m.color)}">${faceText(m)}</span>
      <span class="mini-info"><b>${esc(isMaison(m) ? 'Maison' : fullName(m))}</b><small>${roleLabel(m)}</small>
        <span class="mini-status">${esc(presenceText(pr))}</span>${placeOf(m.id) ? `<span class="mini-place">${esc(placeOf(m.id))}</span>` : ''}</span></span>
  </button>`;
}
// Dernier « Bien arrivé » du jour (affiché sur la mini carte).
function placeOf(memberId) {
  const t = todayStr();
  const best = state.presence.filter((p) => p.memberId === memberId && p.placeAt && ymd(new Date(p.placeAt)) === t).sort((a, b) => b.placeAt - a.placeAt)[0];
  return best ? `📍 ${best.place} · ${fmtTime(best.placeAt)}` : '';
}
function presenceStrip() {
  if (!state.members.length) return '';
  const rank = (m) => (m.id === state.me.id ? 0 : presenceOf(m.id).online ? 1 : 2);
  const list = state.members.slice().sort((a, b) => rank(a) - rank(b) || presenceOf(b.id).last - presenceOf(a.id).last);
  const n = state.members.filter((m) => presenceOf(m.id).online).length;
  return `<section class="presence"><div class="presence-head"><h2>Qui est connecté ?</h2><span class="online-count">${n} en ligne</span></div>
    <div class="presence-row">${list.map((m) => miniCard(m)).join('')}</div></section>`;
}

/* Messagerie : chaque message a un expéditeur et des destinataires (to = null : toute la famille). */
const msgFrom = (m) => m.from || m.author;
const msgTo = (m) => (Array.isArray(m.to) && m.to.length ? m.to : null);
const isForMe = (m) => !!state.me && msgFrom(m) !== state.me.id && (!msgTo(m) || msgTo(m).includes(state.me.id));
const isHidden = (m) => (m.hiddenFor || []).includes(state.me?.id);
const isUnread = (m) => !(m.readBy || []).includes(state.me?.id);
const inbox = () => state.messages.filter((m) => isForMe(m) && !isHidden(m)).reverse();
const outbox = () => state.messages.filter((m) => state.me && msgFrom(m) === state.me.id && !isHidden(m)).reverse();
const unreadCount = () => (state.me ? inbox().filter(isUnread).length : 0);
const toLabel = (m) => (msgTo(m) ? msgTo(m).map((id) => member(id).name).join(', ') : 'Toute la famille');
function fmtWhen(ts) {
  const d = new Date(ts), t = todayStr();
  if (ymd(d) === t) return fmtTime(ts);
  if (ymd(d) === ymd(addDays(new Date(), -1))) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ================= Agenda : occurrences ================= */
// Renvoie les dates (AAAA-MM-JJ) où l'événement a lieu entre `from` et `to` inclus.
function occurrences(ev, from, to) {
  if (!ev.date) return [];
  const rep = ev.repeat || 'none';
  if (ev.until && ev.until < to) to = ev.until; // « Jusqu'au »
  if (rep === 'none') return ev.date >= from && ev.date <= to ? [ev.date] : [];
  if (to < from) return [];
  const start = parseYmd(ev.date), f = parseYmd(from), t = parseYmd(to), out = [];
  if (start > t) return out;
  if (rep === 'daily' || rep === 'weekdays') {
    for (let d = start < f ? new Date(f) : new Date(start); d <= t; d = addDays(d, 1)) {
      if (rep === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6)) continue;
      out.push(ymd(d));
    }
    return out;
  }
  if (rep === 'weekly' || rep === 'biweekly') {
    const step = rep === 'weekly' ? 7 : 14;
    let d = new Date(start);
    if (d < f) d = addDays(d, Math.floor(Math.round((f - d) / 864e5) / step) * step);
    for (; d <= t; d = addDays(d, step)) if (d >= f) out.push(ymd(d));
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
const avatar = (m) => `<span class="avatar${faceClass(m)}" style="--c:${esc(m.color)}" title="${esc(fullName(m))}">${faceText(m)}</span>`;
// Une seule règle CSS par photo, plutôt que de répéter l'image dans chaque avatar.
function updatePhotoCss() {
  let el = document.getElementById('photo-css');
  if (!el) { el = document.createElement('style'); el.id = 'photo-css'; document.head.append(el); }
  el.textContent = state.members.filter(hasPhoto).map((m) => `.ph-${cssId(m.id)}{background-image:url("${m.photo}")}`).join('\n');
}
// Recadre la photo en carré et la réduit (≈ 25 Ko) pour qu'elle se synchronise vite.
function readPhoto(file, size = 320) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}
const avatars = (ids) => (ids && ids.length ? `<span class="avatars">${ids.map((id) => avatar(member(id))).join('')}</span>` : '');
const colorPicker = (current) => `<div class="colors">${COLORS.map((c) =>
  `<button type="button" class="color-dot ${c === current ? 'on' : ''}" style="--c:${c}" data-action="pick-color" data-color="${c}" aria-label="Couleur"></button>`).join('')}</div>`;

function evItem(ev, withDate) {
  const meta = [CATEGORIES[ev.category] || '', withDate ? fmtLong(parseYmd(withDate)) : '', ev.repeat && ev.repeat !== 'none' ? '🔁' : '',
    ev.alert?.on ? '🔔' : '', ev.verify ? '📌 À vérifier' : '', ev.notes ? '📝' : '', ev.images?.length ? `🖼️ ${ev.images.length}` : ''].filter(Boolean).join(' · ');
  const imp = IMPORTANCE[ev.importance || 0];
  return `<button class="ev imp${ev.importance || 0}" style="--c:${esc(evColor(ev))}" data-action="edit-event" data-id="${esc(ev.id)}">
    <span class="ev-time">${ev.allDay || !ev.time ? '<span class="ev-allday">Journée</span>' : `${esc(ev.time)}${ev.end ? `<small>${esc(ev.end)}</small>` : ''}`}</span>
    <span class="ev-body"><span class="ev-title">${imp.short ? `<span class="imp-tag">${imp.short}</span>` : ''}${esc(ev.title)}</span>${meta ? `<div class="ev-meta">${esc(meta)}</div>` : ''}</span>
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
    ${backend.mode === 'cloud' ? '<button type="button" class="link" data-action="welcome-back">← Retour à l’accueil (prénom + code)</button><br>' : ''}
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

// Première connexion d'un appareil (mode synchronisé) : créer la famille ou la rejoindre.
function renderFamilySetup() {
  $('#app').innerHTML = `<div class="auth"><form class="card" id="setup-form" data-choice="create">
    <div class="auth-logo"><img src="logo.png" alt=""><div><h1>Bienvenue !</h1><div class="muted">Reliez cet appareil à votre famille</div></div></div>
    <div class="seg"><button type="button" class="on" data-action="setup-choice" data-choice="create">Créer notre famille</button>
      <button type="button" data-action="setup-choice" data-choice="join">Rejoindre</button></div>
    <label class="field" id="f-family"><span>Nom de la famille</span><input type="text" name="family" placeholder="Famille Martin" maxlength="40"></label>
    <label class="field hidden" id="f-code"><span>Code d’invitation (Réglages, sur un appareil déjà installé)</span><input type="text" name="code" placeholder="ABCD2345" maxlength="8" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.15em"></label>
    <div class="error"></div>
    <button class="btn btn-primary" style="width:100%">Continuer</button>
    <button type="button" class="link" data-action="logout">Changer de compte</button>
  </form></div>`;
}

async function submitSetup(form) {
  const fd = new FormData(form), uid = state.user.uid;
  const errEl = form.querySelector('.error'), btn = form.querySelector('.btn-primary');
  btn.disabled = true; errEl.textContent = '';
  try {
    let familyId;
    if (form.dataset.choice === 'join') {
      familyId = String(fd.get('code') || '').trim().toUpperCase();
      if (familyId.length !== 8) throw new Error('Le code fait 8 caractères.');
      try { await backend.joinFamily(uid, familyId); } catch { throw new Error('Code introuvable. Vérifiez-le dans Réglages sur un appareil déjà connecté.'); }
    } else {
      familyId = await backend.createFamily(uid, String(fd.get('family') || '').trim() || 'Notre famille');
    }
    await backend.saveProfile(uid, { familyId });
    await enter(state.user);
  } catch (e) {
    errEl.textContent = e.message; btn.disabled = false;
  }
}

/* ================= Profils : « Qui est là ? » ================= */
// Chaque membre (parent ou enfant) a son profil, protégé par un code secret à 4 chiffres facultatif.
// L'appareil se souvient du dernier profil utilisé.
async function hashPin(pin, memberId) {
  const data = new TextEncoder().encode(`kidsandco:${state.family.id}:${memberId}:${pin}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ================= Page d'accueil : prénom + code secret ================= */
// À l'ouverture : chacun tape son prénom et son code secret (ou touche sa photo).
// Sur un nouveau téléphone / PC, on ajoute une fois le code famille (affiché dans Réglages).
function welcomeHtml({ linked, people = [], remember = true }) {
  const cloud = backend.mode === 'cloud';
  return `<div class="auth welcome-screen"><div class="card welcome-card">
    <div class="welcome-head"><img src="logo.png" alt="">
      <div class="eyebrow">${linked ? esc(state.family.name) : 'Famille &amp; partage'}</div>
      <h1>Bienvenue sur Kids&nbsp;&amp;&nbsp;Co</h1>
      <p class="muted">${linked ? 'Entrez votre prénom et votre code secret.' : 'Pour connecter ce téléphone ou ce PC à votre famille : code famille, prénom et code secret.'}</p></div>
    <form id="welcome-form" data-linked="${linked ? 1 : ''}" autocomplete="off">
      ${linked ? '' : `<label class="field"><span>Code famille</span><input type="text" id="w-family" name="family" maxlength="8" autocapitalize="characters" spellcheck="false" placeholder="ABCD2345" class="code-input">
        <small class="muted">Il s’affiche dans Réglages → La famille, sur un appareil déjà connecté.</small></label>`}
      <label class="field"><span>Prénom</span><input type="text" id="w-name" name="firstname" maxlength="40" placeholder="Ex. Julie" autocomplete="given-name"></label>
      <label class="field"><span>Code secret</span><span class="pin-wrap"><input type="password" id="w-code" name="pin" inputmode="numeric" maxlength="4" placeholder="••••" class="pin-input" autocomplete="off">
        <button type="button" class="eye" data-action="toggle-eye" aria-label="Afficher le code">👁️</button></span></label>
      <label class="check-line"><input type="checkbox" id="w-remember" ${remember ? 'checked' : ''}> Rester connecté sur cet appareil</label>
      <div class="error" id="w-error"></div>
      <button class="btn btn-primary btn-lg" style="width:100%">Se connecter</button>
      <div class="or"><span>ou</span></div>
      <button type="button" class="btn btn-maison" data-action="login-maison"><span>🏠 Connexion Maison</span><small>la tablette de la cuisine</small></button>
    </form>
    ${people.length ? `<div class="quick-faces"><div class="small muted">Ou touchez votre photo :</div><div class="faces">
      ${people.map((m) => `<button class="face ${presenceOf(m.id).online ? 'online' : ''}" style="--c:${esc(m.color)}" data-action="pick-face" data-id="${esc(m.id)}" title="${esc(presenceText(presenceOf(m.id)))}">
        <span class="profile-avatar${hasPhoto(m) ? ` photo ph-${cssId(m.id)}` : ''}">${faceText(m)}</span><span>${esc(m.name)}</span></button>`).join('')}</div></div>` : ''}
    <div class="welcome-links">
      ${linked ? '<button class="link" data-action="forgot-pin">🔑 Code secret oublié ?</button><button class="link" data-action="add-member-start">＋ Nouveau membre</button>' : ''}
      ${cloud ? (linked ? '<button class="link" data-action="logout">Déconnecter cet appareil</button>'
        : '<button class="link" data-action="email-login">Se connecter avec l’e-mail de la famille</button><button class="link" data-action="email-signup">Nouvelle famille ? Créer notre compte</button>')
        : '<span class="small muted">Mode démo : les données restent sur cet appareil</span>'}
    </div>
    <div class="welcome-version">Version ${APP_VERSION}</div>
  </div></div>`;
}

function renderWho() {
  state.me = null;
  closeModal();
  if (!state.membersLoaded) {
    $('#app').innerHTML = '<div class="splash"><img src="logo.png" alt="" width="96" height="96"><p class="wordmark">Kids &amp; Co</p></div>';
    return;
  }
  const people = state.members.filter((m) => !isMaison(m));
  if (!people.length) return renderFirstProfile();
  // On garde ce qui est en train d'être tapé (l'écran se redessine quand quelqu'un se connecte ailleurs).
  const keep = { name: $('#w-name')?.value || '', pin: $('#w-code')?.value || '', err: $('#w-error')?.textContent || '', focus: document.activeElement?.id };
  $('#app').innerHTML = welcomeHtml({ linked: true, people, remember: ls.get('kc-ask') !== '1' });
  $('#w-name').value = keep.name; $('#w-code').value = keep.pin; $('#w-error').textContent = keep.err;
  if (keep.focus && document.getElementById(keep.focus)) document.getElementById(keep.focus).focus();
}
function renderWelcomeUnlinked() {
  state.me = null;
  $('#app').innerHTML = welcomeHtml({ linked: false });
  // Arrivé en scannant le QR code : le code famille est déjà rempli.
  const code = ls.get('kc-famille-qr');
  if (code) { $('#w-family').value = code; $('#w-name').focus(); }
}

const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
let loginTries = 0, loginLockUntil = 0;
async function createMaison() {
  const id = 'm' + newCode().toLowerCase();
  const data = { name: 'Maison', lastName: '', role: 'maison', color: '#3FB0A4', emoji: '', createdAt: Date.now() };
  save(backend.set('membres', id, data));
  const m = { id, ...data };
  if (!state.members.some((x) => x.id === id)) state.members.push(m);
  return m;
}
// Renvoie un message d'erreur, ou null si la connexion a réussi.
async function tryLogin({ name, pin, maison, remember }) {
  if (Date.now() < loginLockUntil) return 'Trop d’essais : patientez 30 secondes.';
  let cands;
  if (maison) cands = [state.members.find(isMaison) || (await createMaison())];
  else {
    const n = norm(name);
    if (!n) return 'Entrez votre prénom.';
    cands = state.members.filter((m) => norm(m.name) === n || norm(fullName(m)) === n);
    if (!cands.length && n === 'maison') cands = [state.members.find(isMaison) || (await createMaison())]; // « Maison » tapé comme prénom
    if (!cands.length) return `Personne ne s’appelle « ${name.trim()} » dans la famille. Vérifiez l’orthographe, ou demandez à un parent de créer votre compte.`;
  }
  for (const m of cands) {
    if (!m.pinHash) return loginOk(m, remember);
    if (pin && (await hashPin(pin, m.id)) === m.pinHash) return loginOk(m, remember);
  }
  if (!pin) return maison ? 'Entrez le code secret de la Maison.' : 'Entrez votre code secret.';
  if (++loginTries >= 5) { loginTries = 0; loginLockUntil = Date.now() + 30000; return 'Code incorrect. Trop d’essais : patientez 30 secondes.'; }
  return 'Code secret incorrect, réessayez.';
}
function loginOk(m, remember) {
  loginTries = 0;
  ls.set('kc-ask', remember ? '0' : '1');
  startAs(m);
  return null;
}
function welcomeError(msg) {
  const el = $('#w-error');
  if (!el) return toast(msg, true);
  el.textContent = msg;
  const card = $('.welcome-card');
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  if ($('#w-code')) $('#w-code').value = '';
}
async function submitWelcome(maison = false) {
  const f = $('#welcome-form'); if (!f) return;
  const data = { name: $('#w-name').value, pin: $('#w-code').value.trim(), remember: $('#w-remember').checked, maison };
  if (data.pin && !/^\d{4}$/.test(data.pin)) return welcomeError('Le code secret fait 4 chiffres.');
  $('#w-error').textContent = '';
  f.querySelectorAll('button').forEach((b) => (b.disabled = true));
  const e = f.dataset.linked ? await tryLogin(data) : await linkDevice($('#w-family').value, data);
  if ($('#welcome-form')) f.querySelectorAll('button').forEach((b) => (b.disabled = false));
  if (e) welcomeError(e);
}
// Nouvel appareil : on lui crée un accès invisible, puis il rejoint la famille grâce au code famille.
async function linkDevice(code, data) {
  code = String(code || '').trim().toUpperCase();
  if (code.length !== 8) return 'Le code famille fait 8 caractères (lettres et chiffres).';
  if (!data.maison && !norm(data.name)) return 'Entrez votre prénom.';
  state.joining = true;
  try {
    let user = state.user;
    if (!user) {
      const cred = await backend.signUp(`appareil-${newCode().toLowerCase()}${newCode().toLowerCase()}@kids-and-co.app`, newCode() + newCode() + newCode());
      user = { uid: cred.user.uid, email: cred.user.email };
      state.user = user;
    }
    try { await backend.joinFamily(user.uid, code); }
    catch { throw new Error('Code famille introuvable. Vérifiez-le dans Réglages → La famille, sur un appareil déjà connecté.'); }
    await backend.saveProfile(user.uid, { familyId: code });
  } catch (e) {
    state.joining = false;
    return AUTH_ERRORS[e.code] || e.message;
  }
  state.joining = false;
  state.pendingLogin = data;
  await enter(state.user);
  return null;
}

function renderFirstProfile() {
  $('#app').innerHTML = `<div class="auth"><div class="card">
    <div class="auth-logo"><img src="logo.png" alt=""><div><h1>Bienvenue !</h1><div class="muted">Créez le premier profil : le vôtre (parent).<br>Vous ajouterez ensuite votre conjoint(e) et les enfants.</div></div></div>
    <button class="btn btn-primary" style="width:100%" data-action="first-profile">Créer mon profil</button>
  </div></div>`;
}

function startAs(m, { quiet = false } = {}) {
  state.me = m;
  ls.set(profileKey(), m.id);
  state.view = 'accueil';
  state.box = 'in';
  closeModal();
  if (isMaison(m) && ls.get('maison-tablet') !== '1') {
    // Le compte Maison, c'est la tablette de la cuisine : écran allumé, retour à l'accueil.
    ls.set('maison-tablet', '1'); applyTablet();
    if (!quiet) toast('Mode tablette de la maison activé 🏠');
  }
  loadHolidays();
  if (state.pendingView && NAV.some((n) => n[0] === state.pendingView)) { state.view = state.pendingView; state.pendingView = null; }
  renderShell();
  resetIdle();
  beat();
  syncPush();
  setTimeout(showNewsIfUpdated, 900);
  if (!quiet) toast(`Bonjour ${m.name} ${hasPhoto(m) ? '👋' : m.emoji || '👋'}`);
  else if (lockCfg().on) showLock(); // réouverture de l'appli : on demande le code / l'empreinte
}

function switchUser() {
  ls.del(profileKey());
  renderWho();
  beat(false);
}

/* Pavé numérique pour le code secret */
let pin = null; // { purpose: 'login' | 'parent', member, digits, tries, onOk }
function openPin(opts) {
  pin = { digits: '', tries: 0, ...opts };
  const m = pin.member;
  const title = pin.purpose === 'parent' ? 'Code d’un parent' : `Bonjour ${esc(m.name)} !`;
  const sub = pin.purpose === 'parent' ? 'Seul un parent peut ajouter un membre.' : 'Tape ton code secret';
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal pin-modal" id="pin-modal">
    ${m ? `<span class="profile-avatar sm${hasPhoto(m) ? ` photo ph-${cssId(m.id)}` : ''}" style="--c:${esc(m.color)}">${faceText(m)}</span>` : `<span class="profile-avatar sm" style="--c:#22476B">🔒</span>`}
    <h2>${title}</h2><p class="muted" id="pin-sub">${sub}</p>
    <div class="pin-dots" id="pin-dots">${'<span class="pin-dot"></span>'.repeat(4)}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button class="key" data-action="pin-key" data-k="${k}">${k}</button>`).join('')}
      <button class="key ghost" data-action="close-modal-btn">Annuler</button><button class="key" data-action="pin-key" data-k="0">0</button>
      <button class="key ghost" data-action="pin-key" data-k="del" aria-label="Effacer">⌫</button></div>
  </div></div>`;
}
async function pinKey(k) {
  if (!pin || pin.busy) return;
  if (pin.lockedUntil && Date.now() < pin.lockedUntil) return;
  if (k === 'del') pin.digits = pin.digits.slice(0, -1);
  else if (pin.digits.length < 4) pin.digits += k;
  $('#pin-dots').querySelectorAll('.pin-dot').forEach((d, i) => d.classList.toggle('on', i < pin.digits.length));
  if (pin.digits.length < 4) return;
  pin.busy = true;
  const candidates = pin.purpose === 'parent' ? state.members.filter((m) => isParent(m) && m.pinHash) : [pin.member];
  let ok = false;
  for (const m of candidates) if ((await hashPin(pin.digits, m.id)) === m.pinHash) ok = true;
  pin.busy = false;
  if (ok) { const done = pin.onOk; pin = null; closeModal(); done(); return; }
  pin.tries++; pin.digits = '';
  const box = $('#pin-modal');
  box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
  $('#pin-dots').querySelectorAll('.pin-dot').forEach((d) => d.classList.remove('on'));
  if (pin.tries >= 5) {
    pin.lockedUntil = Date.now() + 30000; pin.tries = 0;
    $('#pin-sub').textContent = 'Trop d’essais : attends 30 secondes.';
    setTimeout(() => { if (pin) $('#pin-sub').textContent = 'Tape ton code secret'; }, 30000);
  } else $('#pin-sub').textContent = 'Ce n’est pas le bon code, réessaie.';
}

/* Fiche d'un membre (création ou modification) */
let memberPhoto; // undefined : inchangée, null : retirée, sinon nouvelle photo (data URL)
function openMemberModal(m, { first = false, role } = {}) {
  const isNew = !m || !m.id;
  const meParent = first || isParent(state.me);
  m = m || { name: '', lastName: '', role: first ? 'parent' : role || 'enfant', color: COLORS[state.members.length % COLORS.length], emoji: '' };
  memberPhoto = undefined;
  const r = isMaison(m) ? 'maison' : isParent(m) ? 'parent' : 'enfant';
  const maisonTaken = state.members.some((x) => isMaison(x) && x.id !== m.id);
  const canRole = meParent && !first;
  const roleBtn = (v, label) => `<button type="button" class="${r === v ? 'on' : ''}" data-action="member-role" data-role="${v}">${label}</button>`;
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="member-form"
      data-id="${esc(m.id || '')}" data-color="${esc(m.color)}" data-emoji="${esc(m.emoji || '')}" data-role="${r}" data-first="${first ? 1 : ''}" data-new="${isNew ? 1 : ''}">
    <h2 style="margin-bottom:16px">${first ? 'Créer mon compte' : isNew ? 'Nouveau compte' : 'Modifier le compte'}</h2>
    ${canRole ? `<div class="field"><span>Type de compte</span><div class="seg" style="margin:0">
      ${roleBtn('parent', 'Parent')}${roleBtn('enfant', 'Enfant')}${maisonTaken ? '' : roleBtn('maison', '🏠 Maison')}</div></div>` : ''}
    <p class="small muted maison-hint ${r === 'maison' ? '' : 'hidden'}" style="margin:-6px 0 14px">Le compte <b>Maison</b> est celui de la tablette de la cuisine : il affiche l’agenda de la famille et reçoit les messages adressés à la maison.</p>
    <div class="photo-pick">
      <span class="photo-preview${hasPhoto(m) ? ` photo ph-${cssId(m.id)}` : ''}" id="photo-preview" style="--c:${esc(m.color)}">${faceText(m)}</span>
      <div class="photo-actions">
        <label class="btn btn-primary btn-sm">📷 Prendre ou choisir une photo<input type="file" id="photo-input" accept="image/*" hidden></label>
        <button type="button" class="btn btn-sm btn-danger ${hasPhoto(m) ? '' : 'hidden'}" id="photo-remove" data-action="remove-photo">Retirer la photo</button>
        <span class="small muted">La photo apparaît sur la carte Kids &amp; Co et à côté de vos messages.</span>
      </div>
    </div>
    <div class="row">
      <label class="field"><span>Prénom</span><input type="text" name="name" value="${esc(m.name)}" maxlength="30" required></label>
      <label class="field ${r === 'maison' ? 'hidden' : ''}" id="f-lastname"><span>Nom</span><input type="text" name="lastName" value="${esc(m.lastName || '')}" maxlength="40"></label>
    </div>
    <label class="field ${r === 'maison' ? 'hidden' : ''}" id="f-birth"><span>Date de naissance${meParent ? '' : ' (modifiable par un parent)'}</span>
      <input type="date" name="birthDate" value="${esc(m.birthDate || '')}" max="${todayStr()}" ${meParent ? '' : 'disabled'}>
      <small class="muted">Moins de 13 ans : agenda, emploi du temps et pense-bête en lecture seule (messages et missions restent accessibles).</small></label>
    <label class="check-line missions-opt ${r === 'maison' ? 'hidden' : ''}"><input type="checkbox" name="missions" ${(m.missions ?? (isNew && r === 'enfant')) ? 'checked' : ''}>
      🎯 <span><b>Missions</b> <span class="small muted">— onglet ludique : des tâches à cocher chaque jour, des étoiles à gagner</span></span></label>
    <details class="more-opts"><summary>Pas de photo ? Choisir un avatar rigolo</summary>
      <div class="emojis" style="margin-top:10px">
        <button type="button" class="emoji-opt ${m.emoji ? '' : 'on'}" data-action="pick-emoji" data-emoji="" title="Initiale">Aa</button>
        ${EMOJIS.map((e) => `<button type="button" class="emoji-opt ${m.emoji === e ? 'on' : ''}" data-action="pick-emoji" data-emoji="${e}">${e}</button>`).join('')}</div></details>
    <div class="field"><span>Couleur</span>${colorPicker(m.color)}</div>
    <label class="field"><span>Code secret (4 chiffres${first ? ', conseillé pour un parent' : ', facultatif'})</span>
      <span class="pin-wrap"><input type="password" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"
        placeholder="${m.pinHash ? '•••• (laisser vide pour garder le code actuel)' : 'Ex. 2580'}"><button type="button" class="eye" data-action="toggle-eye" aria-label="Afficher le code">👁️</button></span></label>
    <label class="field"><span>Confirmer le code secret</span><span class="pin-wrap"><input type="password" name="pin2" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Retapez le même code">
      <button type="button" class="eye" data-action="toggle-eye" aria-label="Afficher le code">👁️</button></span></label>
    ${m.pinHash ? '<label class="check-line"><input type="checkbox" name="nopin"> Supprimer le code secret</label>' : ''}
    <div class="error"></div>
    <div class="modal-actions">${!isNew && meParent && m.id !== state.me?.id ? `<button type="button" class="btn btn-danger" data-action="delete-member">${ICON.trash} Retirer</button>` : ''}
      <span class="grow"></span>${first ? '' : '<button type="button" class="btn" data-action="close-modal-btn">Annuler</button>'}<button class="btn btn-primary">${isNew ? 'Créer le compte' : 'Enregistrer'}</button></div>
  </form></div>`;
  if (!isNew && hasPhoto(m)) $('#photo-preview').style.backgroundImage = `url("${m.photo}")`;
  setTimeout(() => $('#member-form [name=name]')?.focus(), 50);
}
function updatePhotoPreview() {
  const form = $('#member-form'), pv = $('#photo-preview');
  if (!form || !pv) return;
  const name = form.name.value || '?', emoji = form.dataset.emoji;
  pv.style.setProperty('--c', form.dataset.color);
  const photo = memberPhoto === undefined ? null : memberPhoto;
  const keepOld = memberPhoto === undefined && pv.style.backgroundImage;
  if (photo || keepOld) {
    if (photo) pv.style.backgroundImage = `url("${photo}")`;
    pv.classList.add('photo'); pv.textContent = '';
    $('#photo-remove').classList.remove('hidden');
  } else {
    pv.style.backgroundImage = ''; pv.className = 'photo-preview' + (emoji || form.dataset.role === 'maison' ? ' emo' : '');
    pv.textContent = emoji || (form.dataset.role === 'maison' ? '🏠' : initial(name));
    $('#photo-remove').classList.add('hidden');
  }
}

async function submitMember(form) {
  const fd = new FormData(form), errEl = form.querySelector('.error');
  const first = !!form.dataset.first, isNew = !!form.dataset.new;
  const id = form.dataset.id || 'm' + newCode().toLowerCase();
  const old = state.members.find((x) => x.id === id);
  const role = first ? 'parent' : form.dataset.role;
  const name = String(fd.get('name')).trim(), pinVal = String(fd.get('pin') || '');
  const lastName = role === 'maison' ? '' : String(fd.get('lastName') || '').trim();
  if (!name) return;
  if (pinVal && !/^\d{4}$/.test(pinVal)) { errEl.textContent = 'Le code secret doit faire exactement 4 chiffres.'; return; }
  if (pinVal && pinVal !== String(fd.get('pin2') || '')) { errEl.textContent = 'Les deux codes ne sont pas identiques. Retapez-les.'; return; }
  if (old && isParent(old) && role !== 'parent' && state.members.filter(isParent).length === 1) {
    errEl.textContent = 'Il faut garder au moins un parent dans la famille.'; return;
  }
  const data = { name, lastName, role, color: form.dataset.color, emoji: form.dataset.emoji, createdAt: old?.createdAt || Date.now(),
    missions: role !== 'maison' && !!fd.get('missions') };
  // Seul un parent fixe la date de naissance.
  if (first || isParent(state.me)) data.birthDate = role === 'maison' ? '' : String(fd.get('birthDate') || '');
  if (memberPhoto !== undefined) data.photo = memberPhoto || null;
  try {
    if (pinVal) data.pinHash = await hashPin(pinVal, id);
    else if (fd.get('nopin')) data.pinHash = null;
  } catch { errEl.textContent = 'Le code secret nécessite une connexion sécurisée (https).'; return; }
  save(backend.set('membres', id, data));
  const saved = { id, ...old, ...data };
  closeModal();
  if (state.me?.id === id) { state.me = saved; refresh(); }
  if (first) {
    if (!state.members.some(isMaison)) createMaison(); // le compte Maison existe toujours
    return openCard(saved, { welcome: true, onDone: () => startAs(saved) });
  }
  if (isNew) return openCard(saved, { welcome: true });
  toast('Compte mis à jour');
}

/* Carte d'identité Kids & Co */
const cardNumber = (m) => {
  const raw = String(m.id).replace(/[^A-Za-z0-9]/g, '').toUpperCase().padEnd(8, 'X');
  return `KC-${raw.slice(-8, -4)}-${raw.slice(-4)}`;
};
const mrz = (m) => {
  const clean = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '<');
  return `KC<${clean(isMaison(m) ? state.family.name : m.lastName || state.family.name)}<<${clean(m.name)}`.padEnd(36, '<').slice(0, 36);
};
function cardHtml(m) {
  const since = new Date(m.createdAt || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const rows = isMaison(m)
    ? [['Compte', 'Maison'], ['Famille', state.family.name], ['Appareil', 'Tablette de la cuisine'], ['En service depuis', since]]
    : [['Nom', (m.lastName || '—').toUpperCase()], ['Prénom', m.name],
      ...(m.birthDate ? [['Né(e) le', `${parseYmd(m.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${ageOf(m)} ans`]] : []),
      ['Statut', roleLabel(m)], ['Famille', state.family.name], ...(m.birthDate ? [] : [['Membre depuis', since]])];
  return `<div class="idcard ${isMaison(m) ? 'maison' : ''}" style="--c:${esc(m.color)}">
    <div class="idcard-top"><img src="logo.png" alt=""><div><b>KIDS &amp; CO</b><small>${isMaison(m) ? 'Carte de la maison' : 'Carte de membre'} · Famille &amp; partage</small></div><span class="idcard-chip"></span></div>
    <div class="idcard-body">
      <span class="idcard-photo${faceClass(m)}" style="--c:${esc(m.color)}">${faceText(m)}</span>
      <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </div>
    <div class="idcard-foot"><span class="idcard-num">N° ${cardNumber(m)}</span><span class="mrz">${esc(mrz(m))}</span></div>
  </div>`;
}
function openCard(m, { welcome = false, onDone } = {}) {
  const canEdit = state.me && (isParent(state.me) || state.me.id === m.id);
  cardDone = onDone || null;
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal card-modal">
    ${welcome ? `<div class="eyebrow">Compte créé 🎉</div><h2>${isMaison(m) ? 'Voici la carte de la maison' : `Bienvenue ${esc(m.name)} !`}</h2>
      <p class="muted" style="margin:6px 0 18px">${isMaison(m) ? 'La tablette de la cuisine fait maintenant partie de la famille.' : 'Voici ta carte d’identité Kids &amp; Co.'}</p>` : ''}
    ${cardHtml(m)}
    ${welcome ? '' : `<p class="card-presence ${presenceOf(m.id).online ? 'online' : ''}">${esc(presenceText(presenceOf(m.id)))}</p>`}
    <div class="modal-actions" style="margin-top:18px">${!welcome && canEdit ? `<button class="btn" data-action="edit-member" data-id="${esc(m.id)}">Modifier</button>` : ''}
      <span class="grow"></span><button class="btn btn-primary" data-action="card-done">${welcome ? 'Continuer' : 'Fermer'}</button></div>
  </div></div>`;
}
let cardDone = null;

/* ================= Démarrage ================= */
async function enter(user) {
  if (state.joining) { state.user = user; return; } // connexion d'un nouvel appareil en cours
  if (user && user.uid === state.reauthUid && state.family) { state.user = user; return; } // simple vérification « code oublié »
  stopSubs();
  state.user = user;
  state.me = null;
  if (!user) return backend.mode === 'cloud' ? renderWelcomeUnlinked() : renderLogin();
  let family;
  try {
    const profile = backend.mode === 'demo' ? { familyId: 'DEMO' } : await backend.getProfile(user.uid);
    family = profile?.familyId ? await backend.getFamily(profile.familyId) : null;
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="auth"><div class="card"><h1>Connexion impossible</h1><p class="muted">${esc(e.code || e.message)}</p>
      <p class="small muted">Vérifiez votre connexion internet et que les règles Firestore (firestore.rules) sont bien publiées.</p>
      <button class="btn btn-primary" data-action="reload">Réessayer</button> <button class="btn" data-action="logout">Se déconnecter</button></div></div>`;
    return;
  }
  if (!family) return /^appareil-/.test(user.email || '') ? renderWelcomeUnlinked() : renderFamilySetup();

  state.family = family;
  state.loadedMessages = false;
  state.membersLoaded = false;
  state.edtNotesLoaded = false;
  doneBefore = null;
  stickersBefore = null;
  onlineBefore = null;
  state.autoLogin = ls.get('kc-ask') !== '1';
  backend.setFamily(family.id);
  renderWho();
  unsubs.push(
    backend.subscribe('membres', onMembers),
    backend.subscribe('events', onEvents),
    backend.subscribe('notes', (list) => { state.notes = list; refresh(); }),
    backend.subscribe('messages', onMessages, { limit: 300 }),
    backend.subscribe('cours', (list) => { state.cours = list; refresh(); }),
    backend.subscribe('edtNotes', onEdtNotes),
    backend.subscribe('absences', (list) => { state.absences = list; refresh(); }),
    backend.subscribe('edtConfig', (list) => { state.edtConfig = list.find((x) => x.id === 'main') || {}; refresh(); }),
    backend.subscribe('presence', onPresence),
    backend.subscribe('missions', onMissions),
    backend.subscribe('push', (list) => { state.push = list; }),
    backend.subscribe('photos', (list) => { state.photos = list.sort((a, b) => b.ts - a.ts); refresh(); }, { limit: 300 }),
    backend.subscribe('polls', onPolls),
    backend.subscribe('activity', (list) => { state.activity = list.sort((a, b) => b.ts - a.ts).slice(0, 80); refresh(); }, { limit: 80 }),
    backend.subscribe('wishes', (list) => { state.wishes = list.sort((a, b) => (b.prio ? 1 : 0) - (a.prio ? 1 : 0) || b.ts - a.ts); refresh(); }),
  );
}

function onMembers(list) {
  const rank = (m) => (isMaison(m) ? 0 : isParent(m) ? 1 : 2);
  state.members = list.filter((m) => m.name).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  updatePhotoCss();
  const firstLoad = !state.membersLoaded;
  state.membersLoaded = true;
  if (state.me) {
    const m = state.members.find((x) => x.id === state.me.id);
    if (!m) { toast('Ce profil a été retiré de la famille.', true); return switchUser(); }
    state.me = m;
    return refresh();
  }
  if (firstLoad && state.pendingLogin) {
    const d = state.pendingLogin;
    state.pendingLogin = null;
    renderWho();
    tryLogin(d).then((e) => e && welcomeError(e));
    return;
  }
  if (firstLoad && state.autoLogin) {
    const m = state.members.find((x) => x.id === ls.get(profileKey()));
    if (m) return startAs(m, { quiet: true });
  }
  if (!$('#modal-root').innerHTML) renderWho();
}

function onMessages(list) {
  list.sort((a, b) => a.ts - b.ts);
  const prevMax = state.messages.length ? state.messages[state.messages.length - 1].ts : 0;
  const fresh = state.loadedMessages ? list.filter((m) => m.ts > prevMax && isForMe(m)) : [];
  state.messages = list;
  state.loadedMessages = true;
  for (const m of fresh) {
    const who = member(msgFrom(m)).name, what = m.subject || m.text.slice(0, 80);
    toast(`✉️ ${who} : ${what}`);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(`${who} — Kids & Co`, { body: what, icon: 'icon-192.png', tag: 'kc-msg-' + m.id }); } catch {}
    }
  }
  refresh();
}

/* ================= Coquille (navigation) ================= */
// [id, libellé, icône, libellé court (barre du bas), masqué dans la barre du bas du téléphone]
const NAV = [
  ['accueil', 'Accueil', 'home'], ['agenda', 'Agenda', 'cal'], ['verif', 'À vérifier', 'verif', 'Vérifier'],
  ['missions', 'Missions', 'target'], ['edt', 'Emploi du temps', 'book', 'Lycée'], ['messages', 'Messages', 'chat'],
  ['album', 'Album photo', 'photo', 'Album'], ['envies', 'Listes d’envies', 'gift', 'Envies'], ['important', 'Pense-bête', 'star', 'Notes'], ['reglages', 'Réglages', 'gear'],
];
const navBadges = () => ({ agenda: calNews().length, messages: unreadCount() + pollsToVote().length, verif: verifItems().filter((i) => !i.done).length, missions: missionsLeftToday() });
const navItems = () => NAV.filter((n) => n[0] !== 'missions' || canSeeMissions());
function navBtn([id, label, icon, s], short, badges) {
  return `<button class="nav-btn ${state.view === id ? 'active' : ''}" data-action="nav" data-view="${id}">
    ${ICON[icon]}<span>${short && s ? s : label}</span>${badges[id] ? `<span class="badge">${badges[id]}</span>` : ''}</button>`;
}
// Barre du bas du téléphone : 4 onglets principaux + « Plus » pour le reste.
function shortNav() {
  // Téléphone : 3 boutons seulement (Accueil, Agenda ou Missions pour un enfant, Menu) ; tout le reste est dans « Menu ».
  const all = navItems(), first = ['accueil', state.me?.missions && !isParent(state.me) ? 'missions' : 'agenda'];
  const main = first.map((id) => all.find((n) => n[0] === id)).filter(Boolean), rest = all.filter((n) => !main.includes(n));
  return { main, rest };
}
function navButtons(short = false) {
  const badges = navBadges();
  if (!short) return navItems().map((n) => navBtn(n, false, badges)).join('');
  const { main, rest } = shortNav(), restBadge = rest.reduce((t, n) => t + (badges[n[0]] || 0), 0);
  return main.map((n) => navBtn(n, true, badges)).join('')
    + `<button class="nav-btn ${rest.some((n) => n[0] === state.view) ? 'active' : ''}" data-action="nav-more">${ICON.more}<span>Menu</span>${restBadge ? `<span class="badge">${restBadge}</span>` : ''}</button>`;
}
function openNavMore() {
  const badges = navBadges(), { rest } = shortNav();
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal more-sheet"><h2 class="more-title">Menu</h2>
    <div class="more-grid">${rest.map(([id, label, icon]) => `<button class="more-item ${state.view === id ? 'on' : ''}" data-action="nav-from-more" data-view="${id}">
      ${ICON[icon]}<span>${label}</span>${badges[id] ? `<span class="badge">${badges[id]}</span>` : ''}</button>`).join('')}</div>
  </div></div>`;
}
function renderShell() {
  $('#app').innerHTML = `<div class="shell">
    <nav class="sidebar"><div class="brand"><img src="logo.png" alt=""><span class="brand-name">Kids &amp; Co</span><small id="fam-name">${esc(state.family.name)}</small></div>
      <div id="nav-side"></div>
      <div class="me-card" id="me-card"></div>
      <button class="app-version" data-action="whats-new">Version ${APP_VERSION} · Nouveautés</button></nav>
    <header class="topbar"><img src="logo.png" alt=""><div><span class="brand-name">Kids &amp; Co <button class="ver-badge" data-action="whats-new" title="Nouveautés">v${APP_VERSION}</button></span><small id="fam-name-top">${esc(state.family.name)}</small></div>
      <button class="upd-btn ${updateAvail ? 'has' : ''}" data-action="update-now" aria-label="Mettre à jour l’appli" title="Mettre à jour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>
      <button class="me-btn" data-action="nav" data-view="reglages" aria-label="Mon compte et réglages" id="me-btn"></button></header>
    <main id="main"></main>
    <nav class="tabbar" id="nav-tab"></nav>
  </div>`;
  refresh();
}

// Redessine la vue en gardant ce que l'utilisateur est en train de taper.
function refresh() {
  const main = $('#main');
  if (!main || !state.me) return;
  document.body.classList.toggle('young', isYoung(state.me));
  if (state.view === 'missions' && !canSeeMissions()) state.view = 'accueil';
  $('#nav-side').innerHTML = navButtons();
  $('#nav-tab').innerHTML = navButtons(true);
  $('#fam-name').textContent = state.family.name;
  $('#fam-name-top').textContent = state.family.name;
  $('#me-btn').innerHTML = avatar(state.me);
  $('#me-card').innerHTML = `<div class="me-label">Connecté sur cet appareil</div>${miniCard(state.me)}
    <button class="btn btn-sm" data-action="switch-user" style="width:100%">Changer d’utilisateur</button>`;
  document.title = (unreadCount() ? `(${unreadCount()}) ` : '') + 'Kids & Co';

  const kept = {};
  main.querySelectorAll('input[id],textarea[id]').forEach((el) => { kept[el.id] = el.value; });
  const active = document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : null;
  main.className = entering ? 'enter' : '';
  main.innerHTML = (backend.mode === 'demo'
    ? '<div class="demo-banner">Mode démo — les données restent sur cet appareil. Ajoutez votre configuration Firebase dans <b>config.js</b> pour synchroniser tous les appareils (voir LISEZMOI.md).</div>' : '')
    + VIEWS[state.view]();

  for (const [id, v] of Object.entries(kept)) { const el = document.getElementById(id); if (el && el.type !== 'file') el.value = v; }
  if (active) { const el = document.getElementById(active); if (el) { el.focus(); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } }
}
// L'animation d'entrée ne joue qu'au changement d'écran, pas à chaque synchronisation.
let entering = false, enterTimer = null;
function go(view) {
  state.view = view;
  entering = true; clearTimeout(enterTimer);
  enterTimer = setTimeout(() => { entering = false; $('#main')?.classList.remove('enter'); }, 800);
  refresh();
  $('#main').scrollTop = 0;
}

/* ================= Vues ================= */
const VIEWS = {
  accueil() {
    const now = new Date(), t = todayStr();
    const map = eventsByDay(t, ymd(addDays(now, 14)));
    const today = map[t] || [];
    const upcoming = Object.keys(map).filter((d) => d > t).sort().slice(0, 7);
    const important = state.notes.filter((n) => !n.done).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || b.ts - a.ts).slice(0, 7);
    const myMail = inbox().slice(0, 4), unread = inbox().filter(isUnread).length;
    const hello = now.getHours() < 5 ? 'Bonne nuit' : now.getHours() < 18 ? 'Bonjour' : 'Bonsoir';
    const dateTxt = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    // Page d'accueil en onglets : un sujet à la fois, gros boutons faciles à reconnaître (aussi pour les enfants).
    const young = isYoung(state.me), kid = young || (state.me.missions && !isParent(state.me));
    const nbMissions = canSeeMissions() && state.me.missions && !isParent(state.me)
      ? tasksOf(state.me).filter((task) => !(missionDoc(state.me.id, weekKey(now)).checks?.[t] || []).includes(task)).length : 0;
    const TABS = [
      ['jour', '☀️', 'Aujourd’hui', today.length],
      kid && canSeeMissions() ? ['missions', '🎯', 'Missions', nbMissions] : null,
      ['bientot', '📅', 'À venir', 0],
      ['notes', '⭐', 'Pense-bête', important.filter((n) => n.important).length],
      ['messages', '💬', 'Messages', unread],
      ['famille', '👨‍👩‍👧', 'Famille', 0],
    ].filter(Boolean);
    const saved = ls.get('kc-home-tab-' + state.me.id);
    const tab = TABS.some((x) => x[0] === saved) ? saved : kid && canSeeMissions() && nbMissions ? 'missions' : 'jour';
    const mailCard = `<section class="card tint-sky"><div class="card-head"><h2>Ma boîte de réception</h2><button class="btn btn-sm" data-action="nav" data-view="messages">Tout voir</button></div>
          <div class="list">${myMail.map((m) => mailItem(m, 'in', true)).join('') || '<div class="empty">Aucun message pour vous.</div>'}</div></section>`;
    const panels = {
      jour: () => `${holidayCountdown()}
        ${young ? '' : `<div class="home-actions"><button class="btn btn-primary" data-action="new-event" data-date="${t}">${ICON.plus} Rendez-vous</button></div>`}
        <div class="dash-grid">
          <section class="card tint-peach"><div class="card-head"><h2>Aujourd’hui</h2><span class="muted small">${today.length || 'Rien'} prévu${today.length > 1 ? 's' : ''}</span></div>
            <div class="list">${today.map((ev) => evItem(ev)).join('') || '<div class="empty">Journée libre ☀️</div>'}</div></section>
          ${edtDashboardCard()}</div>`,
      missions: () => `<div class="dash-grid">${missionsDashboardCard()}</div>`,
      bientot: () => `${holidayCountdown()}<div class="dash-grid"><section class="card tint-mint"><div class="card-head"><h2>Les 2 prochaines semaines</h2><button class="btn btn-sm" data-action="nav" data-view="agenda">Agenda</button></div>
          ${upcoming.map((d) => `<div class="day-group"><h3>${d === ymd(addDays(now, 1)) ? 'Demain' : esc(fmtLong(parseYmd(d)))}</h3>
            <div class="list">${map[d].map((ev) => evItem(ev)).join('')}</div></div>`).join('') || '<div class="empty">Rien dans les 2 prochaines semaines.</div>'}</section></div>`,
      notes: () => `${young ? '' : `<div class="home-actions"><button class="btn btn-primary" data-action="nav" data-view="important">${ICON.plus} Ajouter une note</button></div>`}
        <div class="dash-grid"><section class="card tint-butter"><div class="card-head"><h2>À ne pas oublier</h2><button class="btn btn-sm" data-action="nav" data-view="important">Tout voir</button></div>
          <div class="list">${important.map(noteItem).join('') || '<div class="empty">Rien à signaler.</div>'}</div></section></div>`,
      messages: () => `<div class="home-actions"><button class="btn btn-primary" data-action="compose">${ICON.chat} Écrire un message</button>
          <button class="btn btn-arrive" data-action="arrive">📍 Bien arrivé</button></div>
        <div class="dash-grid">${mailCard}${pollsDashboardCard()}</div>`,
      famille: () => `${presenceStrip()}<div class="dash-grid">${kid ? '' : missionsDashboardCard()}${albumDashboardCard()}</div>`,
    };
    return `<div class="dash-head home-head">
        <div class="hero">
          <div class="greet">${hello} ${isMaison(state.me) ? 'la famille' : esc(state.me.name)}</div>
          <div class="clock" id="clock">${clockHtml(now)}</div>
          <div class="today-label">${esc(dateTxt)}</div></div></div>
      ${calNewsBanner()}
      <nav class="home-tabs" role="tablist">${TABS.map(([id, emo, label, n]) => `<button class="home-tab ${id === tab ? 'on' : ''}" role="tab" aria-selected="${id === tab}" data-action="home-tab" data-tab="${id}">
        <span class="ht-emo">${emo}</span><span class="ht-label">${label}</span>${n ? `<span class="ht-badge">${n}</span>` : ''}</button>`).join('')}</nav>
      <div class="home-panel">${panels[tab]()}</div>`;
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
      const k = ymd(d), list = map[k] || [], hol = holidayOn(k), fer = ferieOn(k);
      return `<button class="cal-day ${d.getMonth() !== m.getMonth() ? 'out' : ''} ${k === t ? 'today' : ''} ${k === sel ? 'sel' : ''} ${hol ? 'vac' : ''} ${fer ? 'ferie' : ''}" data-action="select-day" data-date="${k}" title="${esc([fer && fer + ' (férié)', hol && hol.name].filter(Boolean).join(' · '))}">
        <span class="num">${d.getDate()}</span>${fer ? `<span class="cal-tag ferie-tag">🇫🇷 ${esc(fer)}</span>` : hol && (k === hol.from || d.getDay() === 1 || d.getDate() === 1) ? `<span class="cal-tag vac-tag">🏖️ ${esc(hol.short)}</span>` : ''}
        ${list.slice(0, 3).map((ev) => `<span class="chip imp${ev.importance || 0}" style="--c:${esc(evColor(ev))}">${ev.verify ? '📌 ' : ''}${ev.allDay || !ev.time ? '' : esc(ev.time) + ' '}${esc(ev.title)}</span>`).join('')}
        ${list.length > 3 ? `<span class="more">+${list.length - 3}</span>` : ''}
        ${list.length ? `<span class="dots">${list.slice(0, 4).map((ev) => `<span class="dot imp${ev.importance || 0}" style="--c:${esc(evColor(ev))}"></span>`).join('')}</span>` : ''}
      </button>`;
    }).join('');
    return `<div class="view-head"><div><div class="eyebrow">Le planning de la famille</div><h1>Agenda</h1></div>
        <div class="cal-nav"><button class="btn btn-icon" data-action="month" data-delta="-1" aria-label="Mois précédent">${ICON.left}</button>
          <h2>${m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
          <button class="btn btn-icon" data-action="month" data-delta="1" aria-label="Mois suivant">${ICON.right}</button>
          <button class="btn btn-sm" data-action="month" data-delta="0">Aujourd’hui</button></div>
        <div class="head-btns">${canCalNews() ? `<button class="btn" data-action="cal-news">🆕 Derniers ajouts${calNews().length ? ` <span class="badge">${calNews().length}</span>` : ''}</button>` : ''}
        <button class="btn btn-primary" data-action="new-event" data-date="${sel}">${ICON.plus} Ajouter</button></div></div>
      <div class="agenda">
        <div><div class="cal">${DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
          <div class="legend"><span><i class="lg imp1"></i>Important</span><span><i class="lg imp2"></i>Urgent</span><span>🔁 Répété</span><span>🔔 Alerte</span>
            <span><i class="lg vac"></i>Vacances zone ${esc(schoolZone())}</span><span>🇫🇷 Férié</span></div></div>
        <section class="card day-panel"><div class="card-head"><h2>${esc(fmtLong(parseYmd(sel)))}</h2>
          <button class="btn btn-icon" data-action="new-event" data-date="${sel}" aria-label="Ajouter ce jour">${ICON.plus}</button></div>
          ${dayBanner(sel)}
          <div class="list">${selEvents.map((ev) => evItem(ev)).join('') || '<div class="empty">Rien de prévu ce jour-là.</div>'}</div></section>
      </div>`;
  },

  messages() {
    const box = state.box || 'in';
    if (box === 'polls') return messagesHead() + pollsView();
    const list = box === 'out' ? outbox() : inbox();
    const n = unreadCount();
    return `${messagesHead()}
      <div class="list mail-list">${list.map((m) => mailItem(m, box)).join('')
        || `<div class="empty">${box === 'out' ? 'Vous n’avez encore envoyé aucun message.' : 'Aucun message reçu pour l’instant.'}</div>`}</div>`;
  },

  album() { return albumView(); },
  envies() { return wishesView(); },

  missions() {
    const kids = missionKids();
    let kidId = kids.some((k) => k.id === state.missionKid) ? state.missionKid : state.me.missions ? state.me.id : kids[0]?.id;
    if (!kidId) return `<div class="view-head"><div><div class="eyebrow">Pour les enfants</div><h1>🎯 Missions</h1></div></div>
      <div class="card"><p class="muted">Aucun enfant n’a encore les Missions. Activez la case « 🎯 Missions » dans sa fiche (Réglages → La famille → Modifier).</p></div>`;
    const kid = member(kidId), canPickKid = (isParent(state.me) || isMaison(state.me)) && kids.length > 0;
    const curWk = weekKey(new Date()), wk = state.missionWeek || curWk, mon = parseYmd(wk), t = todayStr();
    const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(mon, i)));
    const tasks = tasksOf(kid), doc = missionDoc(kidId, wk), stars = Object.keys(doc.stickers || {}).length;
    const sun = addDays(mon, 6), parent = isParent(state.me), canTick = canCheck(kid);
    const dayIdx = Math.min(6, Math.max(0, state.missionDay ?? (wk === curWk ? (new Date().getDay() + 6) % 7 : 0)));
    const sticker = (d, i) => {
      const s = doc.stickers?.[d];
      const rot = ((i * 37) % 30) - 15;
      return `<button class="sticker-slot ${s ? 'has' : ''} ${d === t ? 'today' : ''}" data-action="sticker-slot" data-kid="${esc(kidId)}" data-date="${d}" title="${s ? esc(STICKER[s.type]?.l || '') + ' — par ' + esc(member(s.by).name) : parent ? 'Coller une étoile' : 'Les parents collent les étoiles'}">
        <span class="slot-day">${WEEKDAYS[i]}</span>${s ? `<span class="sticker ${freshSticker(kidId, d, s) ? 'fresh' : ''}" style="--r:${rot}deg">${STICKER[s.type]?.e || '⭐'}</span>` : `<span class="slot-empty">${parent ? '＋' : ''}</span>`}</button>`;
    };
    const cell = (d, task) => {
      const on = (doc.checks?.[d] || []).includes(task), future = d > t;
      return `<button class="mcheck ${on ? 'on' : ''} ${future ? 'future' : ''} ${d === t ? 'today' : ''}" data-action="mission-check" data-kid="${esc(kidId)}" data-date="${d}" data-task="${esc(task)}"
        ${!canTick || future ? 'disabled' : ''} aria-label="${esc(task)}">${on ? '✓' : ''}</button>`;
    };
    const dayDone = (d) => tasks.filter((x) => (doc.checks?.[d] || []).includes(x)).length;
    return `<div class="view-head"><div><div class="eyebrow">${wk === curWk ? '🔄 Tout repart à zéro lundi' : 'Semaine terminée'}</div><h1>🎯 Missions</h1></div>
        <div class="cal-nav"><button class="btn btn-icon" data-action="mission-week" data-delta="-1" aria-label="Semaine précédente">${ICON.left}</button>
          <h2 class="edt-weeklabel">Du ${mon.getDate()} au ${sun.getDate()} ${sun.toLocaleDateString('fr-FR', { month: 'long' })}</h2>
          <button class="btn btn-icon" data-action="mission-week" data-delta="1" ${wk === curWk ? 'disabled' : ''} aria-label="Semaine suivante">${ICON.right}</button>
          ${wk === curWk ? '' : '<button class="btn btn-sm" data-action="mission-week" data-delta="0">Cette semaine</button>'}</div></div>
      ${canPickKid ? `<div class="kid-tabs">${kids.map((k) => `<button class="kid-tab ${k.id === kidId ? 'on' : ''}" style="--c:${esc(k.color)}" data-action="mission-kid" data-id="${esc(k.id)}">${avatar(k)} ${esc(k.name)}
          <span class="kid-stars">⭐ ${Object.keys(missionDoc(k.id, wk).stickers || {}).length}</span></button>`).join('')}</div>` : ''}
      <section class="mission-card" style="--c:${esc(kid.color)}">
        <div class="mission-top">
          <span class="idcard-photo${faceClass(kid)}" style="--c:${esc(kid.color)}">${faceText(kid)}</span>
          <div class="mission-title"><span class="mission-label">CARTE MISSION</span><b>${esc(fullName(kid))}</b>
            <span class="small">${wk === curWk ? 'Cette semaine' : 'Semaine du ' + mon.getDate() + ' ' + mon.toLocaleDateString('fr-FR', { month: 'short' })}</span></div>
          <div class="mission-score"><span>⭐</span><b>${stars}</b><small>étoile${stars > 1 ? 's' : ''}</small></div>
        </div>
        <div class="sticker-row">${days.map(sticker).join('')}</div>
        <div class="mission-grid" style="--n:7">
          <div></div>${days.map((d, i) => `<div class="mg-day ${d === t ? 'today' : ''}">${WEEKDAYS[i]}<small>${parseYmd(d).getDate()}</small></div>`).join('')}
          ${tasks.map((task) => `<div class="mg-task">${esc(task)}</div>${days.map((d) => cell(d, task)).join('')}`).join('')}
          <div class="mg-task muted small">Fait</div>${days.map((d) => `<div class="mg-count ${dayDone(d) === tasks.length ? 'full' : ''}">${dayDone(d)}/${tasks.length}</div>`).join('')}
        </div>
        <div class="mission-mobile">
          <div class="edt-daytabs">${days.map((d, i) => `<button class="${i === dayIdx ? 'on' : ''} ${d === t ? 'today' : ''}" data-action="mission-day" data-i="${i}"><b>${WEEKDAYS[i]}</b><span>${dayDone(d) === tasks.length ? '✅' : parseYmd(d).getDate()}</span></button>`).join('')}</div>
          <div class="mission-list">${tasks.map((task) => `<div class="mrow">${cell(days[dayIdx], task)}<span>${esc(task)}</span></div>`).join('')}</div>
        </div>
        <div class="mission-foot">${parent ? `<button class="btn btn-sm" data-action="manage-missions" data-id="${esc(kidId)}">⚙️ Gérer les missions de ${esc(kid.name)}</button>
            <span class="small">Touchez un jour en haut pour coller un autocollant ⭐</span>`
          : `<span class="small">${stars ? `Bravo ! Déjà ${stars} étoile${stars > 1 ? 's' : ''} cette semaine 🎉` : 'Coche tes missions chaque jour pour gagner des étoiles ⭐'}</span>`}</div>
      </section>`;
  },

  verif() {
    const all = verifItems(), f = state.verifFilter || 'todo';
    const late = all.filter((i) => !i.done && dueInfo(i).late).length, todo = all.filter((i) => !i.done).length - late, done = all.filter((i) => i.done).length;
    const list = f === 'todo' ? all.filter((i) => !i.done) : f === 'done' ? all.filter((i) => i.done) : all;
    const filt = (v, l) => `<button class="${f === v ? 'on' : ''}" data-action="verif-filter" data-v="${v}">${l}</button>`;
    return `<div class="view-head"><div><div class="eyebrow">Les choses à ne surtout pas rater</div><h1>À vérifier</h1></div>
        <button class="btn btn-primary" data-action="new-verif">${ICON.plus} Ajouter</button></div>
      <div class="view-head" style="margin-top:-8px"><div class="verif-stats">
          ${late ? `<span class="stat late"><b>${late}</b> en retard</span>` : ''}<span class="stat todo"><b>${todo}</b> à faire</span><span class="stat ok"><b>${done}</b> validée${done > 1 ? 's' : ''}</span></div>
        <div class="seg filters">${filt('todo', 'À faire')}${filt('done', 'Validées')}${filt('all', 'Tout')}</div></div>
      <div class="verif-list">${list.map(verifCard).join('')
        || `<div class="card empty-verif"><h2>${f === 'done' ? 'Rien de validé pour l’instant' : 'Tout est fait 🎉'}</h2>
          <p class="muted">Pour ajouter quelque chose ici, cochez « 📌 À vérifier » en créant un élément du planning, ou utilisez le bouton « Ajouter ».</p></div>`}</div>`;
  },

  important() {
    const open = state.notes.filter((n) => !n.done).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0) || b.ts - a.ts);
    const done = state.notes.filter((n) => n.done).sort((a, b) => (b.doneTs || 0) - (a.doneTs || 0));
    return `<div class="view-head"><div><div class="eyebrow">Ce qu’il ne faut pas oublier</div><h1>Pense-bête</h1></div></div>
      <form class="note-add" id="note-form">
        <input type="text" id="note-input" placeholder="Choses importantes, courses, à faire…" maxlength="300">
        <button type="button" class="toggle-imp ${state.noteImportant ? 'on' : ''}" data-action="toggle-imp">★ Important</button>
        <label class="btn btn-icon-txt" title="Ajouter une image">📷<input type="file" class="note-att-input" accept="image/*" multiple hidden></label>
        <button class="btn btn-primary">${ICON.plus} Ajouter</button>
        ${state.noteAtt?.length ? `<div class="att-list">${state.noteAtt.map((im) => `<span class="att-item"><img src="${esc(im.thumb)}" alt=""><button type="button" data-action="note-att-del" data-id="${esc(im.id)}" aria-label="Retirer">✕</button></span>`).join('')}</div>` : ''}
      </form>
      <div class="list">${open.map(noteItem).join('') || '<div class="empty">Rien à faire, profitez-en !</div>'}</div>
      ${done.length ? `<div class="section-title"><span>Terminé (${done.length})</span><span>
        <button class="btn btn-sm" data-action="toggle-done">${state.showDone ? 'Masquer' : 'Afficher'}</button>
        <button class="btn btn-sm btn-danger" data-action="clear-done">Tout effacer</button></span></div>
        ${state.showDone ? `<div class="list">${done.map(noteItem).join('')}</div>` : ''}` : ''}`;
  },

  edt() {
    if ((state.edtMode || 'grille') === 'grille') return timetableView();
    const cfg = edtCfg(), mon = state.edtWeek || mondayOf(new Date());
    const nDays = cfg.saturday ? 6 : 5, days = Array.from({ length: nDays }, (_, i) => addDays(mon, i));
    const wt = weekType(mon), student = state.members.find((m) => m.id === cfg.studentId);
    let minH = 8, maxH = 17;
    state.cours.forEach((c) => { minH = Math.min(minH, Math.floor(toMin(c.start) / 60)); maxH = Math.max(maxH, Math.ceil(toMin(c.end) / 60)); });
    const PPM = 1.15, height = (maxH - minH) * 60 * PPM, t = todayStr(), now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    const hourLines = Array.from({ length: maxH - minH + 1 }, (_, i) => `<div class="edt-hline" style="top:${i * 60 * PPM}px"></div>`).join('');
    const cols = days.map((d, i) => {
      const k = ymd(d), list = coursesOn(k), dayNotes = notesFor('', k);
      return `<div class="edt-col ${k === t ? 'today' : ''}">
        <div class="edt-colhead"><b>${EDT_DAYS[i]}</b><span>${d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'short' })}</span>
          <button class="edt-dayinfo ${dayNotes.length ? 'has' : ''}" data-action="open-course" data-id="" data-date="${k}" title="Infos du jour">${dayNotes.length ? '📌 ' + dayNotes.length : '＋ info'}</button></div>
        <div class="edt-colbody" style="height:${height}px" data-action="edt-slot" data-day="${i + 1}" data-minh="${minH}" data-ppm="${PPM}">
          ${hourLines}
          ${list.map((c) => {
            const top = (toMin(c.start) - minH * 60) * PPM, h = Math.max(30, (toMin(c.end) - toMin(c.start)) * PPM - 3);
            const ns = notesFor(c.id, k), abs = absenceFor(c, k), cancel = !!abs || ns.some((n) => EDT_TYPES[n.type]?.cancel);
            return `<button class="edt-block ${cancel ? 'cancel' : ''} ${ns.length || abs ? 'has-notes' : ''}" style="top:${top}px;height:${h}px;--c:${esc(c.color || '#4FB9E8')}" data-action="open-course" data-id="${esc(c.id)}" data-date="${k}">
              <b>${esc(c.subject)}</b><span>${esc(c.start)}–${esc(c.end)}${c.room ? ' · ' + esc(c.room) : ''}</span>${c.teacher && h > 62 ? `<span>${esc(c.teacher)}</span>` : ''}
              ${ns.length || abs ? `<span class="edt-badges">${abs ? '<i title="Prof absent">🚫</i>' : ''}${ns.map((n) => `<i title="${esc(EDT_TYPES[n.type]?.label || '')}">${(EDT_TYPES[n.type]?.label || '💬').split(' ')[0]}</i>`).join('')}</span>` : ''}</button>`;
          }).join('')}
          ${k === t && nowMin >= minH * 60 && nowMin <= maxH * 60 ? `<div class="edt-now" style="top:${(nowMin - minH * 60) * PPM}px"></div>` : ''}
        </div></div>`;
    }).join('');
    const sel = Math.min(state.edtDay ?? Math.max(0, Math.min(nDays - 1, (new Date().getDay() + 6) % 7)), nDays - 1);
    const selDate = ymd(days[sel]), selNotes = notesFor('', selDate), selList = coursesOn(selDate);
    const end = days[nDays - 1];
    return `${edtHead()}
      <div class="view-head" style="margin-top:-6px">
        <div class="cal-nav"><button class="btn btn-icon" data-action="edt-week" data-delta="-1" aria-label="Semaine précédente">${ICON.left}</button>
          <h2 class="edt-weeklabel">Du ${mon.getDate()} au ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'long' })}${wt ? ` <span class="week-ab">Semaine ${wt}</span>` : ''}</h2>
          <button class="btn btn-icon" data-action="edt-week" data-delta="1" aria-label="Semaine suivante">${ICON.right}</button>
          <button class="btn btn-sm" data-action="edt-week" data-delta="0">Cette semaine</button></div>
        <span class="small muted">Touchez un cours pour noter un prof absent, un contrôle…</span></div>
      ${state.cours.length ? '' : `<div class="card tint-lilac edt-empty"><h2>Créons l’emploi du temps 📚</h2><p class="muted">Ajoutez chaque cours une fois (matière, prof, salle, jour, horaires) : il se répète toutes les semaines.
        Ensuite, n’importe qui peut noter un changement pour un jour précis (prof absent, salle changée, contrôle…). Tout le monde le voit en direct.</p>
        <p class="muted small">Astuce : sur ordinateur, cliquez directement dans la grille à l’heure voulue pour ajouter un cours.</p></div>`}
      <div class="edt-grid" style="--n:${nDays}">
        <div class="edt-hours"><div class="edt-colhead"></div><div class="edt-hourbody" style="height:${height}px">${Array.from({ length: maxH - minH + 1 }, (_, i) => `<span style="top:${i * 60 * PPM}px">${minH + i}h</span>`).join('')}</div></div>
        ${cols}
      </div>
      <div class="edt-mobile">
        <div class="edt-daytabs">${days.map((d, i) => `<button class="${i === sel ? 'on' : ''} ${ymd(d) === t ? 'today' : ''}" data-action="edt-day" data-i="${i}"><b>${EDT_DAYS[i].slice(0, 3)}</b><span>${d.getDate()}</span></button>`).join('')}</div>
        <div class="list">
          ${selNotes.map((n) => edtNoteLine(n)).join('')}
          ${selList.map((c) => courseRow(c, selDate)).join('') || '<div class="empty">Pas de cours ce jour-là.</div>'}
          <div class="quick"><button class="btn btn-sm" data-action="open-course" data-id="" data-date="${selDate}">📌 Info du jour</button>
            <button class="btn btn-sm" data-action="edit-course" data-id="" data-day="${sel + 1}">${ICON.plus} Cours ce jour</button></div>
        </div>
      </div>`;
  },

  reglages() {
    const tablet = ls.get('maison-tablet') === '1';
    const theme = ls.get('maison-theme', 'auto');
    const notif = !('Notification' in window) ? 'unsupported' : Notification.permission;
    return `<div class="view-head"><div><div class="eyebrow">Profil, foyer et appareil</div><h1>Réglages</h1></div></div>
      <div class="settings">
        <section class="card"><h2 style="margin-bottom:14px">Ma carte Kids &amp; Co</h2>
          ${cardHtml(state.me)}
          <div class="small muted" style="margin-top:10px">${state.me.pinHash ? '🔒 Protégé par un code secret' : 'Sans code secret'}</div>
          <div class="quick" style="margin-top:12px"><button class="btn btn-primary btn-sm" data-action="edit-member" data-id="${esc(state.me.id)}">Modifier mon compte</button>
            <button class="btn btn-sm" data-action="switch-user">Changer d’utilisateur</button></div></section>
        ${lockCard()}
        <section class="card"><h2 style="margin-bottom:10px">La famille</h2>
          ${state.members.map((m) => `<div class="member-line"><button class="member-open" data-action="show-card" data-id="${esc(m.id)}">${avatar(m)}<div><b>${esc(fullName(m))}</b>${m.id === state.me.id ? ' <span class="muted small">(vous)</span>' : ''}
              <div class="small muted">${roleLabel(m)}${m.pinHash ? ' · 🔒' : ''} · voir la carte</div></div></button>
            ${isParent(state.me) || m.id === state.me.id ? `<button class="btn btn-sm" data-action="edit-member" data-id="${esc(m.id)}">Modifier</button>` : ''}</div>`).join('')}
          ${isParent(state.me) ? `<div class="quick" style="margin-top:10px"><button class="btn btn-sm" data-action="add-member">${ICON.plus} Ajouter un membre</button>
            ${state.members.some(isMaison) ? '' : `<button class="btn btn-sm" data-action="add-maison">🏠 Créer le compte Maison</button>`}</div>` : ''}
          <form id="family-form" style="margin-top:18px"><label class="field"><span>Nom de la famille</span>
            <input type="text" id="f-name" value="${esc(state.family.name)}" maxlength="40" ${isParent(state.me) ? '' : 'disabled'}></label></form>
          ${backend.mode === 'cloud' ? `<p class="muted small" style="margin:4px 0 0"><b>Code famille</b> — pour connecter un autre téléphone ou PC : sur la page d’accueil, entrez ce code, votre prénom et votre code secret.</p>
            <div class="invite">${esc(state.family.id)}</div>
            <button class="btn btn-sm" data-action="share-code">Partager le code</button>` : ''}
        </section>
        ${shareCard()}
        <section class="card"><h2 style="margin-bottom:6px">À propos de Kids &amp; Co</h2>
          <div class="about-version"><img src="logo.png" alt=""><div><b>Version ${APP_VERSION}</b>
            <div class="small muted">Mise à jour du ${fmtVersionDate(CHANGELOG[0].date)} · ${esc(CHANGELOG[0].title)}</div></div></div>
          <div class="quick" style="margin-top:12px"><button class="btn btn-sm btn-primary" data-action="whats-new">✨ Voir les nouveautés</button>
            <button class="btn btn-sm" data-action="check-update">Rechercher une mise à jour</button></div></section>
        <section class="card"><h2 style="margin-bottom:6px">Cet appareil</h2>
          <div class="switch-line"><div><b>Mode tablette de la maison</b><div class="small muted">Écran toujours allumé, retour à l’accueil après 2 min.</div></div>
            <button class="btn btn-sm ${tablet ? 'btn-primary' : ''}" data-action="toggle-tablet">${tablet ? 'Activé' : 'Activer'}</button></div>
          <div class="switch-line"><div><b>Demander « Qui est là ? » à chaque ouverture</b><div class="small muted">Conseillé sur la tablette de la cuisine.</div></div>
            <button class="btn btn-sm ${ls.get('kc-ask') === '1' ? 'btn-primary' : ''}" data-action="toggle-ask">${ls.get('kc-ask') === '1' ? 'Activé' : 'Activer'}</button></div>
          <div class="switch-line"><b>Thème</b><select data-action="theme">
            ${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<option value="${v}" ${theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="switch-line"><div><b>Notifications</b><div class="small muted">Messages, agenda, validations, étoiles, lycée… même quand l’appli est fermée.</div></div>
            ${notif === 'granted' ? (backend.mode === 'cloud' ? '<button class="btn btn-sm" data-action="push-test">🔔 Tester</button>' : '<span class="small muted">Activées ✅</span>') : notif === 'denied' ? '<span class="small muted">Bloquées</span>'
              : notif === 'unsupported' ? (isIOS() && !isStandalone() ? '<span class="small muted">À installer d’abord</span>' : '<span class="small muted">Non disponible</span>') : '<button class="btn btn-sm" data-action="notif">Activer</button>'}</div>
          ${notifHelp(notif)}
          <div class="switch-line"><div><b>Installer l’appli</b><div class="small muted">iPhone/iPad : Partager → « Sur l’écran d’accueil ». Android/PC : menu du navigateur → « Installer l’application ».</div></div></div>
        </section>
        ${backend.mode === 'cloud' ? `<section class="card"><h2 style="margin-bottom:6px">Connexion de l’appareil</h2>
          <p class="muted small">Cet appareil est relié à la famille via : ${esc(state.user.email)}</p>
          <button class="btn btn-danger" data-action="logout">Déconnecter cet appareil</button></section>` : ''}
      </div>`;
  },
};

function mailItem(m, box, compact = false) {
  const out = box === 'out', from = member(msgFrom(m)), to = msgTo(m);
  const unread = !out && isUnread(m);
  const face = out ? (to && to.length === 1 ? avatar(member(to[0])) : '<img class="avatar" src="logo.png" alt="">') : avatar(from);
  return `<button class="mail ${unread ? 'unread' : ''} ${compact ? 'compact' : ''}" data-action="open-mail" data-id="${esc(m.id)}">
    ${face}<span class="mail-body"><span class="mail-top"><b>${out ? 'À : ' + esc(toLabel(m)) : esc(fullName(from))}</b><span class="mail-time">${fmtWhen(m.ts)}</span></span>
      ${m.subject ? `<span class="mail-subject">${esc(m.subject)}</span>` : ''}<span class="mail-preview">${esc(m.text.slice(0, 140))}</span></span>
    ${unread ? '<span class="unread-dot" aria-label="Non lu"></span>' : ''}</button>`;
}

function openMail(m) {
  if (isForMe(m) && isUnread(m)) {
    m.readBy = [...(m.readBy || []), state.me.id];
    save(backend.arrayAdd('messages', m.id, 'readBy', state.me.id));
  }
  const from = member(msgFrom(m)), mine = msgFrom(m) === state.me.id;
  const others = (msgTo(m) || state.members.map((x) => x.id)).filter((id) => id !== state.me.id);
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal mail-modal" data-id="${esc(m.id)}">
    <div class="mail-head">${avatar(from)}<div><b>${esc(fullName(from))}</b>
      <div class="small muted">À : ${esc(toLabel(m))} · ${new Date(m.ts).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div></div></div>
    ${m.subject ? `<h2 class="mail-title">${esc(m.subject)}</h2>` : ''}
    <div class="mail-text">${esc(m.text).replace(/https:\/\/maps\.google\.com\/\?q=[0-9.,-]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">Voir sur la carte</a>`)}</div>
    <div class="modal-actions"><button class="btn btn-danger" data-action="hide-mail">${ICON.trash} Supprimer</button><span class="grow"></span>
      ${mine ? '' : `<button class="btn" data-action="reply" data-all="">Répondre</button>`}
      ${!mine && others.length > 1 ? `<button class="btn" data-action="reply" data-all="1">Répondre à tous</button>` : ''}
      <button class="btn btn-primary" data-action="close-modal-btn">Fermer</button></div>
  </div></div>`;
  refresh();
}

function openCompose({ to = [], subject = '', all = false } = {}) {
  const sel = new Set(to);
  const people = state.members.filter((x) => x.id !== state.me.id);
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="compose-form">
    <h2 style="margin-bottom:16px">Nouveau message</h2>
    <div class="field"><span>À</span><div class="who">
      <button type="button" class="who-chip rcpt-all ${all ? 'on' : ''}" style="--c:var(--btn)" data-action="rcpt-all">👨‍👩‍👧 Toute la famille</button>
      ${people.map((x) => `<button type="button" class="who-chip rcpt ${!all && sel.has(x.id) ? 'on' : ''}" style="--c:${esc(x.color)}" data-action="rcpt" data-id="${esc(x.id)}">${avatar(x)} ${esc(x.name)}</button>`).join('')}</div></div>
    <label class="field"><span>Objet (facultatif)</span><input type="text" name="subject" value="${esc(subject)}" maxlength="120" placeholder="Ex. Courses de ce soir"></label>
    <label class="field"><span>Message</span><textarea name="text" maxlength="4000" rows="6" required placeholder="Écris ton message…"></textarea></label>
    <div class="error"></div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button>
      <button class="btn btn-primary">${ICON.send} Envoyer</button></div>
  </form></div>`;
  setTimeout(() => $(sel.size || all ? '#compose-form [name=text]' : '#compose-form [name=subject]')?.focus(), 50);
}

function submitCompose(form) {
  const all = !!form.querySelector('.rcpt-all.on');
  const to = [...form.querySelectorAll('.rcpt.on')].map((b) => b.dataset.id);
  const text = form.text.value.trim(), subject = form.subject.value.trim();
  if (!all && !to.length) { form.querySelector('.error').textContent = 'Choisissez au moins un destinataire.'; return; }
  if (!text) return;
  save(backend.add('messages', { from: state.me.id, to: all ? null : to, subject, text, ts: Date.now(), readBy: [state.me.id] }));
  notify(all ? 'all' : to, { title: `✉️ ${state.me.name}${subject ? ' — ' + subject : ''}`, body: text, tag: 'msg', view: 'messages' });
  closeModal();
  toast('Message envoyé ✉️');
}

/* ================= Emploi du temps du lycée ================= */
// Vue principale : la grille fixe, comme un emploi du temps scolaire (jours en colonnes, heures en lignes).
function edtHead() {
  const cfg = edtCfg(), student = state.members.find((m) => m.id === cfg.studentId), mode = state.edtMode || 'grille';
  return `<div class="view-head"><div><div class="eyebrow">Emploi du temps${student ? ' de ' + esc(student.name) : ''}</div><h1>${esc(cfg.title)}</h1></div>
      <div class="quick"><button class="btn btn-sm" data-action="edt-settings">⚙️ Réglages</button>
        <button class="btn btn-primary" data-action="edit-course" data-id="">${ICON.plus} Cours</button></div></div>
    <div class="seg edt-modes"><button class="${mode === 'grille' ? 'on' : ''}" data-action="edt-mode" data-m="grille">📚 Emploi du temps</button>
      <button class="${mode === 'week' ? 'on' : ''}" data-action="edt-mode" data-m="week">📅 Cette semaine · infos</button></div>`;
}
function timetableView() {
  const cfg = edtCfg(), nDays = cfg.saturday ? 6 : 5;
  const usesAB = state.cours.some((c) => c.weeks === 'A' || c.weeks === 'B');
  const ab = usesAB ? state.edtAB || weekType(mondayOf(new Date())) || 'A' : 'all';
  const list = state.cours.filter((c) => ab === 'all' || !c.weeks || c.weeks === 'all' || c.weeks === ab);
  let minH = 8, maxH = 18;
  list.forEach((c) => { minH = Math.min(minH, Math.floor(toMin(c.start) / 60)); maxH = Math.max(maxH, Math.ceil(toMin(c.end) / 60)); });
  const PPM = 1.05, height = (maxH - minH) * 60 * PPM, todayIdx = (new Date().getDay() + 6) % 7;
  const lines = Array.from({ length: maxH - minH + 1 }, (_, i) => `<div class="edt-hline" style="top:${i * 60 * PPM}px"></div>`).join('')
    + Array.from({ length: maxH - minH }, (_, i) => `<div class="edt-hline half" style="top:${(i * 60 + 30) * PPM}px"></div>`).join('');
  const cols = Array.from({ length: nDays }, (_, i) => {
    const day = i + 1, items = list.filter((c) => Number(c.day) === day).sort((a, b) => toMin(a.start) - toMin(b.start));
    return `<div class="tt-col ${i === todayIdx ? 'today' : ''}"><div class="tt-head">${EDT_DAYS[i]}</div>
      <div class="edt-colbody tt-body" style="height:${height}px" data-action="edt-slot" data-day="${day}" data-minh="${minH}" data-ppm="${PPM}">${lines}
        ${items.map((c) => {
          const top = (toMin(c.start) - minH * 60) * PPM, h = Math.max(26, (toMin(c.end) - toMin(c.start)) * PPM - 3);
          const abs = absenceFor(c, ymd(addDays(mondayOf(new Date()), day - 1))); // absence cette semaine
          return `<button class="edt-block tt-block ${abs ? 'cancel' : ''}" title="${abs ? esc('Prof absent ' + absRange(abs)) : ''}" style="top:${top}px;height:${h}px;--c:${esc(c.color || '#4FB9E8')}" data-action="edit-course" data-id="${esc(c.id)}">
            <b>${esc(c.subject)}</b><span>${esc(c.start)}–${esc(c.end)}</span>${c.room ? `<span>${esc(c.room)}</span>` : ''}${c.teacher && h > 70 ? `<span>${esc(c.teacher)}</span>` : ''}
            ${c.weeks && c.weeks !== 'all' ? `<i class="tt-ab">${esc(c.weeks)}</i>` : ''}${abs ? '<i class="tt-abs">🚫</i>' : ''}</button>`;
        }).join('')}</div></div>`;
  }).join('');
  return `${edtHead()}
    ${usesAB ? `<div class="seg ab-seg">${['A', 'B'].map((w) => `<button class="${ab === w ? 'on' : ''}" data-action="edt-ab" data-w="${w}">Semaine ${w}</button>`).join('')}
      <button class="${ab === 'all' ? 'on' : ''}" data-action="edt-ab" data-w="all">Les deux</button></div>` : ''}
    ${absencesBox()}
    ${state.cours.length ? '<p class="small muted tt-tip">Touchez une case vide pour ajouter un cours à cette heure-là, ou un cours pour le modifier.</p>'
      : `<div class="card tint-lilac edt-empty"><h2>Remplissons l’emploi du temps 📚</h2><p class="muted">Touchez la grille au bon jour et à la bonne heure pour ajouter un cours (ou le bouton « + Cours »). Une matière peut avoir plusieurs jours, chacun avec ses horaires.</p></div>`}
    <div class="tt-grid" style="--n:${nDays}">
      <div class="tt-hours"><div class="tt-head"></div><div class="edt-hourbody" style="height:${height}px">${Array.from({ length: maxH - minH + 1 }, (_, i) => `<span style="top:${i * 60 * PPM}px">${minH + i}h</span>`).join('')}</div></div>
      ${cols}
    </div>`;
}

// Les cours se répètent chaque semaine (ou semaine A / B). Les « infos » sont datées :
// prof absent, cours annulé, salle changée, contrôle… Tout est partagé en direct.
const EDT_TYPES = {
  absent: { label: '🚫 Prof absent', cancel: true }, annule: { label: '❌ Cours annulé', cancel: true },
  salle: { label: '🚪 Changement de salle' }, horaire: { label: '🕐 Changement d’horaire' },
  controle: { label: '📝 Contrôle / évaluation' }, devoir: { label: '📚 Devoir à rendre' },
  sortie: { label: '🚌 Sortie / voyage scolaire' }, greve: { label: '✊ Grève / pas de cours', cancel: true },
  note: { label: '💬 Remarque' },
};
const SUBJECTS = ['Français', 'Mathématiques', 'Histoire-Géographie', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Physique-Chimie', 'SVT',
  'SES', 'Philosophie', 'EPS', 'EMC', 'SNT', 'Enseignement scientifique', 'Spécialité', 'Option', 'Vie de classe', 'Accompagnement personnalisé'];
const SUBJECT_COLORS = ['#F2896B', '#4FB9E8', '#3FB0A4', '#9B7BE0', '#F3B64C', '#E86A9A', '#6CC070', '#5C7CE0', '#C98B5A', '#1FA3A3'];
const EDT_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const edtCfg = () => ({ title: 'Lycée Max Linder', studentId: '', saturday: false, refA: '', ...state.edtConfig });
const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
function weekType(monday) {
  const ref = edtCfg().refA;
  if (!ref) return null;
  const w = Math.round((monday - parseYmd(ref)) / (7 * 864e5));
  return ((w % 2) + 2) % 2 === 0 ? 'A' : 'B';
}
function coursesOn(date) {
  const d = parseYmd(date), dow = ((d.getDay() + 6) % 7) + 1, wt = weekType(mondayOf(d));
  return state.cours.filter((c) => Number(c.day) === dow && (!c.weeks || c.weeks === 'all' || !wt || c.weeks === wt))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}
const notesFor = (courseId, date) => state.edtNotes.filter((n) => (n.courseId || '') === courseId && n.date === date).sort((a, b) => a.ts - b.ts);
const fmtShort = (date) => parseYmd(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

function edtNoteLine(n) {
  return `<div class="edt-note t-${esc(n.type)}"><b>${esc(EDT_TYPES[n.type]?.label || '💬 Remarque')}</b>${n.text ? ' : ' + esc(n.text) : ''}</div>`;
}
/* Absences de professeurs (sur une période, éventuellement « jusqu'à nouvel ordre ») */
function absenceFor(c, date) {
  return state.absences.find((a) => date >= a.from && (!a.to || date <= a.to)
    && (a.scope === 'teacher' ? c.teacher && norm(c.teacher) === a.teacherKey : a.courseId === c.id));
}
const shortDate = (d) => parseYmd(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const absRange = (a) => (!a.to ? `depuis le ${shortDate(a.from)}, jusqu’à nouvel ordre` : a.from === a.to ? `le ${shortDate(a.from)}` : `du ${shortDate(a.from)} au ${shortDate(a.to)}`);
function absenceWho(a) {
  if (a.scope === 'teacher') return a.teacher;
  const c = state.cours.find((x) => x.id === a.courseId);
  return c ? `${c.subject}${c.teacher ? ' (' + c.teacher + ')' : ''}` : 'Cours';
}
function absencesBox() {
  const t = todayStr(), list = state.absences.filter((a) => !a.to || a.to >= t).sort((a, b) => a.from.localeCompare(b.from));
  if (!list.length) return '';
  return `<div class="absences">${list.map((a) => `<div class="absence ${a.from <= t ? 'now' : ''}">
    <span class="abs-ico">🚫</span><div class="abs-body"><b>${esc(absenceWho(a))}</b> ${a.scope === 'teacher' ? 'absent(e)' : '— prof absent'}
      <div class="small">${esc(absRange(a))}${a.note ? ' · ' + esc(a.note) : ''}</div></div>
    <button class="btn btn-sm" data-action="end-absence" data-id="${esc(a.id)}">De retour</button></div>`).join('')}</div>`;
}
function openAbsence(courseId, date) {
  const c = state.cours.find((x) => x.id === courseId);
  if (!c) return;
  const from = date && date > todayStr() ? date : todayStr(), fri = ymd(addDays(mondayOf(parseYmd(from)), edtCfg().saturday ? 5 : 4));
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="absence-form" data-id="${esc(c.id)}">
    <h2 style="margin-bottom:6px">🚫 Prof absent</h2>
    <p class="muted small" style="margin:0 0 14px">${esc(c.subject)}${c.teacher ? ' — ' + esc(c.teacher) : ''}. Les cours concernés seront barrés automatiquement sur toute la période.</p>
    ${c.teacher ? `<div class="field"><span>Quels cours ?</span><div class="seg" style="margin:0">
      <button type="button" class="on" data-action="abs-scope" data-v="teacher">Tous les cours de ${esc(c.teacher)}</button>
      <button type="button" data-action="abs-scope" data-v="course">Ce cours seulement</button></div></div>` : ''}
    <div class="field"><span>Combien de temps ?</span><div class="who abs-presets">
      <button type="button" class="who-chip on" style="--c:#E2554A" data-action="abs-preset" data-from="${from}" data-to="${from}">Ce jour-là</button>
      <button type="button" class="who-chip" style="--c:#E2554A" data-action="abs-preset" data-from="${from}" data-to="${fri}">Jusqu’à la fin de la semaine</button>
      <button type="button" class="who-chip" style="--c:#E2554A" data-action="abs-preset" data-from="${from}" data-to="${ymd(addDays(parseYmd(fri), 7))}">2 semaines</button>
      <button type="button" class="who-chip" style="--c:#E2554A" data-action="abs-preset" data-from="${from}" data-to="">Jusqu’à nouvel ordre</button></div></div>
    <div class="row"><label class="field"><span>Du</span><input type="date" name="from" value="${from}" required></label>
      <label class="field"><span>Au (vide = jusqu’à nouvel ordre)</span><input type="date" name="to" value="${from}"></label></div>
    <label class="field"><span>Précision (facultatif)</span><input type="text" name="note" maxlength="120" placeholder="Ex. remplacé par une étude en CDI"></label>
    <div class="error"></div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer l’absence</button></div>
  </form></div>`;
  $('#absence-form').dataset.scope = c.teacher ? 'teacher' : 'course';
}
function submitAbsence(f) {
  const c = state.cours.find((x) => x.id === f.dataset.id), from = f.from.value, to = f.to.value, err = f.querySelector('.error');
  if (!c || !from) return;
  if (to && to < from) { err.textContent = 'La date de fin doit être après la date de début.'; return; }
  const scope = f.dataset.scope;
  const a = { scope, courseId: c.id, teacher: c.teacher || '', teacherKey: norm(c.teacher), from, to, note: f.note.value.trim(), author: state.me.id, ts: Date.now() };
  save(backend.add('absences', a));
  closeModal();
  const who = scope === 'teacher' ? c.teacher : `${c.subject}${c.teacher ? ' (' + c.teacher + ')' : ''}`;
  toast(`🚫 ${who} : absence enregistrée ${absRange(a)}`);
  notify('all', { title: `🚫 Prof absent : ${who}`, body: `${cap(absRange(a))}${a.note ? ' — ' + a.note : ''}`, tag: 'abs', view: 'edt' });
}

function courseRow(c, date) {
  const ns = notesFor(c.id, date), abs = absenceFor(c, date), cancel = !!abs || ns.some((n) => EDT_TYPES[n.type]?.cancel);
  return `<button class="edt-row ${cancel ? 'cancel' : ''}" style="--c:${esc(c.color || '#4FB9E8')}" data-action="open-course" data-id="${esc(c.id)}" data-date="${date}">
    <span class="edt-time">${esc(c.start)}<small>${esc(c.end)}</small></span>
    <span class="edt-info"><b>${esc(c.subject)}</b><span class="muted small">${[c.room && 'Salle ' + c.room, c.teacher].filter(Boolean).map(esc).join(' · ')}</span>
      ${abs ? `<div class="edt-note t-absent"><b>🚫 Prof absent</b> ${esc(absRange(abs))}${abs.note ? ' : ' + esc(abs.note) : ''}</div>` : ''}${ns.map(edtNoteLine).join('')}</span></button>`;
}
function edtDashboardCard() {
  if (!state.cours.length) return '';
  const cfg = edtCfg(), student = state.members.find((m) => m.id === cfg.studentId);
  let d = new Date(), list = [], date;
  for (let i = 0; i < 8 && !list.length; i++, d = addDays(d, 1)) { date = ymd(d); list = coursesOn(date); }
  if (!list.length) return '';
  const label = date === todayStr() ? 'Aujourd’hui' : date === ymd(addDays(new Date(), 1)) ? 'Demain' : cap(parseYmd(date).toLocaleDateString('fr-FR', { weekday: 'long' }));
  const dayNotes = notesFor('', date);
  return `<section class="card tint-lilac"><div class="card-head"><h2>📚 ${label} au lycée${student ? ` <span class="muted small" style="font-weight:700">· ${esc(student.name)}</span>` : ''}</h2>
      <button class="btn btn-sm" data-action="nav" data-view="edt">Emploi du temps</button></div>
    <div class="list">${dayNotes.map(edtNoteLine).join('')}${list.map((c) => courseRow(c, date)).join('')}</div></section>`;
}

function onEdtNotes(list) {
  const prev = new Set(state.edtNotes.map((n) => n.id));
  const fresh = state.edtNotesLoaded ? list.filter((n) => !prev.has(n.id) && n.author !== state.me?.id) : [];
  state.edtNotes = list;
  state.edtNotesLoaded = true;
  for (const n of fresh) {
    const c = state.cours.find((x) => x.id === n.courseId);
    toast(`📚 ${member(n.author).name} : ${c ? c.subject : 'Info'} (${fmtShort(n.date)}) — ${EDT_TYPES[n.type]?.label || ''}`);
  }
  const open = $('.course-modal');
  if (open) openCourse(open.dataset.id, open.dataset.date, true);
  refresh();
}

// Fiche d'un cours pour un jour donné (ou infos générales du jour si id vide) + annotations.
function openCourse(id, date, keepInput = false) {
  const c = state.cours.find((x) => x.id === id);
  const typed = keepInput ? $('#edt-note-form')?.text.value || '' : '';
  const ns = notesFor(c ? c.id : '', date);
  const d = parseYmd(date);
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal course-modal" data-id="${esc(c?.id || '')}" data-date="${date}">
    <div class="course-head" style="--c:${esc(c?.color || '#9B7BE0')}">
      <div class="eyebrow">${esc(fmtLong(d))}${c?.weeks && c.weeks !== 'all' ? ' · Semaine ' + esc(c.weeks) : ''}</div>
      <h2>${c ? esc(c.subject) : '📌 Infos du jour'}</h2>
      ${c ? `<div class="course-meta"><span>🕐 ${esc(c.start)} – ${esc(c.end)}</span>${c.room ? `<span>🚪 Salle ${esc(c.room)}</span>` : ''}${c.teacher ? `<span>👤 ${esc(c.teacher)}</span>` : ''}</div>`
        : '<div class="course-meta"><span>Sortie, grève, journée banalisée… visible par toute la famille.</span></div>'}
    </div>
    <div class="section-title" style="margin-top:18px"><span>Changements et annotations pour ce jour</span></div>
    <div class="list">${ns.map((n) => `<div class="edt-note-row t-${esc(n.type)}"><div style="flex:1"><b>${esc(EDT_TYPES[n.type]?.label || '💬 Remarque')}</b>${n.text ? `<div>${esc(n.text)}</div>` : ''}
        <div class="note-meta">${esc(member(n.author).name)} · ${fmtWhen(n.ts)}</div></div>
        <button class="del" data-action="del-edt-note" data-id="${esc(n.id)}" aria-label="Supprimer">${ICON.trash}</button></div>`).join('')
      || '<div class="empty">Rien de particulier pour l’instant.</div>'}</div>
    <form id="edt-note-form" class="edt-note-form">
      <select name="type">${Object.entries(EDT_TYPES).filter(([k]) => c || !['absent', 'salle', 'horaire'].includes(k))
        .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
      <input type="text" name="text" maxlength="200" value="${esc(typed)}" placeholder="Précision (facultatif) : salle B204, chapitre 3…">
      <button class="btn btn-primary btn-sm">${ICON.plus} Ajouter</button>
    </form>
    <div class="modal-actions">${c ? `<button class="btn" data-action="edit-course" data-id="${esc(c.id)}">✏️ Modifier le cours</button><button class="btn btn-absent" data-action="open-absence" data-id="${esc(c.id)}" data-date="${date}">🚫 Prof absent</button>` : ''}<span class="grow"></span>
      <button class="btn btn-primary" data-action="close-modal-btn">Fermer</button></div>
  </div></div>`;
}

function openCourseEdit(c, { day = 1, start = '08:00' } = {}) {
  const isNew = !c;
  const used = new Set(state.cours.map((x) => x.color));
  c = c || { subject: '', teacher: '', room: '', day, start, end: `${pad(Math.min(23, Math.floor(toMin(start) / 60) + 1))}:${start.split(':')[1]}`, weeks: 'all',
    color: SUBJECT_COLORS.find((x) => !used.has(x)) || SUBJECT_COLORS[0] };
  const cfg = edtCfg();
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="course-form" data-id="${esc(c.id || '')}" data-color="${esc(c.color)}">
    <h2 style="margin-bottom:16px">${isNew ? 'Ajouter un cours' : 'Modifier le cours'}</h2>
    <label class="field"><span>Matière</span><input type="text" name="subject" list="subjects" value="${esc(c.subject)}" maxlength="60" required placeholder="Ex. Mathématiques">
      <datalist id="subjects">${SUBJECTS.map((x) => `<option value="${x}">`).join('')}</datalist></label>
    <div class="row"><label class="field"><span>Professeur</span><input type="text" name="teacher" value="${esc(c.teacher)}" maxlength="60" placeholder="Ex. Mme Dupont"></label>
      <label class="field"><span>Salle</span><input type="text" name="room" value="${esc(c.room)}" maxlength="20" placeholder="Ex. B204"></label></div>
    <div class="field"><span>Jours et horaires</span>
      <div class="slots" id="slots">${slotLine(c, cfg)}</div>
      <button type="button" class="btn btn-sm add-slot" data-action="add-slot">${ICON.plus} Ajouter un autre jour</button>
      <small class="muted">${isNew ? 'Ajoutez tous les créneaux de cette matière dans la semaine, chacun avec ses horaires.' : 'Ajoutez d’autres jours pour cette matière : ils seront créés en plus de ce cours.'}</small></div>
    <label class="field"><span>Quelles semaines ?</span><select name="weeks">
      ${[['all', 'Toutes les semaines'], ['A', 'Semaine A seulement'], ['B', 'Semaine B seulement']].map(([v, l]) => `<option value="${v}" ${(c.weeks || 'all') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="field"><span>Couleur</span><div class="colors">${SUBJECT_COLORS.map((x) => `<button type="button" class="color-dot ${x === c.color ? 'on' : ''}" style="--c:${x}" data-action="pick-color" data-color="${x}" aria-label="Couleur"></button>`).join('')}</div></div>
    <div class="error"></div>
    ${isNew ? '' : `<button type="button" class="btn btn-absent absent-wide" data-action="open-absence" data-id="${esc(c.id)}">🚫 Prof absent… <small>(un jour, une semaine, jusqu’à nouvel ordre)</small></button>`}
    <div class="modal-actions">${isNew ? '' : `<button type="button" class="btn btn-danger" data-action="delete-course">${ICON.trash} Supprimer</button>`}<span class="grow"></span>
      <button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
  setTimeout(() => $('#course-form [name=subject]')?.focus(), 50);
}
// Une ligne « jour + début + fin » ; une matière peut avoir plusieurs créneaux dans la semaine.
function slotLine(c, cfg = edtCfg()) {
  return `<div class="slot-line">
    <select class="s-day" aria-label="Jour">${EDT_DAYS.slice(0, cfg.saturday ? 6 : 5).map((d, i) => `<option value="${i + 1}" ${Number(c.day) === i + 1 ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <input type="time" class="s-start" value="${esc(c.start)}" required aria-label="Début">
    <span class="slot-arrow">→</span>
    <input type="time" class="s-end" value="${esc(c.end)}" required aria-label="Fin">
    <button type="button" class="del" data-action="del-slot" aria-label="Retirer ce jour">${ICON.trash}</button></div>`;
}
function submitCourse(form) {
  const fd = new FormData(form), err = form.querySelector('.error');
  const base = { subject: fd.get('subject').trim(), teacher: fd.get('teacher').trim(), room: fd.get('room').trim(), weeks: fd.get('weeks'), color: form.dataset.color };
  if (!base.subject) return;
  const slots = [...form.querySelectorAll('.slot-line')].map((l) => ({ day: Number(l.querySelector('.s-day').value), start: l.querySelector('.s-start').value, end: l.querySelector('.s-end').value }));
  if (!slots.length) { err.textContent = 'Ajoutez au moins un jour.'; return; }
  const bad = slots.find((x) => !x.start || !x.end || toMin(x.end) <= toMin(x.start));
  if (bad) { err.textContent = `${EDT_DAYS[bad.day - 1]} : l’heure de fin doit être après l’heure de début.`; return; }
  const id = form.dataset.id;
  const [first, ...others] = slots;
  if (id) save(backend.update('cours', id, { ...base, ...first, editedBy: state.me.id }));
  else save(backend.add('cours', { ...base, ...first, author: state.me.id, ts: Date.now() }));
  others.forEach((x, i) => save(backend.add('cours', { ...base, ...x, author: state.me.id, ts: Date.now() + i + 1 })));
  notify('all', { title: `📚 Emploi du temps ${id ? 'modifié' : 'mis à jour'}`, body: `${base.subject} — ${slots.map((x) => `${EDT_DAYS[x.day - 1].toLowerCase()} ${x.start}`).join(', ')}`, tag: 'cours', view: 'edt' });
  closeModal();
  const n = slots.length;
  toast(id ? `Cours modifié${others.length ? ` + ${others.length} jour${others.length > 1 ? 's' : ''} ajouté${others.length > 1 ? 's' : ''}` : ''} — visible par toute la famille`
    : `${base.subject} ajouté${n > 1 ? ` sur ${n} jours` : ''} — chaque semaine`);
}

function openEdtSettings() {
  const cfg = edtCfg(), wt = weekType(mondayOf(new Date()));
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="edt-settings-form">
    <h2 style="margin-bottom:16px">Réglages de l’emploi du temps</h2>
    <label class="field"><span>Nom de l’établissement / titre</span><input type="text" name="title" value="${esc(cfg.title)}" maxlength="60" required></label>
    <label class="field"><span>Emploi du temps de</span><select name="studentId"><option value="">—</option>
      ${state.members.filter((m) => !isMaison(m)).map((m) => `<option value="${esc(m.id)}" ${cfg.studentId === m.id ? 'selected' : ''}>${esc(fullName(m))}</option>`).join('')}</select></label>
    <label class="field"><span>Semaines A / B</span><select name="ab">
      <option value="" ${!wt ? 'selected' : ''}>Pas de semaines A / B</option>
      <option value="A" ${wt === 'A' ? 'selected' : ''}>Cette semaine est une semaine A</option>
      <option value="B" ${wt === 'B' ? 'selected' : ''}>Cette semaine est une semaine B</option></select></label>
    <label class="check-line"><input type="checkbox" name="saturday" ${cfg.saturday ? 'checked' : ''}> Cours le samedi</label>
    <label class="field"><span>Zone des vacances scolaires</span><select name="zone">${['A', 'B', 'C'].map((z) => `<option value="${z}" ${schoolZone() === z ? 'selected' : ''}>Zone ${z}${z === 'A' ? ' (Bordeaux, Lyon, Grenoble…)' : z === 'B' ? ' (Lille, Rennes, Strasbourg…)' : ' (Paris, Montpellier, Toulouse…)'}</option>`).join('')}</select></label>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
}

/* ================= À vérifier (éléments très importants à valider) ================= */
// Chaque élément « À vérifier » du planning (et chaque fois, s'il se répète) se valide séparément.
// La validation est enregistrée dans l'événement : done[date] = { by, at } — visible par tous en direct.
function verifItems() {
  const today = todayStr(), from = ymd(addDays(new Date(), -60)), to = ymd(addDays(new Date(), 60)), items = [];
  for (const ev of state.events) {
    if (!ev.verify) continue;
    const occs = occurrences(ev, from, to), done = ev.done || {};
    let nextShown = false;
    for (const occ of occs) {
      if (done[occ]) items.push({ ev, occ, done: done[occ] });
      else if (occ < today) items.push({ ev, occ });                    // en retard : toujours affiché
      else if (!nextShown) { items.push({ ev, occ }); nextShown = true; } // à venir : seulement la prochaine fois
    }
  }
  const t = (i) => `${i.occ}T${i.ev.allDay || !i.ev.time ? '23:59' : i.ev.time}`;
  return items.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.done ? b.done.at - a.done.at : t(a).localeCompare(t(b))));
}
function dueInfo(i) {
  const today = todayStr(), days = Math.round((parseYmd(i.occ) - parseYmd(today)) / 864e5);
  const timePassed = i.ev.time && !i.ev.allDay && new Date(`${i.occ}T${i.ev.time}`) < new Date();
  if (days < 0) return { late: true, label: `⚠️ En retard (${days === -1 ? 'hier' : `il y a ${-days} jours`})`, cls: 'late' };
  if (days === 0) return timePassed ? { late: true, label: '⚠️ Aujourd’hui, heure passée', cls: 'late' } : { label: '⏳ Aujourd’hui', cls: 'soon' };
  if (days === 1) return { label: '⏳ Demain', cls: 'soon' };
  return { label: `Dans ${days} jours`, cls: days <= 3 ? 'soon' : 'ok' };
}
function verifCard(i) {
  const { ev, occ, done } = i, d = parseYmd(occ);
  const imp = IMPORTANCE[ev.importance || 0], due = done ? null : dueInfo(i), by = done ? member(done.by) : null;
  const dateTxt = cap(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
  const people = (ev.who && ev.who.length ? ev.who : []).map((id) => member(id));
  const al = ev.alert?.on ? ALERT_OFFSETS.find(([v]) => String(v) === String(ev.alert.offset)) : null;
  // Le coup de tampon ne s'anime qu'une fois, juste après la validation.
  const key = `${ev.id}|${occ}`, fresh = done && Date.now() - done.at < 4000 && !stamped.has(key);
  if (fresh) stamped.add(key);
  return `<div class="verif ${done ? 'done' : due.late ? 'late' : ''}" style="--c:${done ? '#2FA84F' : esc(evColor(ev))}">
    <button class="vcheck" data-action="${done ? 'verif-undo' : 'verif-done'}" data-id="${esc(ev.id)}" data-occ="${occ}" aria-label="${done ? 'Annuler la validation' : 'C’est fait'}">${done ? '✓' : ''}</button>
    <button class="vbody" data-action="edit-event" data-id="${esc(ev.id)}">
      <span class="vtitle">${imp.short ? `<span class="imp-tag">${imp.short}</span>` : ''}<span class="t">${esc(ev.title)}</span></span>
      <span class="vmeta"><span>📅 ${esc(dateTxt)}${ev.allDay || !ev.time ? '' : ' · ' + esc(ev.time)}</span>
        ${ev.alert?.on ? `<span>🔔 ${esc(ev.alert.at ? 'Rappel programmé' : 'Rappel ' + (al ? al[1].toLowerCase() : ''))}</span>` : ''}
        ${people.map((m) => `<span>${avatar(m)} ${esc(m.name)}</span>`).join('')}
        ${ev.repeat && ev.repeat !== 'none' ? '<span>🔁 Répété</span>' : ''}${ev.notes ? `<span>📝 ${esc(ev.notes.slice(0, 40))}</span>` : ''}</span>
    </button>
    ${done ? `<div class="stamp ${fresh ? 'stamp-in' : ''}">VALIDÉ<small>✓ ${new Date(done.at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} · ${esc(by.name.toUpperCase())}</small></div>` : ''}
    <div class="vright">${done
      ? `<div class="who-did">Validé par ${esc(by.name)}<br>le ${new Date(done.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${fmtTime(done.at)}</div>
         <button class="btn btn-sm" data-action="verif-undo" data-id="${esc(ev.id)}" data-occ="${occ}">Annuler</button>`
      : `<span class="due ${due.cls}">${due.label}</span><button class="btn btn-valid btn-sm" data-action="verif-done" data-id="${esc(ev.id)}" data-occ="${occ}">✓ C’est fait</button>`}</div>
  </div>`;
}
function setDone(id, occ, value) {
  const ev = state.events.find((x) => x.id === id);
  if (!ev) return;
  const done = { ...(ev.done || {}) };
  if (value) done[occ] = value; else delete done[occ];
  ev.done = done; // affichage immédiat, la synchronisation suit
  save(backend.update('events', id, { done }));
  if (value) notify('all', { title: `✅ Validé : ${ev.title}`, body: `par ${state.me.name}`, tag: 'verif-' + id, view: 'verif' });
  refresh();
}
let doneBefore = null;
const stamped = new Set();
function onEvents(list) {
  const now = new Set();
  for (const ev of list) for (const [occ, d] of Object.entries(ev.done || {})) now.add(`${ev.id}|${occ}|${d.by}`);
  if (doneBefore && state.me) {
    for (const k of now) if (!doneBefore.has(k)) {
      const [id, , by] = k.split('|'), ev = list.find((x) => x.id === id);
      if (by !== state.me.id && ev) toast(`✅ ${member(by).name} a validé « ${ev.title} »`);
    }
  }
  doneBefore = now;
  state.events = list;
  refresh();
  checkAlerts();
}

/* ================= Missions des enfants ================= */
// Chaque enfant « Missions » a une carte par semaine (du lundi au dimanche) : tâches cochées
// chaque jour et autocollants collés par les parents. Une nouvelle carte vierge chaque lundi.
const DEFAULT_TASKS = ['🚿 Prendre sa douche', '🛏️ Faire son lit', '🍽️ Débarrasser la table', '🧸 Ranger ses jouets'];
const TASK_IDEAS = ['🦷 Se brosser les dents', '🎒 Préparer son cartable', '📚 Faire ses devoirs', '🍽️ Mettre la table', '👕 Ranger ses vêtements', '🐶 Nourrir l’animal', '📖 Lire 15 minutes', '🗑️ Sortir la poubelle'];
const STICKERS = [['star', '⭐', 'Étoile'], ['super', '🌟', 'Super étoile'], ['trophy', '🏆', 'Champion'], ['heart', '💖', 'Bravo'],
  ['unicorn', '🦄', 'Magique'], ['rocket', '🚀', 'Fusée'], ['crown', '👑', 'Royal'], ['rainbow', '🌈', 'Arc-en-ciel']];
const STICKER = Object.fromEntries(STICKERS.map(([k, e, l]) => [k, { e, l }]));
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const missionKids = () => state.members.filter((m) => m.missions && !isMaison(m));
const canSeeMissions = () => !!state.me && (!!state.me.missions || ((isParent(state.me) || isMaison(state.me)) && missionKids().length > 0));
const tasksOf = (m) => (m.missionTasks && m.missionTasks.length ? m.missionTasks : DEFAULT_TASKS);
const weekKey = (d) => ymd(mondayOf(d));
const missionId = (mid, wk) => `${mid}_${wk}`;
const canCheck = (kid) => !!state.me && (state.me.id === kid.id || isParent(state.me) || isMaison(state.me));
function missionDoc(mid, wk) {
  return state.missions.find((x) => x.id === missionId(mid, wk)) || { id: missionId(mid, wk), memberId: mid, week: wk, checks: {}, stickers: {}, _new: true };
}
function writeMission(doc, field) {
  if (doc._new) {
    delete doc._new;
    state.missions.push(doc);
    save(backend.set('missions', doc.id, { memberId: doc.memberId, week: doc.week, checks: doc.checks, stickers: doc.stickers }));
  } else save(backend.update('missions', doc.id, { [field]: doc[field] }));
  refresh();
}
function missionsLeftToday() {
  if (!state.me?.missions) return 0;
  const t = todayStr(), done = missionDoc(state.me.id, weekKey(new Date())).checks?.[t] || [];
  return tasksOf(state.me).filter((x) => !done.includes(x)).length;
}
function toggleTask(kidId, date, task) {
  const kid = member(kidId);
  if (!canCheck(kid)) return;
  if (date > todayStr()) return toast('Pas encore ! On coche le jour même 😉');
  const doc = missionDoc(kidId, weekKey(parseYmd(date)));
  const list = new Set(doc.checks?.[date] || []), was = list.has(task);
  if (was) list.delete(task); else list.add(task);
  doc.checks = { ...doc.checks, [date]: [...list] };
  writeMission(doc, 'checks');
  if (!was && tasksOf(kid).every((x) => list.has(x))) {
    confetti(['🎉', '⭐', '🌟', '✨']);
    notify(state.members.filter(isParent).map((m) => m.id), { title: `🎯 ${kid.name} a fini ses missions du jour !`, body: 'Une étoile à coller ? ⭐', tag: 'missions-' + kidId, view: 'missions' });
    toast(state.me.id === kidId ? `Bravo ${kid.name} ! Toutes tes missions du jour sont faites 🎉` : `${kid.name} a fini toutes ses missions du jour 🎉`);
  }
}
function setSticker(kidId, date, type) {
  if (!isParent(state.me)) return;
  const doc = missionDoc(kidId, weekKey(parseYmd(date)));
  const st = { ...(doc.stickers || {}) };
  if (type) st[date] = { type, by: state.me.id, at: Date.now() }; else delete st[date];
  doc.stickers = st;
  writeMission(doc, 'stickers');
  if (type) {
    confetti([STICKER[type].e]);
    notify([kidId], { title: `${STICKER[type].e} ${state.me.name} t’a collé « ${STICKER[type].l} » !`, body: 'Va voir ta carte Mission 🎯', tag: 'sticker-' + date, view: 'missions' });
  }
}
function openStickerPicker(kidId, date) {
  const kid = member(kidId), cur = missionDoc(kidId, weekKey(parseYmd(date))).stickers?.[date];
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal sticker-modal">
    <div class="eyebrow">${esc(cap(parseYmd(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })))}</div>
    <h2>Un autocollant pour ${esc(kid.name)} ?</h2>
    <div class="sticker-pick">${STICKERS.map(([k, e, l], i) => `<button class="sticker-opt ${cur?.type === k ? 'on' : ''}" data-action="pick-sticker" data-kid="${esc(kidId)}" data-date="${date}" data-type="${k}">
      <span class="sticker" style="--r:${((i * 37) % 30) - 15}deg">${e}</span><small>${l}</small></button>`).join('')}</div>
    <div class="modal-actions">${cur ? `<button class="btn btn-danger" data-action="pick-sticker" data-kid="${esc(kidId)}" data-date="${date}" data-type="">Retirer l’autocollant</button>` : ''}
      <span class="grow"></span><button class="btn" data-action="close-modal-btn">Annuler</button></div>
  </div></div>`;
}
function openManageMissions(kidId) {
  const kid = member(kidId), tasks = tasksOf(kid);
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="missions-form" data-id="${esc(kidId)}">
    <h2 style="margin-bottom:6px">Missions de ${esc(kid.name)}</h2>
    <p class="muted small" style="margin:0 0 14px">Les mêmes missions chaque jour. Elles s’appliquent tout de suite.</p>
    <div class="task-edit" id="task-edit">${tasks.map((x) => `<div class="task-line"><input type="text" value="${esc(x)}" maxlength="60"><button type="button" class="del" data-action="del-task" aria-label="Supprimer">${ICON.trash}</button></div>`).join('')}</div>
    <button type="button" class="btn btn-sm" data-action="add-task" style="margin:10px 0 14px">${ICON.plus} Ajouter une mission</button>
    <div class="field"><span>Idées</span><div class="who">${TASK_IDEAS.map((x) => `<button type="button" class="who-chip" style="--c:var(--accent)" data-action="add-task" data-text="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
    <label class="check-line"><input type="checkbox" name="active" checked> 🎯 Missions activées pour ${esc(kid.name)}</label>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
}
function missionsDashboardCard() {
  if (!canSeeMissions()) return '';
  const t = todayStr(), wk = weekKey(new Date());
  if (state.me.missions && !isParent(state.me)) {
    const kid = state.me, doc = missionDoc(kid.id, wk), done = doc.checks?.[t] || [], stars = Object.keys(doc.stickers || {}).length;
    return `<section class="card tint-butter"><div class="card-head"><h2>🎯 Mes missions du jour</h2><span class="kid-stars big">⭐ ${stars}</span></div>
      <div class="mission-list">${tasksOf(kid).map((task) => `<div class="mrow"><button class="mcheck ${done.includes(task) ? 'on' : ''}" data-action="mission-check" data-kid="${esc(kid.id)}" data-date="${t}" data-task="${esc(task)}">${done.includes(task) ? '✓' : ''}</button><span>${esc(task)}</span></div>`).join('')}</div>
      <button class="btn btn-sm" style="margin-top:12px" data-action="nav" data-view="missions">Ma carte Mission</button></section>`;
  }
  return `<section class="card tint-butter"><div class="card-head"><h2>🎯 Missions des enfants</h2><button class="btn btn-sm" data-action="nav" data-view="missions">Voir</button></div>
    <div class="list">${missionKids().map((k) => {
      const doc = missionDoc(k.id, wk), n = tasksOf(k).length, d = tasksOf(k).filter((x) => (doc.checks?.[t] || []).includes(x)).length;
      return `<button class="kid-progress" data-action="mission-kid" data-id="${esc(k.id)}" data-go="1">${avatar(k)}<span class="kp-body"><b>${esc(k.name)}</b>
        <span class="kp-bar"><i style="width:${n ? Math.round((d / n) * 100) : 0}%"></i></span><span class="small muted">${d}/${n} aujourd’hui</span></span>
        <span class="kid-stars">⭐ ${Object.keys(doc.stickers || {}).length}</span></button>`;
    }).join('')}</div></section>`;
}
let stickersBefore = null;
// Un autocollant ne s'anime qu'une fois, juste après avoir été collé.
const stuck = new Set();
function freshSticker(kidId, date, st) {
  const key = `${kidId}|${date}|${st.at}`;
  if (stuck.has(key) || Date.now() - st.at > 4000) return false;
  stuck.add(key);
  return true;
}
function onMissions(list) {
  const now = new Map();
  for (const d of list) for (const [date, st] of Object.entries(d.stickers || {})) now.set(`${d.memberId}|${date}|${st.type}`, st);
  if (stickersBefore && state.me) {
    for (const [k, st] of now) if (!stickersBefore.has(k) && k.startsWith(state.me.id + '|') && st.by !== state.me.id) {
      const date = k.split('|')[1];
      confetti([STICKER[st.type]?.e || '⭐']);
      toast(`${STICKER[st.type]?.e || '⭐'} ${member(st.by).name} t’a collé « ${STICKER[st.type]?.l || 'Étoile'} » pour ${parseYmd(date).toLocaleDateString('fr-FR', { weekday: 'long' })} !`);
    }
  }
  stickersBefore = now;
  state.missions = list;
  refresh();
}
function confetti(emojis) {
  const box = document.createElement('div');
  box.className = 'confetti';
  box.innerHTML = Array.from({ length: 26 }, (_, i) => `<span style="left:${Math.random() * 100}%;animation-delay:${Math.random() * 0.5}s;font-size:${18 + Math.random() * 22}px">${emojis[i % emojis.length]}</span>`).join('');
  document.body.append(box);
  setTimeout(() => box.remove(), 2600);
}

function noteItem(n) {
  const a = member(n.author);
  return `<div class="note ${n.important ? 'imp' : ''} ${n.done ? 'done' : ''}">
    <button class="check" data-action="toggle-note" data-id="${esc(n.id)}" aria-label="Fait">${n.done ? ICON.check : ''}</button>
    <div class="note-text">${esc(n.text)}${n.images?.length ? `<div class="att-thumbs">${n.images.map((im) => `<button class="att-thumb" data-action="open-att" data-id="${esc(im.id)}"><img src="${esc(im.thumb)}" alt=""></button>`).join('')}</div>` : ''}
      <div class="note-meta">${esc(a.name)} · ${new Date(n.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div></div>
    <button class="star" data-action="star-note" data-id="${esc(n.id)}" aria-label="Important">${n.important ? '★' : '☆'}</button>
    <button class="del" data-action="del-note" data-id="${esc(n.id)}" aria-label="Supprimer">${ICON.trash}</button>
  </div>`;
}

/* ================= Fenêtre rendez-vous ================= */
function openEventModal(ev, date, { verify = false } = {}) {
  const isNew = !ev;
  ev = ev || { title: '', date: date || todayStr(), time: '', end: '', allDay: false, category: 'rdv', repeat: 'none', who: [], notes: '', importance: verify ? 1 : 0, verify };
  const who = new Set(ev.who || []);
  const al = ev.alert || {};
  const alTo = new Set(al.to && al.to.length ? al.to : [state.me.id]);
  const offset = al.at ? 'custom' : al.offset ?? 15;
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="event-form" data-id="${esc(ev.id || '')}" data-imp="${ev.importance || 0}">
    <h2 style="margin-bottom:16px">${isNew ? 'Ajouter au planning' : 'Modifier'}</h2>
    <label class="field"><span>Quoi ?</span><input type="text" name="title" value="${esc(ev.title)}" placeholder="Dentiste, réunion d’école, anniversaire de Mamie…" maxlength="100" required></label>
    <div class="row"><label class="field"><span>Catégorie</span><select name="category">${Object.entries(CATEGORIES).map(([k, l]) => `<option value="${k}" ${ev.category === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Date</span><input type="date" name="date" value="${esc(ev.date)}" required></label></div>
    <label class="check-line"><input type="checkbox" name="allDay" ${ev.allDay ? 'checked' : ''}> Toute la journée</label>
    <div class="row ${ev.allDay ? 'hidden' : ''}" id="time-row"><label class="field"><span>Début</span><input type="time" name="time" value="${esc(ev.time)}"></label>
      <label class="field"><span>Fin (facultatif)</span><input type="time" name="end" value="${esc(ev.end)}"></label></div>
    <div class="field"><span>Niveau d’importance</span><div class="seg imp-seg" style="margin:0">
      ${IMPORTANCE.map((i) => `<button type="button" class="imp-btn imp${i.v} ${(ev.importance || 0) === i.v ? 'on' : ''}" data-action="pick-imp" data-v="${i.v}">${i.label}</button>`).join('')}</div></div>
    <div class="row"><label class="field"><span>Répéter</span><select name="repeat">${Object.entries(REPEATS).map(([k, l]) => `<option value="${k}" ${(ev.repeat || 'none') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field ${(ev.repeat || 'none') === 'none' ? 'hidden' : ''}" id="until-f"><span>Jusqu’au (facultatif)</span><input type="date" name="until" value="${esc(ev.until || '')}"></label></div>
    <div class="field"><span>Qui est concerné ? (personne = toute la famille)</span><div class="who">
      ${state.members.filter((m) => !isMaison(m)).map((m) => `<button type="button" class="who-chip ${who.has(m.id) ? 'on' : ''}" style="--c:${esc(m.color)}" data-action="toggle-who" data-id="${esc(m.id)}">${esc(m.name)}</button>`).join('')}</div></div>
    <label class="verif-flag"><input type="checkbox" name="verify" ${ev.verify ? 'checked' : ''}><div><b>📌 À vérifier — très important</b>
      <div class="small" style="margin-top:2px">Apparaît dans le calendrier <u>et</u> dans l’onglet « À vérifier », jusqu’à ce que quelqu’un coche « C’est fait » (tampon VALIDÉ).</div></div></label>
    <div class="alert-box ${al.on ? 'on' : ''}">
      <label class="check-line" style="margin:0"><input type="checkbox" name="alertOn" ${al.on ? 'checked' : ''}> 🔔 <b>Alerte</b> <span class="small muted">— recevoir un rappel</span></label>
      <div class="alert-opts ${al.on ? '' : 'hidden'}">
        <div class="row" style="margin-top:12px"><label class="field"><span>Quand ?</span><select name="alertOffset">
          ${ALERT_OFFSETS.map(([v, l]) => `<option value="${v}" ${String(offset) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field ${offset === 'custom' ? '' : 'hidden'}" id="alert-at-f"><span>Le</span><input type="datetime-local" name="alertAt" value="${esc(al.at || '')}"></label></div>
        <div class="field" style="margin-bottom:0"><span>Qui reçoit le rappel ?</span><div class="who">
          ${state.members.map((m) => `<button type="button" class="who-chip alert-to ${alTo.has(m.id) ? 'on' : ''}" style="--c:${esc(m.color)}" data-action="toggle-who" data-id="${esc(m.id)}">${avatar(m)} ${esc(m.name)}</button>`).join('')}</div></div>
        <p class="small muted" style="margin:10px 0 0">Le rappel sonne et s’affiche sur les appareils où ces personnes sont connectées (téléphone, tablette Maison…).</p>
      </div>
    </div>
    <label class="field"><span>Notes</span><textarea name="notes" maxlength="1000" placeholder="Adresse, documents à apporter…">${esc(ev.notes)}</textarea></label>
    <div class="field"><span>Images (ordonnance, convocation, plan…)</span><div class="att-box"><div class="att-list"></div>
      <label class="btn btn-sm att-add">📷 Ajouter une image<input type="file" class="att-input" accept="image/*" multiple hidden></label></div></div>
    ${!isNew && ev.createdBy ? `<p class="small muted">Ajouté par ${esc(member(ev.createdBy).name)}</p>` : ''}
    <div class="error"></div>
    <div class="modal-actions">${isNew ? '' : `<button type="button" class="btn btn-danger" data-action="delete-event">${ICON.trash} Supprimer</button>`}
      <span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
  const ef = $('#event-form'); ef.__att = (ev.images || []).map((x) => ({ ...x })); ef.__old = (ev.images || []).map((x) => x.id); renderAttach(ef);
  if (isNew) setTimeout(() => $('#event-form [name=title]')?.focus(), 50);
}
// Fiche en lecture seule (moins de 13 ans) : on peut regarder, pas modifier.
function readOnlyForm(form, label) {
  if (!form) return;
  form.querySelectorAll('input,select,textarea,button:not([data-action=close-modal-btn])').forEach((x) => { x.disabled = true; });
  form.querySelector('h2').textContent = label;
  form.querySelector('.modal-actions').innerHTML = '<span class="small muted">👀 Lecture seule</span><span class="grow"></span><button type="button" class="btn btn-primary" data-action="close-modal-btn">Fermer</button>';
}
const closeModal = () => { $('#modal-root').innerHTML = ''; setTimeout(checkAlerts, 400); };

async function submitEvent(form) {
  const fd = new FormData(form);
  const repeat = fd.get('repeat');
  const data = {
    title: fd.get('title').trim(), date: fd.get('date'), allDay: !!fd.get('allDay'),
    time: fd.get('allDay') ? '' : fd.get('time'), end: fd.get('allDay') ? '' : fd.get('end'),
    category: fd.get('category'), repeat, until: repeat === 'none' ? '' : fd.get('until') || '', notes: fd.get('notes').trim(),
    importance: Number(form.dataset.imp) || 0,
    verify: !!fd.get('verify'),
    who: [...form.querySelectorAll('.who-chip.on:not(.alert-to)')].map((b) => b.dataset.id),
  };
  if (!data.title || !data.date) return;
  if (fd.get('alertOn')) {
    const off = fd.get('alertOffset'), at = fd.get('alertAt');
    const to = [...form.querySelectorAll('.alert-to.on')].map((b) => b.dataset.id);
    if (off === 'custom' && !at) { form.querySelector('.error').textContent = 'Choisissez la date et l’heure du rappel.'; return; }
    if (!to.length) { form.querySelector('.error').textContent = 'Choisissez au moins une personne pour le rappel.'; return; }
    data.alert = { on: true, offset: off === 'custom' ? null : Number(off), at: off === 'custom' ? at : null, to };
    askNotifications();
  } else data.alert = null;
  const id = form.dataset.id;
  if (form.__busy) { toast('📷 Un instant, photo en préparation…'); await form.__busy; }
  data.images = await saveAttachments(form.__att || []);
  (form.__old || []).filter((x) => !data.images.some((im) => im.id === x)).forEach((x) => save(backend.remove('attachments', x)));
  if (id) save(backend.update('events', id, { ...data, updatedBy: state.me.id, updatedAt: Date.now() }));
  else save(backend.add('events', { ...data, createdBy: state.me.id, ts: Date.now() }));
  logActivity(id ? 'edit' : 'add', { ...data, id });
  const when = `${cap(parseYmd(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}${data.allDay || !data.time ? '' : ' à ' + data.time}`;
  // Notification seulement pour ce qui compte (Important, Urgent, À vérifier) ; le reste va dans « Du nouveau dans le calendrier ».
  if (data.importance >= 1 || data.verify) notify('all', { title: `${data.verify ? '📌' : '📅'} ${id ? 'Modifié' : 'Nouveau'} : ${data.title}`, body: `${when} — par ${state.me.name}`, tag: 'ev-' + (id || data.title), view: data.verify ? 'verif' : 'agenda' });
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
    updatePhotoPreview();
  },
  async logout() {
    if (state.family && !confirm('Déconnecter cet appareil de la famille ?')) return;
    state.me = null; beat(false);
    if (backend.mode === 'cloud') await save(backend.remove('push', deviceId)); // plus de notifications sur cet appareil
    stopSubs(); await backend.signOut();
  },
  'switch-user': () => switchUser(),
  'login-maison': () => submitWelcome(true),
  'forgot-pin': () => openForgotPin(),
  'qr-big': () => openQrBig(),
  'qr-download': () => downloadQr(),
  async 'share-link'() {
    const url = appUrl(backend.mode === 'cloud' && state.qrWithCode !== false);
    const text = `Rejoins la famille sur Kids & Co 🏠${state.family && backend.mode === 'cloud' ? ` (code famille : ${state.family.id})` : ''}`;
    if (navigator.share) { try { await navigator.share({ title: 'Kids & Co', text, url }); } catch {} return; }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Lien copié 📋'); } catch { toast(url); }
  },
  'toggle-eye'(el) {
    const input = el.parentElement.querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
    el.textContent = input.type === 'password' ? '👁️' : '🙈';
  },
  'pick-face'(el) {
    const m = state.members.find((x) => x.id === el.dataset.id);
    if (!m) return;
    $('#w-name').value = m.name;
    if (!m.pinHash) return submitWelcome(false);
    $('#w-code').value = '';
    $('#w-code').focus();
  },
  'email-login': () => renderLogin('login'),
  'email-signup': () => renderLogin('signup'),
  'welcome-back': () => renderWelcomeUnlinked(),
  'pick-profile'(el) {
    const m = state.members.find((x) => x.id === el.dataset.id);
    if (!m) return;
    if (m.pinHash) openPin({ purpose: 'login', member: m, onOk: () => startAs(m) });
    else startAs(m);
  },
  'pin-key': (el) => pinKey(el.dataset.k),
  'close-modal-btn': () => { pin = null; closeModal(); },
  'first-profile': () => openMemberModal(null, { first: true }),
  'add-member-start'() {
    if (state.members.some((m) => isParent(m) && m.pinHash)) openPin({ purpose: 'parent', onOk: () => openMemberModal(null) });
    else openMemberModal(null);
  },
  'add-member': () => openMemberModal(null),
  'add-maison': () => openMemberModal({ name: 'Maison', lastName: '', role: 'maison', color: '#3FB0A4', emoji: '' }, {}),
  'show-card'(el) { const m = state.members.find((x) => x.id === el.dataset.id); if (m) openCard(m); },
  'card-done'() { const done = cardDone; cardDone = null; closeModal(); if (done) done(); else if (!state.me && state.membersLoaded) renderWho(); },
  'remove-photo'() { memberPhoto = null; $('#photo-preview').style.backgroundImage = ''; updatePhotoPreview(); },
  compose: () => openCompose(),
  'nav-more': () => openNavMore(),
  'cal-news'() { openCalNews(); },
  'cal-news-close'() { markCalSeen(); refresh(); },
  'cal-news-go'(el) { closeModal(); state.selected = el.dataset.date; state.month = new Date(parseYmd(el.dataset.date).getFullYear(), parseYmd(el.dataset.date).getMonth(), 1); go('agenda'); },
  'home-tab'(el) { ls.set('kc-home-tab-' + state.me.id, el.dataset.tab); refresh(); },
  'wish-who'(el) { state.wishWho = el.dataset.id; refresh(); },
  'wish-new'() { openWish(null); },
  'wish-edit'(el) { openWish(state.wishes.find((x) => x.id === el.dataset.id)); },
  'wish-del'(el) {
    const w = state.wishes.find((x) => x.id === el.dataset.id);
    if (!w || !confirm(`Retirer « ${w.title} » de la liste ?`)) return;
    if (w.image) save(backend.remove('attachments', w.image.id));
    save(backend.remove('wishes', w.id)); closeModal();
  },
  'wish-reserve'(el) {
    const w = state.wishes.find((x) => x.id === el.dataset.id);
    if (!w || w.owner === state.me.id) return;
    if (w.reservedBy && w.reservedBy !== state.me.id) return toast('Déjà réservé par quelqu’un d’autre');
    const mine = w.reservedBy === state.me.id;
    save(backend.update('wishes', w.id, { reservedBy: mine ? null : state.me.id, reservedAt: mine ? null : Date.now() }));
    toast(mine ? 'Réservation annulée' : `🎁 Réservé ! ${member(w.owner).name} ne le verra pas 🤫`);
  },
  'zone-set'(el) { save(backend.set('edtConfig', 'main', { zone: el.dataset.z })); state.edtConfig.zone = el.dataset.z; holidays = null; loadHolidays(); refresh(); },
  'box-polls'() { state.box = 'polls'; go('messages'); },
  'nav-from-more'(el) { closeModal(); go(el.dataset.view); },
  arrive: () => openArrive(),
  'arrive-place'(el) {
    const f = el.closest('form'); f.dataset.place = el.dataset.place;
    f.querySelectorAll('[data-action=arrive-place]').forEach((b) => b.classList.toggle('on', b === el));
    f.querySelector('.arrive-other').classList.toggle('hidden', el.dataset.place !== 'autre');
  },
  'open-photo'(el) { openPhoto(el.dataset.id); },
  'photo-nav'(el) { openPhoto(el.dataset.id); },
  'photo-like'(el) { likePhoto(el.dataset.id); },
  'photo-del'(el) { deletePhoto(el.dataset.id); },
  slideshow: () => startSlideshow(),
  'new-poll': () => openNewPoll(),
  'poll-vote'(el) { votePoll(el.dataset.id, el.dataset.opt); },
  'poll-close'(el) { const pl = state.polls.find((x) => x.id === el.dataset.id); if (pl) save(backend.update('polls', pl.id, { closed: !pl.closed })); },
  'poll-del'(el) { if (confirm('Supprimer ce sondage ?')) save(backend.remove('polls', el.dataset.id)); },
  'poll-add-opt'() { const box = $('#poll-opts'); if (box.children.length >= 8) return; box.insertAdjacentHTML('beforeend', pollOptLine('')); box.lastElementChild.querySelector('input').focus(); },
  'poll-del-opt'(el) { if ($('#poll-opts').children.length > 2) el.closest('.task-line').remove(); },
  'poll-template'(el) {
    const [q, ...opts] = el.dataset.t.split('|');
    const f = $('#poll-form'); f.question.value = q;
    $('#poll-opts').innerHTML = opts.map(pollOptLine).join('');
  },
  box(el) { state.box = el.dataset.box; refresh(); },
  'open-mail'(el) { const m = state.messages.find((x) => x.id === el.dataset.id); if (m) openMail(m); },
  'hide-mail'() {
    const id = $('.mail-modal').dataset.id;
    save(backend.arrayAdd('messages', id, 'hiddenFor', state.me.id));
    closeModal(); toast('Message supprimé de votre boîte');
  },
  reply(el) {
    const m = state.messages.find((x) => x.id === $('.mail-modal').dataset.id);
    if (!m) return;
    const subject = m.subject ? (/^re ?:/i.test(m.subject) ? m.subject : 'Re : ' + m.subject) : '';
    if (!el.dataset.all) return openCompose({ to: [msgFrom(m)], subject });
    if (!msgTo(m)) return openCompose({ all: true, subject });
    openCompose({ to: [...new Set([msgFrom(m), ...msgTo(m)])].filter((id) => id !== state.me.id), subject });
  },
  'rcpt-all'(el) { el.classList.toggle('on'); if (el.classList.contains('on')) el.closest('form').querySelectorAll('.rcpt').forEach((b) => b.classList.remove('on')); },
  rcpt(el) { el.classList.toggle('on'); el.closest('form').querySelector('.rcpt-all').classList.remove('on'); },
  'edit-member'(el) { const m = state.members.find((x) => x.id === el.dataset.id); if (m) openMemberModal(m); },
  'member-role'(el) {
    const form = el.closest('form');
    form.dataset.role = el.dataset.role;
    form.querySelectorAll('[data-action=member-role]').forEach((b) => b.classList.toggle('on', b === el));
    $('#f-lastname').classList.toggle('hidden', el.dataset.role === 'maison');
    $('#f-birth').classList.toggle('hidden', el.dataset.role === 'maison');
    form.querySelector('.maison-hint').classList.toggle('hidden', el.dataset.role !== 'maison');
    if (el.dataset.role === 'maison' && !form.name.value) form.name.value = 'Maison';
    form.querySelector('.missions-opt').classList.toggle('hidden', el.dataset.role === 'maison');
    if (form.dataset.new && el.dataset.role !== 'maison') form.missions.checked = el.dataset.role === 'enfant';
    updatePhotoPreview();
  },
  'pick-emoji'(el) {
    const form = el.closest('form');
    form.dataset.emoji = el.dataset.emoji;
    form.querySelectorAll('.emoji-opt').forEach((b) => b.classList.toggle('on', b === el));
    updatePhotoPreview();
  },
  'delete-member'() {
    const id = $('#member-form').dataset.id, m = state.members.find((x) => x.id === id);
    if (!m || !confirm(`Retirer ${m.name} de la famille ? Ses messages et rendez-vous restent visibles.`)) return;
    save(backend.remove('membres', id)); closeModal(); toast(`${m.name} a été retiré(e)`);
  },
  'toggle-ask'() { ls.set('kc-ask', ls.get('kc-ask') === '1' ? '0' : '1'); refresh(); },
  'new-event': (el) => openEventModal(null, el.dataset.date),
  'whats-new': () => openWhatsNew(),
  'check-update': () => checkUpdate(true),
  'do-update': () => doUpdate(),
  'update-now'(el) { el.classList.add('spin'); toast('🔄 Recherche d’une mise à jour…'); checkUpdate(true).finally(() => setTimeout(() => el.classList.remove('spin'), 600)); },
  'mission-check'(el) { toggleTask(el.dataset.kid, el.dataset.date, el.dataset.task); },
  'mission-kid'(el) { state.missionKid = el.dataset.id; if (el.dataset.go) go('missions'); else refresh(); },
  'mission-day'(el) { state.missionDay = Number(el.dataset.i); refresh(); },
  'mission-week'(el) {
    const n = Number(el.dataset.delta), cur = mondayOf(new Date());
    const next = n === 0 ? cur : addDays(parseYmd(state.missionWeek || ymd(cur)), 7 * n);
    state.missionWeek = next > cur ? ymd(cur) : ymd(next);
    state.missionDay = undefined;
    refresh();
  },
  'sticker-slot'(el) {
    if (!isParent(state.me)) return toast('Seuls les parents peuvent coller les autocollants ⭐');
    openStickerPicker(el.dataset.kid, el.dataset.date);
  },
  'pick-sticker'(el) { closeModal(); setSticker(el.dataset.kid, el.dataset.date, el.dataset.type); },
  'manage-missions'(el) { openManageMissions(el.dataset.id); },
  'add-task'(el) {
    const box = $('#task-edit'), line = document.createElement('div');
    line.className = 'task-line';
    line.innerHTML = `<input type="text" maxlength="60" placeholder="Ex. 🦷 Se brosser les dents"><button type="button" class="del" data-action="del-task" aria-label="Supprimer">${ICON.trash}</button>`;
    box.append(line);
    line.querySelector('input').value = el.dataset.text || '';
    if (!el.dataset.text) line.querySelector('input').focus();
  },
  'del-task'(el) { el.closest('.task-line').remove(); },
  'new-verif': () => openEventModal(null, todayStr(), { verify: true }),
  'verif-filter'(el) { state.verifFilter = el.dataset.v; refresh(); },
  'verif-done'(el) { setDone(el.dataset.id, el.dataset.occ, { by: state.me.id, at: Date.now() }); toast('✅ Validé — tout le monde le voit'); },
  'verif-undo'(el) { if (confirm('Retirer le tampon VALIDÉ ?')) setDone(el.dataset.id, el.dataset.occ, null); },
  'edit-event': (el) => {
    const ev = state.events.find((x) => x.id === el.dataset.id);
    if (!ev) return;
    openEventModal(ev);
    if (isYoung(state.me)) readOnlyForm($('#event-form'), 'Rendez-vous');
  },
  'close-modal': (el, e) => { if (e.target === el && !$('#member-form[data-first="1"]') && !cardDone) { pin = null; closeModal(); } },
  'toggle-who': (el) => el.classList.toggle('on'),
  'pick-imp'(el) {
    const form = el.closest('form');
    form.dataset.imp = el.dataset.v;
    form.querySelectorAll('.imp-btn').forEach((b) => b.classList.toggle('on', b === el));
  },
  'alarm-ok'() { closeModal(); },
  'alarm-open'(el) { const ev = state.events.find((x) => x.id === el.dataset.id); closeModal(); if (ev) openEventModal(ev); },
  'delete-event'() {
    const id = $('#event-form').dataset.id;
    const ev = state.events.find((x) => x.id === id);
    if (!confirm(`Supprimer « ${ev?.title} »${ev?.repeat !== 'none' ? ' (toutes les répétitions)' : ''} ?`)) return;
    (ev?.images || []).forEach((im) => save(backend.remove('attachments', im.id)));
    save(backend.remove('events', id)); closeModal(); toast('Rendez-vous supprimé');
    if (ev) logActivity('del', ev);
    if (ev && (ev.importance >= 1 || ev.verify)) notify('all', { title: `🗑️ Supprimé : ${ev.title}`, body: `par ${state.me.name}`, tag: 'ev-' + id, view: 'agenda' });
  },
  'edt-week'(el) {
    const n = Number(el.dataset.delta);
    state.edtWeek = n === 0 ? mondayOf(new Date()) : addDays(state.edtWeek || mondayOf(new Date()), 7 * n);
    if (n === 0) state.edtDay = undefined;
    refresh();
  },
  'edt-day'(el) { state.edtDay = Number(el.dataset.i); refresh(); },
  'edt-settings': () => openEdtSettings(),
  'open-course'(el) { openCourse(el.dataset.id, el.dataset.date); if (isYoung(state.me)) $('#edt-note-form')?.remove(); },
  'edt-mode'(el) { state.edtMode = el.dataset.m; refresh(); },
  'edt-ab'(el) { state.edtAB = el.dataset.w; refresh(); },
  'edit-course'(el) {
    const c = state.cours.find((x) => x.id === el.dataset.id);
    openCourseEdit(c, { day: Number(el.dataset.day) || 1 });
  },
  'edt-slot'(el, e) {
    if (e.target !== el && !e.target.classList.contains('edt-hline')) return;
    const r = el.getBoundingClientRect();
    const min = Number(el.dataset.minh) * 60 + (e.clientY - r.top) / Number(el.dataset.ppm);
    const m5 = Math.max(0, Math.floor(min / 30) * 30); // case touchée → début à l'heure ou à la demi-heure
    openCourseEdit(null, { day: Number(el.dataset.day), start: `${pad(Math.floor(m5 / 60))}:${pad(m5 % 60)}` });
  },
  'delete-course'() {
    const id = $('#course-form').dataset.id, c = state.cours.find((x) => x.id === id);
    if (!c || !confirm(`Supprimer le cours « ${c.subject} » du ${EDT_DAYS[c.day - 1].toLowerCase()} ?`)) return;
    save(backend.remove('cours', id));
    state.edtNotes.filter((n) => n.courseId === id).forEach((n) => save(backend.remove('edtNotes', n.id)));
    closeModal(); toast('Cours supprimé');
  },
  'add-slot'() {
    const box = $('#slots'), lines = box.querySelectorAll('.slot-line'), last = lines[lines.length - 1];
    const max = edtCfg().saturday ? 6 : 5;
    const prev = last ? { day: Number(last.querySelector('.s-day').value), start: last.querySelector('.s-start').value, end: last.querySelector('.s-end').value } : { day: 0, start: '08:00', end: '09:00' };
    box.insertAdjacentHTML('beforeend', slotLine({ ...prev, day: Math.min(max, prev.day + 1) || 1 }));
  },
  'del-slot'(el) {
    if ($('#slots').querySelectorAll('.slot-line').length <= 1) return toast('Il faut au moins un jour.');
    el.closest('.slot-line').remove();
  },
  'open-absence'(el) { openAbsence(el.dataset.id, el.dataset.date); },
  'abs-scope'(el) {
    const f = el.closest('form'); f.dataset.scope = el.dataset.v;
    f.querySelectorAll('[data-action=abs-scope]').forEach((b) => b.classList.toggle('on', b === el));
  },
  'abs-preset'(el) {
    const f = el.closest('form'); f.from.value = el.dataset.from; f.to.value = el.dataset.to;
    f.querySelectorAll('[data-action=abs-preset]').forEach((b) => b.classList.toggle('on', b === el));
  },
  'end-absence'(el) {
    const a = state.absences.find((x) => x.id === el.dataset.id);
    if (!a || !confirm(`${absenceWho(a)} est de retour ? L’absence s’arrête aujourd’hui (les jours passés restent notés).`)) return;
    const y = ymd(addDays(new Date(), -1));
    if (a.from > y) save(backend.remove('absences', a.id)); else save(backend.update('absences', a.id, { to: y }));
    toast('Absence terminée ✅');
  },
  'del-edt-note'(el) { save(backend.remove('edtNotes', el.dataset.id)); },
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
  'del-note'(el) {
    const n = state.notes.find((x) => x.id === el.dataset.id);
    (n?.images || []).forEach((im) => save(backend.remove('attachments', im.id)));
    save(backend.remove('notes', el.dataset.id));
  },
  'note-att-del'(el) { state.noteAtt = (state.noteAtt || []).filter((x) => x.id !== el.dataset.id); refresh(); },
  'att-del'(el) { const f = el.closest('form'); f.__att = f.__att.filter((x) => x.id !== el.dataset.id); renderAttach(f); },
  'open-att'(el) { openAttachment(el.dataset.id); },
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
  async notif() { await Notification.requestPermission(); await syncPush(true); refresh(); },
  'lock-key': (el) => lockKeyPress(el.dataset.k),
  'lock-bio': () => unlockBio(false),
  'lock-switch'() { unlock(); switchUser(); },
  'lock-toggle'() {
    const c = lockCfg();
    c.on = !c.on;
    if (c.on && c.delay === undefined) c.delay = 0;
    setLockCfg(c); refresh();
    toast(c.on ? '🔒 Verrouillage activé sur cet appareil' : 'Verrouillage désactivé');
  },
  async 'bio-toggle'() {
    const c = lockCfg();
    if (c.cred) { delete c.cred; setLockCfg(c); refresh(); return toast('Empreinte / Face ID désactivée'); }
    try { c.cred = await bioRegister(); setLockCfg(c); refresh(); toast('👆 Empreinte / Face ID activée'); }
    catch { toast('Impossible d’activer l’empreinte sur cet appareil.', true); }
  },
  'push-test'() { notify([state.me.id], { title: '🔔 Test Kids & Co', body: 'Les notifications fonctionnent sur cet appareil 🎉', tag: 'test' }, { includeSelf: true }); toast('Notification de test envoyée…'); },
};

// Actions interdites aux moins de 13 ans (agenda, à vérifier, emploi du temps, pense-bête, famille).
const YOUNG_BLOCKED = new Set(['photo-del', 'new-event', 'delete-event', 'new-verif', 'verif-done', 'verif-undo', 'edit-course', 'edt-slot', 'open-absence', 'end-absence',
  'del-edt-note', 'edt-settings', 'toggle-note', 'star-note', 'del-note', 'clear-done', 'toggle-imp', 'add-member', 'add-maison', 'add-member-start', 'delete-member']);
const YOUNG_FORMS = new Set(['event-form', 'note-form', 'course-form', 'edt-note-form', 'absence-form', 'edt-settings-form']);
const youngNo = () => toast('🔒 Réservé aux plus de 13 ans — demande à un parent 😉');
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT') return;
  if (isYoung(state.me) && YOUNG_BLOCKED.has(el.dataset.action)) { e.preventDefault(); return youngNo(); }
  if (isYoung(state.me) && el.dataset.action === 'edit-member' && el.dataset.id !== state.me.id) { e.preventDefault(); return youngNo(); }
  const fn = ACTIONS[el.dataset.action];
  if (fn) { if (el.tagName === 'BUTTON' && el.type !== 'submit') e.preventDefault(); fn(el, e); }
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'album-upload' && t.files?.length) { uploadPhotos([...t.files]); t.value = ''; return; }
  if (t.classList.contains('att-input') && t.files?.length) {
    const f = t.closest('form'), files = [...t.files];
    t.value = '';
    f.__busy = addAttachments(files, f.__att, f.dataset.single ? 1 : 4, () => renderAttach(f)).finally(() => { f.__busy = null; });
    return;
  }
  if (t.classList.contains('note-att-input') && t.files?.length) {
    state.noteAtt = state.noteAtt || [];
    const files = [...t.files];
    t.value = '';
    state.noteBusy = addAttachments(files, state.noteAtt, 4, refresh).finally(() => { state.noteBusy = null; });
    return;
  }
  if (t.id === 'photo-input' && t.files && t.files[0]) {
    try { memberPhoto = await readPhoto(t.files[0]); updatePhotoPreview(); }
    catch { toast('Impossible de lire cette photo, essayez-en une autre.', true); }
    t.value = '';
  }
  if (t.dataset.action === 'theme') { ls.set('maison-theme', t.value); applyTheme(); }
  if (t.dataset.action === 'lock-delay') { const c = lockCfg(); c.delay = Number(t.value); setLockCfg(c); }
  if (t.dataset.action === 'qr-code-toggle') { state.qrWithCode = t.checked; refresh(); }
  if (t.form?.id === 'event-form' && t.name === 'allDay') $('#time-row').classList.toggle('hidden', t.checked);
  if (t.form?.id === 'event-form' && t.name === 'repeat') $('#until-f').classList.toggle('hidden', t.value === 'none');
  if (t.form?.id === 'event-form' && t.name === 'alertOn') {
    t.form.querySelector('.alert-opts').classList.toggle('hidden', !t.checked);
    t.form.querySelector('.alert-box').classList.toggle('on', t.checked);
    if (t.checked) askNotifications();
  }
  if (t.form?.id === 'event-form' && t.name === 'alertOffset') {
    $('#alert-at-f').classList.toggle('hidden', t.value !== 'custom');
    if (t.value === 'custom' && !t.form.alertAt.value) t.form.alertAt.value = `${t.form.date.value}T${t.form.time.value || '09:00'}`;
  }
  if (t.form?.id === 'event-form' && t.name === 'category' && t.value === 'anniv') t.form.repeat.value = 'yearly';
  if (t.id === 'f-name' && t.value.trim()) {
    state.family.name = t.value.trim();
    save(backend.renameFamily(state.family.name)); refresh();
  }
});

document.addEventListener('submit', async (e) => {
  const f = e.target;
  e.preventDefault();
  if (isYoung(state.me) && YOUNG_FORMS.has(f.id)) return youngNo();
  if (f.id === 'welcome-form') { submitWelcome(false); return; }
  if (f.id === 'login-form') {
    const email = f.email.value.trim(), pw = f.password.value;
    const btn = f.querySelector('.btn-primary'); btn.disabled = true;
    try { await (f.dataset.mode === 'signup' ? backend.signUp(email, pw) : backend.signIn(email, pw)); }
    catch (err) { renderLogin(f.dataset.mode, AUTH_ERRORS[err.code] || err.message); $('#login-form [name=email]').value = email; }
  } else if (f.id === 'setup-form') submitSetup(f);
  else if (f.id === 'event-form') submitEvent(f);
  else if (f.id === 'compose-form') submitCompose(f);
  else if (f.id === 'arrive-form') submitArrive(f);
  else if (f.id === 'wish-form') submitWish(f);
  else if (f.id === 'poll-form') submitPoll(f);
  else if (f.id === 'caption-form') { const id = f.dataset.id, c = f.caption.value.trim(); save(backend.update('photos', id, { caption: c })); toast('Légende enregistrée'); }
  else if (f.id === 'forgot-form') submitForgot(f);
  else if (f.id === 'missions-form') {
    const tasks = [...new Set([...f.querySelectorAll('#task-edit input')].map((i) => i.value.trim()).filter(Boolean))];
    save(backend.update('membres', f.dataset.id, { missionTasks: tasks.length ? tasks : DEFAULT_TASKS, missions: f.active.checked }));
    closeModal(); toast('Missions enregistrées 🎯');
  }
  else if (f.id === 'course-form') submitCourse(f);
  else if (f.id === 'edt-note-form') {
    const box = $('.course-modal'), text = f.text.value.trim();
    f.text.value = '';
    save(backend.add('edtNotes', { courseId: box.dataset.id, date: box.dataset.date, type: f.type.value, text, author: state.me.id, ts: Date.now() }));
    const crs = state.cours.find((x) => x.id === box.dataset.id);
    notify('all', { title: `📚 ${crs ? crs.subject : 'Lycée'} — ${EDT_TYPES[f.type.value]?.label || 'Info'}`, body: `${cap(fmtShort(box.dataset.date))}${text ? ' : ' + text : ''}`, tag: 'edt-' + box.dataset.date, view: 'edt' });
    toast('Info ajoutée — toute la famille la voit');
  } else if (f.id === 'absence-form') { submitAbsence(f); return;
  } else if (f.id === 'edt-settings-form') {
    const ab = f.ab.value, mon = mondayOf(new Date());
    if (f.zone.value !== schoolZone()) { holidays = null; setTimeout(loadHolidays, 300); }
    save(backend.set('edtConfig', 'main', { zone: f.zone.value, title: f.title.value.trim() || 'Lycée Max Linder', studentId: f.studentId.value, saturday: f.saturday.checked,
      refA: ab === 'A' ? ymd(mon) : ab === 'B' ? ymd(addDays(mon, -7)) : '' }));
    closeModal(); toast('Emploi du temps mis à jour');
  }
  else if (f.id === 'note-form') {
    const input = $('#note-input'), text = input.value.trim();
    if (state.noteBusy) { toast('📷 Un instant, photo en préparation…'); await state.noteBusy; }
    if (!text && !state.noteAtt?.length) return;
    input.value = '';
    const images = await saveAttachments(state.noteAtt || []);
    save(backend.add('notes', { text: text || '📷 Image', images, important: state.noteImportant, done: false, author: state.me.id, ts: Date.now() }));
    state.noteAtt = [];
    if (state.noteImportant) notify('all', { title: `⭐ À ne pas oublier`, body: `${text} — ${state.me.name}`, tag: 'note', view: 'important' });
    const ni = $('#note-input'); if (ni) ni.value = '';
    state.noteImportant = false; refresh();
  } else if (f.id === 'member-form') submitMember(f);
  else if (f.id === 'family-form') $('#f-name').blur();
});

document.addEventListener('input', (e) => { if (e.target.form?.id === 'member-form' && e.target.name === 'name') updatePhotoPreview(); });
document.addEventListener('keydown', (e) => {
  if (pin && /^[0-9]$/.test(e.key)) { e.preventDefault(); pinKey(e.key); return; }
  if (pin && e.key === 'Backspace') { e.preventDefault(); pinKey('del'); return; }
  if (e.key === 'Escape' && $('#modal-root').innerHTML && !$('#member-form[data-first="1"]') && !cardDone) { pin = null; closeModal(); }
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
let maisonTimer = null, slideTimer = null;
function resetIdle() {
  clearTimeout(idleTimer); clearTimeout(maisonTimer);
  if (ls.get('maison-tablet') !== '1') return;
  // Sur la tablette, si quelqu'un oublie de se déconnecter, on revient au compte Maison après 3 min.
  const maison = state.members.find(isMaison);
  if (maison && state.me && !isMaison(state.me)) {
    maisonTimer = setTimeout(() => { if (!$('#modal-root').innerHTML) startAs(maison, { quiet: true }); }, 180000);
  }
  idleTimer = setTimeout(() => {
    if (state.view !== 'accueil' && !$('#modal-root').innerHTML && $('#main')) go('accueil');
  }, 120000);
  // Tablette / PC Maison : après 5 min sans activité, l'album passe en diaporama.
  clearTimeout(slideTimer);
  if (isMaison(state.me) && state.photos.length) slideTimer = setTimeout(() => { if (!$('#modal-root').innerHTML && !locked) startSlideshow(true); }, 300000);
}
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, resetIdle, { passive: true }));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { applyTablet(); refresh(); }
});

/* ================= Alertes (rappels) ================= */
// Chaque appareil vérifie régulièrement les rappels destinés à la personne connectée.
// Le rappel sonne, s'affiche dans l'appli et en notification système si elle est autorisée.
function askNotifications() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
function alertTimes(ev, from, to) {
  const a = ev.alert;
  if (a.at) { const d = a.at.slice(0, 10); return d >= from && d <= to ? [{ occ: d, t: new Date(a.at).getTime() }] : []; }
  return occurrences(ev, ymd(addDays(parseYmd(from), Math.ceil((a.offset || 0) / 1440))), ymd(addDays(parseYmd(to), Math.ceil((a.offset || 0) / 1440))))
    .map((d) => ({ occ: d, t: new Date(`${d}T${ev.allDay || !ev.time ? '09:00' : ev.time}`).getTime() - (a.offset || 0) * 60000 }));
}
function checkAlerts() {
  // Une fenêtre est ouverte (saisie en cours) : le rappel attendra qu'elle se ferme.
  if (!state.me || $('#modal-root').innerHTML) return;
  const now = Date.now(), from = ymd(addDays(new Date(), -1)), to = ymd(addDays(new Date(), 1));
  for (const ev of state.events) {
    const a = ev.alert;
    if (!a || !a.on || !(a.to || []).includes(state.me.id)) continue;
    for (const { occ, t } of alertTimes(ev, from, to)) {
      if (now < t || now - t > 2 * 3600e3) continue; // rappels manqués de plus de 2 h : ignorés
      const key = `kc-fired:${ev.id}:${occ}:${state.me.id}`;
      if (ls.get(key)) continue;
      ls.set(key, '1');
      fireAlert(ev, occ);
    }
  }
}
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((dt, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = [880, 1175, 1568][i]; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + dt);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dt + 0.6);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + dt); o.stop(ctx.currentTime + dt + 0.7);
    });
  } catch {}
}
function fireAlert(ev, occ) {
  const when = `${fmtLong(parseYmd(occ))}${ev.allDay || !ev.time ? '' : ' à ' + ev.time}`;
  const imp = IMPORTANCE[ev.importance || 0];
  chime();
  if ('Notification' in window && Notification.permission === 'granted') {
    const opts = { body: `${when}${imp.short ? ' · ' + imp.short : ''}`, icon: 'icon-192.png', badge: 'icon-192.png', tag: `kc-alert-${ev.id}-${occ}`, requireInteraction: ev.importance === 2 };
    navigator.serviceWorker?.ready.then((reg) => reg.showNotification(`⏰ ${ev.title}`, opts))
      .catch(() => { try { new Notification(`⏰ ${ev.title}`, opts); } catch {} });
  }
  $('#modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal alarm-modal imp${ev.importance || 0}">
    <div class="alarm-bell">⏰</div><div class="eyebrow">Rappel${imp.short ? ' · ' + imp.short : ''}</div>
    <h2>${esc(ev.title)}</h2><p class="muted" style="margin:6px 0 0">${esc(when)}</p>
    ${ev.notes ? `<p class="alarm-notes">${esc(ev.notes)}</p>` : ''}
    <div class="modal-actions" style="justify-content:center;margin-top:20px"><button class="btn" data-action="alarm-open" data-id="${esc(ev.id)}">Voir</button>
      <button class="btn btn-primary" data-action="alarm-ok">OK, c’est noté</button></div>
  </div></div>`;
}
setInterval(checkAlerts, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkAlerts(); });

let lastDay = todayStr();
setInterval(() => {
  const now = new Date();
  const clock = $('#clock');
  if (clock) clock.innerHTML = clockHtml(now);
  if (todayStr() !== lastDay) { lastDay = todayStr(); if ($('#main') && !$('#modal-root').innerHTML) refresh(); } // minuit : on passe au jour suivant
}, 15000);

/* ================= Lancement ================= */
/* ================= Version, nouveautés et mises à jour ================= */
const fmtVersionDate = (d) => parseYmd(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
function openWhatsNew({ onlyNew = false, since = null } = {}) {
  const list = onlyNew && since ? CHANGELOG.filter((c) => c.version !== since && CHANGELOG.indexOf(c) < CHANGELOG.findIndex((x) => x.version === since)) : CHANGELOG;
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal news-modal">
    <div class="eyebrow">${onlyNew ? 'Mise à jour installée 🎉' : 'Historique des versions'}</div>
    <h2>${onlyNew ? `Nouveautés de la version ${APP_VERSION}` : 'Nouveautés de Kids &amp; Co'}</h2>
    <div class="timeline">${list.map((c, i) => `<div class="tl-item ${i === 0 ? 'current' : ''}">
      <div class="tl-dot"></div>
      <div class="tl-body"><div class="tl-head"><span class="tl-version">v${esc(c.version)}</span><b>${esc(c.title)}</b>${i === 0 && !onlyNew ? '<span class="tl-now">Version actuelle</span>' : ''}</div>
        <div class="small muted">${fmtVersionDate(c.date)}</div>
        <ul>${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('')}</div>
    <div class="modal-actions">${onlyNew ? '<button class="btn" data-action="whats-new">Tout l’historique</button>' : ''}<span class="grow"></span>
      <button class="btn btn-primary" data-action="close-modal-btn">${onlyNew ? 'Super !' : 'Fermer'}</button></div>
  </div></div>`;
}
// Après une mise à jour, chaque appareil affiche une fois les nouveautés.
function showNewsIfUpdated() {
  const seen = ls.get('kc-version-seen');
  ls.set('kc-version-seen', APP_VERSION);
  if (seen && seen !== APP_VERSION && !$('#modal-root').innerHTML) openWhatsNew({ onlyNew: true, since: seen });
}
// Vérifie régulièrement si une nouvelle version a été publiée (la tablette reste ouverte longtemps).
let updateShown = false, updateAvail = false;
async function checkUpdate(manual = false) {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const { version } = await r.json();
    if (version === APP_VERSION && location.search.includes('v=')) history.replaceState(null, '', location.pathname + location.hash);
    if (version && version !== APP_VERSION) {
      updateAvail = true; document.querySelector('.upd-btn')?.classList.add('has');
      if (manual) return doUpdate(version);
      // Mise à jour automatique (une seule tentative par version, pour ne jamais boucler).
      if (ls.get('kc-auto-update') !== version) { ls.set('kc-auto-update', version); return doUpdate(version); }
      if (!updateShown) {
        updateShown = true;
        const bar = document.createElement('div');
        bar.className = 'update-bar';
        bar.innerHTML = `✨ Nouvelle version disponible (v${esc(version)}) <button class="btn btn-sm" data-action="do-update">Mettre à jour</button>`;
        document.body.append(bar);
      }
    } else if (manual) toast(`Vous avez la dernière version (v${APP_VERSION}) ✅`);
  } catch { if (manual) toast('Impossible de vérifier : pas de connexion internet.', true); }
}
setInterval(checkUpdate, 10 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
async function doUpdate(version) {
  toast('✨ Mise à jour de Kids & Co…');
  try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update();
      reg.waiting?.postMessage('skip-waiting');
      await new Promise((ok) => { navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true }); setTimeout(ok, 2500); });
    }
  } catch {}
  location.replace(location.pathname + '?v=' + encodeURIComponent(version || Date.now()) + location.hash);
}
setTimeout(checkUpdate, 1500); // dès l'ouverture

/* ================= Code secret oublié ================= */
// On prouve qu'on est de la famille avec l'e-mail et le mot de passe du compte famille, puis on choisit un nouveau code.
function openForgotPin() {
  // Personnes d'abord (Maison en dernier), et présélection du prénom déjà tapé.
  const people = [...state.members.filter((m) => !isMaison(m)), ...state.members.filter(isMaison)];
  const typed = norm($('#w-name')?.value), pre = people.find((m) => typed && (norm(m.name) === typed || norm(fullName(m)) === typed));
  const cloud = backend.mode === 'cloud';
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="forgot-form">
    <h2 style="margin-bottom:6px">🔑 Code secret oublié</h2>
    <p class="muted small" style="margin:0 0 16px">${cloud ? 'Pour des raisons de sécurité, confirmez avec l’e-mail et le mot de passe du compte famille (celui créé au tout début).' : 'Choisissez le compte et un nouveau code.'}</p>
    <label class="field"><span>Pour quel compte ?</span><select name="member">${people.map((m) => `<option value="${esc(m.id)}" ${pre?.id === m.id ? 'selected' : ''}>${esc(isMaison(m) ? '🏠 Maison' : fullName(m))}</option>`).join('')}</select></label>
    ${cloud ? `<label class="field"><span>E-mail du compte famille</span><input type="email" name="email" autocomplete="username" required></label>
      <label class="field"><span>Mot de passe du compte famille</span><input type="password" name="password" autocomplete="current-password" required></label>` : ''}
    <div class="row"><label class="field"><span>Nouveau code (4 chiffres)</span><input type="text" name="pin" inputmode="numeric" maxlength="4" autocomplete="off" class="pin-input" required></label>
      <label class="field"><span>Confirmer</span><input type="text" name="pin2" inputmode="numeric" maxlength="4" autocomplete="off" class="pin-input" required></label></div>
    <div class="error"></div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Changer le code</button></div>
  </form></div>`;
}
async function submitForgot(f) {
  const err = f.querySelector('.error'), btn = f.querySelector('.btn-primary'), pin = f.pin.value.trim(), id = f.member.value;
  if (!/^\d{4}$/.test(pin)) { err.textContent = 'Le code doit faire exactement 4 chiffres.'; return; }
  if (pin !== f.pin2.value.trim()) { err.textContent = 'Les deux codes ne sont pas identiques.'; return; }
  btn.disabled = true; err.textContent = '';
  try {
    if (backend.mode === 'cloud') {
      state.joining = true; // la vérification change de session : on ne redessine pas tout
      try {
        const cred = await backend.signIn(f.email.value.trim(), f.password.value);
        state.reauthUid = cred.user.uid;
        state.user = { uid: cred.user.uid, email: cred.user.email };
      }
      catch (e) { throw new Error(AUTH_ERRORS[e.code] || 'E-mail ou mot de passe incorrect.'); }
      finally { state.joining = false; }
      const prof = await backend.getProfile(state.user.uid);
      if (prof?.familyId !== state.family.id) throw new Error('Ce compte n’appartient pas à cette famille.');
    }
    const pinHash = await hashPin(pin, id);
    await save(backend.update('membres', id, { pinHash }));
    const m = state.members.find((x) => x.id === id);
    if (m) m.pinHash = pinHash;
    closeModal();
    toast('Nouveau code enregistré 🔑');
    if (m) loginOk(m, ls.get('kc-ask') !== '1');
  } catch (e) {
    err.textContent = e.message; btn.disabled = false;
  }
}

/* ================= Partager l'appli (QR code) ================= */
// Bibliothèque qrcode-generator (MIT, Kazuhiko Arase), fournie dans qrcode.js.
const appUrl = (withCode) => location.origin + location.pathname.replace(/index\.html$/, '') + (withCode && state.family ? `?famille=${encodeURIComponent(state.family.id)}` : '');
function qrSvg(text) {
  if (typeof qrcode !== 'function') return '<div class="muted small">QR code indisponible</div>';
  const q = qrcode(0, 'H'); // correction élevée : lisible malgré le logo au centre
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 8, scalable: true, alt: 'QR code Kids & Co' });
}
function shareCard() {
  const cloud = backend.mode === 'cloud', withCode = cloud && state.qrWithCode !== false, url = appUrl(withCode);
  return `<section class="card share-card"><h2 style="margin-bottom:6px">📲 Partager l’appli</h2>
    <p class="muted small" style="margin:0 0 14px">Scannez ce QR code avec l’appareil photo d’un téléphone ou d’une tablette pour ouvrir Kids &amp; Co${withCode ? ', avec le code famille déjà rempli' : ''}.</p>
    <button class="qr-box" data-action="qr-big" aria-label="Agrandir le QR code">${qrSvg(url)}<img src="logo.png" alt="" class="qr-logo"></button>
    <div class="qr-url">${esc(url.replace(/^https?:\/\//, ''))}</div>
    ${cloud ? `<label class="check-line" style="justify-content:center"><input type="checkbox" data-action="qr-code-toggle" ${withCode ? 'checked' : ''}> Inclure le code famille</label>` : ''}
    <div class="quick" style="justify-content:center"><button class="btn btn-sm btn-primary" data-action="qr-big">🔍 Agrandir</button>
      <button class="btn btn-sm" data-action="share-link">Partager le lien</button>
      <button class="btn btn-sm" data-action="qr-download">Enregistrer l’image</button></div>
  </section>`;
}
function openQrBig() {
  const url = appUrl(backend.mode === 'cloud' && state.qrWithCode !== false);
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal qr-modal">
    <img src="logo.png" alt="" class="qr-head-logo"><h2>Kids &amp; Co</h2><div class="eyebrow">${esc(state.family?.name || '')}</div>
    <div class="qr-box big">${qrSvg(url)}<img src="logo.png" alt="" class="qr-logo"></div>
    <p class="muted">Ouvrez l’appareil photo et visez le QR code</p>
    <div class="modal-actions" style="justify-content:center"><button class="btn btn-primary" data-action="close-modal-btn">Fermer</button></div>
  </div></div>`;
}
async function downloadQr() {
  const url = appUrl(backend.mode === 'cloud' && state.qrWithCode !== false);
  const svg = qrSvg(url).replace('<svg ', '<svg width="720" height="720" ');
  const img = new Image(), logo = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  logo.src = 'logo.png';
  await Promise.all([img.decode(), logo.decode()]).catch(() => {});
  const c = document.createElement('canvas'); c.width = 800; c.height = 920;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 920);
  g.drawImage(img, 40, 40, 720, 720);
  g.fillStyle = '#fff'; g.fillRect(340, 340, 120, 120);
  g.drawImage(logo, 350, 350, 100, 100);
  g.fillStyle = '#22476B'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
  g.fillText('Kids & Co — ' + (state.family?.name || ''), 400, 830);
  g.font = '26px sans-serif'; g.fillStyle = '#5E7891';
  g.fillText('Scannez pour ouvrir l’appli', 400, 880);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png'); a.download = 'kids-and-co-qr.png'; a.click();
}

/* ================= 🆕 Du nouveau dans le calendrier ================= */
// Les ajouts ordinaires ne sonnent plus : on les retrouve dans un récapitulatif (parents et enfants de 12 ans et plus).
function logActivity(kind, ev) {
  save(backend.add('activity', { kind, evId: ev.id || null, title: ev.title, date: ev.date, time: ev.allDay ? '' : ev.time || '', imp: ev.importance || 0,
    verify: !!ev.verify, by: state.me.id, ts: Date.now() }));
}
const canCalNews = () => !!state.me && !isMaison(state.me) && (isParent(state.me) || ageOf(state.me) === null || ageOf(state.me) >= 12);
function calSeen() {
  const k = 'kc-cal-seen-' + state.me.id;
  let v = Number(ls.get(k));
  if (!v) { v = Date.now(); ls.set(k, String(v)); } // première fois : on ne ressort pas tout l'historique
  return v;
}
const calNews = () => { if (!canCalNews()) return []; const seen = calSeen(); return state.activity.filter((a) => a.ts > seen && a.by !== state.me.id); };
const markCalSeen = () => ls.set('kc-cal-seen-' + state.me.id, String(Date.now()));
function calNewsBanner() {
  const n = calNews();
  if (!n.length) return '';
  const who = [...new Set(n.map((a) => member(a.by).name))].join(', ');
  return `<div class="news-banner"><span class="news-ico">🆕</span>
    <button class="news-text" data-action="cal-news"><b>Du nouveau dans le calendrier</b><span>${n.length} changement${n.length > 1 ? 's' : ''} par ${esc(who)} — toucher pour voir</span></button>
    <button class="news-close" data-action="cal-news-close" aria-label="Fermer">✕</button></div>`;
}
function openCalNews() {
  const seen = calSeen(), list = state.activity.filter((a) => a.by !== state.me.id).slice(0, 40);
  const K = { add: ['➕', 'Ajouté'], edit: ['✏️', 'Modifié'], del: ['🗑️', 'Supprimé'] };
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal news-modal">
    <h2>🆕 Derniers changements du calendrier</h2>
    <div class="list">${list.map((a) => {
      const m = member(a.by), d = a.date ? cap(parseYmd(a.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })) : '';
      return `<button class="news-item ${a.ts > seen ? 'new' : ''} ${a.kind === 'del' ? 'del' : ''}" ${a.kind === 'del' || !a.date ? 'disabled' : `data-action="cal-news-go" data-date="${esc(a.date)}"`}>
        <span class="ni-ico">${K[a.kind]?.[0] || '•'}</span>
        <span class="ni-body"><b>${a.imp === 2 ? '🔴 ' : a.imp === 1 ? '❗ ' : ''}${a.verify ? '📌 ' : ''}${esc(a.title)}</b>
          <small>${K[a.kind]?.[1] || ''} · ${esc(d)}${a.time ? ' à ' + esc(a.time) : ''}</small>
          <small class="muted">par ${esc(m.name)} · ${esc(ago(a.ts))}</small></span>
        ${a.ts > seen ? '<span class="ni-new">Nouveau</span>' : ''}</button>`;
    }).join('') || '<div class="empty">Aucun changement récent.</div>'}</div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn btn-primary" data-action="close-modal-btn">Fermer</button></div>
  </div></div>`;
  markCalSeen(); refresh();
}

/* ================= 📎 Images jointes (notes, rendez-vous, envies) ================= */
// Miniature dans le document (affichage rapide) + grande image à part dans « attachments ».
// Une seule lecture de la photo (rapide et légère en mémoire sur téléphone), puis grande image + miniature.
function prepareAttachment(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    // Dessine une image (ou un canvas) de taille w × h dans un canvas d'au plus « max » pixels de côté.
    const draw = (src, w, h, max) => {
      const k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return c;
    };
    img.onload = () => {
      try {
        const big = draw(img, img.naturalWidth, img.naturalHeight, 1280);
        let full = big.toDataURL('image/jpeg', 0.75);
        if (full.length > 700000) full = big.toDataURL('image/jpeg', 0.55);
        const small = draw(big, big.width, big.height, 320), thumb = small.toDataURL('image/jpeg', 0.7);
        // iPhone : la mémoire des dessins est très limitée ; on la libère tout de suite sinon la 2ᵉ photo échoue.
        for (const c of [big, small]) { c.width = c.height = 0; }
        img.src = ''; URL.revokeObjectURL(url);
        if (full.length < 100 || thumb.length < 100) throw new Error('Mémoire insuffisante');
        resolve({ id: 'a' + newCode().toLowerCase() + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), thumb, full });
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}
// Ajoute plusieurs photos l'une après l'autre, avec un message de progression ; une photo illisible n'arrête pas les autres.
async function addAttachments(files, list, max, onDone) {
  const imgs = [...files].filter((f) => !f.type || f.type.startsWith('image/')).slice(0, max);
  let ok = 0;
  for (const [i, file] of imgs.entries()) {
    if (imgs.length > 1) toast(`📷 Préparation de la photo ${i + 1}/${imgs.length}…`);
    try {
      // Petite pause entre deux photos : laisse l'iPhone libérer la mémoire.
      if (i) await new Promise((r) => setTimeout(r, 120));
      let im;
      try { im = await prepareAttachment(file); } catch { await new Promise((r) => setTimeout(r, 600)); im = await prepareAttachment(file); }
      if (list.length >= max) list.shift();
      list.push(im); ok++; onDone();
    }
    catch { toast(`Photo ${i + 1} illisible (format non pris en charge)`, true); }
  }
  if (ok && imgs.length > 1) toast(`📷 ${ok} photo${ok > 1 ? 's' : ''} ajoutée${ok > 1 ? 's' : ''}`);
}
// Enregistre les grandes images sans attendre le serveur (elles partent en arrière-plan, même hors connexion).
async function saveAttachments(list) {
  const out = [];
  for (const im of list) {
    if (im.full) save(backend.set('attachments', im.id, { data: im.full }));
    out.push({ id: im.id, thumb: im.thumb });
  }
  return out;
}
function renderAttach(f) {
  const box = f.querySelector('.att-list');
  if (!box) return;
  box.innerHTML = (f.__att || []).map((im) => `<span class="att-item"><img src="${esc(im.thumb)}" alt="" data-action="open-att" data-id="${esc(im.id)}" data-src="${esc(im.full || '')}">
    <button type="button" data-action="att-del" data-id="${esc(im.id)}" aria-label="Retirer">✕</button></span>`).join('');
}
async function openAttachment(id) {
  const local = document.querySelector(`[data-action=open-att][data-id="${CSS.escape(id)}"]`);
  let src = local?.dataset.src || '';
  const holder = document.createElement('div');
  holder.className = 'att-viewer';
  holder.innerHTML = `<img src="${esc(local?.querySelector?.('img')?.src || local?.src || '')}" alt=""><button class="btn btn-primary">Fermer</button>`;
  holder.addEventListener('click', () => holder.remove());
  document.body.append(holder);
  if (!src) { try { src = (await backend.get('attachments', id))?.data || ''; } catch {} }
  if (src) holder.querySelector('img').src = src;
}

/* ================= 🎁 Listes d'envies ================= */
// Chacun a sa liste. Les autres réservent un cadeau ; la personne concernée ne voit jamais les réservations.
function wishesView() {
  const people = state.members.filter((m) => !isMaison(m));
  const who = people.some((m) => m.id === state.wishWho) ? state.wishWho : state.me.id && !isMaison(state.me) ? state.me.id : people[0]?.id;
  const owner = member(who), mine = who === state.me.id, list = state.wishes.filter((w) => w.owner === who);
  return `<div class="view-head"><div><div class="eyebrow">Noël, anniversaires… 🤫 surprise garantie</div><h1>🎁 Listes d’envies</h1></div>
      ${mine ? `<button class="btn btn-primary" data-action="wish-new">${ICON.plus} Ajouter une envie</button>` : ''}</div>
    <div class="kid-tabs">${people.map((m) => `<button class="kid-tab ${m.id === who ? 'on' : ''}" style="--c:${esc(m.color)}" data-action="wish-who" data-id="${esc(m.id)}">${avatar(m)} ${m.id === state.me.id ? 'Ma liste' : esc(m.name)}
      <span class="kid-stars">🎁 ${state.wishes.filter((w) => w.owner === m.id).length}</span></button>`).join('')}</div>
    ${!mine && list.length ? `<p class="small muted" style="margin:-4px 0 12px">🤫 ${esc(owner.name)} ne voit pas ce qui est réservé. Réservez un cadeau pour que personne d’autre ne l’offre en double.</p>` : ''}
    <div class="wish-grid">${list.map((w) => wishCard(w, mine)).join('')
      || `<div class="card empty-verif"><h2>${mine ? 'Votre liste est vide 🎁' : `${esc(owner.name)} n’a encore rien demandé`}</h2>
        <p class="muted">${mine ? 'Ajoutez ce qui vous ferait plaisir : un nom, une photo, un lien vers le magasin, un prix.' : 'Revenez plus tard 😉'}</p></div>`}</div>`;
}
function wishCard(w, mine) {
  const by = w.reservedBy ? member(w.reservedBy) : null;
  return `<div class="wish ${!mine && by ? 'reserved' : ''}">
    ${w.image ? `<button class="wish-img" data-action="open-att" data-id="${esc(w.image.id)}"><img src="${esc(w.image.thumb)}" alt=""></button>` : '<div class="wish-img empty">🎁</div>'}
    <div class="wish-body"><b>${w.prio ? '❤️ ' : ''}${esc(w.title)}</b>
      ${w.price ? `<span class="wish-price">${esc(w.price)}</span>` : ''}${w.note ? `<span class="small muted">${esc(w.note)}</span>` : ''}
      ${w.link ? `<a class="small" href="${esc(w.link)}" target="_blank" rel="noopener">🔗 Voir le produit</a>` : ''}</div>
    <div class="wish-actions">${mine ? `<button class="btn btn-sm" data-action="wish-edit" data-id="${esc(w.id)}">Modifier</button>`
      : by ? (by.id === state.me.id ? `<button class="btn btn-sm btn-valid" data-action="wish-reserve" data-id="${esc(w.id)}">✓ Réservé par vous</button>` : `<span class="wish-res">🔒 Réservé par ${esc(by.name)}</span>`)
      : `<button class="btn btn-sm btn-primary" data-action="wish-reserve" data-id="${esc(w.id)}">🎁 Je l’offre</button>`}</div>
  </div>`;
}
function openWish(w) {
  const isNew = !w;
  w = w || { title: '', link: '', price: '', note: '', prio: false };
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="wish-form" data-id="${esc(w.id || '')}" data-single="1">
    <h2 style="margin-bottom:14px">${isNew ? '🎁 Nouvelle envie' : 'Modifier'}</h2>
    <label class="field"><span>Quoi ?</span><input type="text" name="title" maxlength="80" required value="${esc(w.title)}" placeholder="Ex. Lego Harry Potter, livre, vélo…"></label>
    <div class="row"><label class="field"><span>Prix (environ)</span><input type="text" name="price" maxlength="20" value="${esc(w.price)}" placeholder="Ex. 35 €"></label>
      <label class="field"><span>Lien (magasin)</span><input type="text" inputmode="url" name="link" maxlength="400" value="${esc(w.link)}" placeholder="https://…"></label></div>
    <label class="field"><span>Précision</span><input type="text" name="note" maxlength="140" value="${esc(w.note)}" placeholder="Taille, couleur, modèle…"></label>
    <div class="field"><span>Photo</span><div class="att-box"><div class="att-list"></div>
      <label class="btn btn-sm att-add">📷 Ajouter une photo<input type="file" class="att-input" accept="image/*" hidden></label></div></div>
    <label class="check-line"><input type="checkbox" name="prio" ${w.prio ? 'checked' : ''}> ❤️ J’en ai très envie</label>
    <div class="modal-actions">${isNew ? '' : `<button type="button" class="btn btn-danger" data-action="wish-del" data-id="${esc(w.id)}">${ICON.trash} Retirer</button>`}<span class="grow"></span>
      <button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
  const f = $('#wish-form'); f.__att = w.image ? [{ ...w.image }] : []; f.__old = w.image ? [w.image.id] : []; renderAttach(f);
}
async function submitWish(f) {
  const title = f.title.value.trim();
  if (!title) return;
  let link = f.link.value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  if (f.__busy) { toast('📷 Un instant, photo en préparation…'); await f.__busy; }
  const [image] = await saveAttachments(f.__att || []);
  (f.__old || []).filter((x) => x !== image?.id).forEach((x) => save(backend.remove('attachments', x)));
  const data = { title, link, price: f.price.value.trim(), note: f.note.value.trim(), prio: f.prio.checked, image: image || null };
  if (f.dataset.id) save(backend.update('wishes', f.dataset.id, data));
  else save(backend.add('wishes', { ...data, owner: state.me.id, ts: Date.now(), reservedBy: null }));
  closeModal(); toast('🎁 Liste mise à jour');
}

/* ================= 🏖️ Vacances scolaires et 🇫🇷 jours fériés ================= */
const schoolZone = () => edtCfg().zone || 'A';
// Jours fériés calculés (dont Pâques, Ascension, Pentecôte).
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const feriesCache = {};
function feries(y) {
  if (feriesCache[y]) return feriesCache[y];
  const e = easter(y), F = {};
  [[`${y}-01-01`, 'Jour de l’an'], [ymd(addDays(e, 1)), 'Lundi de Pâques'], [`${y}-05-01`, 'Fête du travail'], [`${y}-05-08`, 'Victoire 1945'],
    [ymd(addDays(e, 39)), 'Ascension'], [ymd(addDays(e, 50)), 'Lundi de Pentecôte'], [`${y}-07-14`, 'Fête nationale'], [`${y}-08-15`, 'Assomption'],
    [`${y}-11-01`, 'Toussaint'], [`${y}-11-11`, 'Armistice'], [`${y}-12-25`, 'Noël']].forEach(([d, n]) => { F[d] = n; });
  return (feriesCache[y] = F);
}
const ferieOn = (d) => feries(Number(d.slice(0, 4)))[d] || '';
// Vacances : calendrier officiel (data.education.gouv.fr), gardé en mémoire ; quelques dates connues en secours.
const HOLIDAYS_FALLBACK = { A: [
  ['Vacances de la Toussaint', '2025-10-18', '2025-11-02'], ['Vacances de Noël', '2025-12-20', '2026-01-04'], ['Vacances d’hiver', '2026-02-07', '2026-02-22'],
  ['Vacances de printemps', '2026-04-04', '2026-04-19'], ['Pont de l’Ascension', '2026-05-14', '2026-05-17'], ['Vacances d’été', '2026-07-04', '2026-08-31'],
  ['Vacances de la Toussaint', '2026-10-17', '2026-11-01'], ['Vacances de Noël', '2026-12-19', '2027-01-03'],
] };
let holidays = null;
function holidayList() {
  if (holidays) return holidays;
  try { const c = JSON.parse(ls.get('kc-holidays-' + schoolZone())); if (c?.list) return (holidays = c.list); } catch {}
  return HOLIDAYS_FALLBACK[schoolZone()] || [];
}
async function loadHolidays() {
  const zone = schoolZone(), key = 'kc-holidays-' + zone;
  try { const c = JSON.parse(ls.get(key)); if (c && Date.now() - c.at < 7 * 864e5) { holidays = c.list; return; } } catch {}
  try {
    const from = `${new Date().getFullYear() - 1}-08-01`;
    const url = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?where=${encodeURIComponent(`zones="Zone ${zone}" and end_date>="${from}"`)}&limit=100&order_by=start_date`;
    const r = await fetch(url);
    const { results = [] } = await r.json();
    const seen = new Set(), list = [];
    for (const x of results) {
      if (/enseignant/i.test(x.population || '')) continue;
      // Dates converties à l'heure locale ; end_date = jour de la reprise des cours.
      const loc = (v) => (String(v).includes('T') ? ymd(new Date(v)) : String(v).slice(0, 10));
      let f0 = parseYmd(loc(x.start_date));
      if (f0.getDay() === 5) f0 = addDays(f0, 1); // « après les cours » du vendredi
      const from = ymd(f0), to = ymd(addDays(parseYmd(loc(x.end_date)), -1));
      const k = x.description + from;
      if (seen.has(k) || to < from) continue;
      seen.add(k); list.push([x.description, from, to]);
    }
    if (list.length) { holidays = list; ls.set(key, JSON.stringify({ at: Date.now(), list })); refresh(); }
  } catch (e) { console.warn('Vacances : calendrier officiel indisponible, dates de secours utilisées.', e); }
}
function holidayOn(d) {
  const h = holidayList().find(([, f, t]) => d >= f && d <= t);
  return h ? { name: h[0], short: h[0].replace(/^Vacances (de la |de |d’|d')?/i, '').replace(/^\w/, (c) => c.toUpperCase()), from: h[1], to: h[2] } : null;
}
function dayBanner(d) {
  const fer = ferieOn(d), hol = holidayOn(d);
  return (fer ? `<div class="day-banner ferie">🇫🇷 ${esc(fer)} — jour férié</div>` : '') + (hol ? `<div class="day-banner vac">🏖️ ${esc(hol.name)} (zone ${esc(schoolZone())}) · jusqu’au ${esc(shortDate(hol.to))}</div>` : '');
}
function holidayCountdown() {
  const t = todayStr(), cur = holidayOn(t);
  if (cur) return `<div class="holiday-banner on">🏖️ <b>${esc(cur.name)}</b> — bonnes vacances ! Reprise le ${esc(cap(parseYmd(ymd(addDays(parseYmd(cur.to), 1))).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })))}</div>`;
  const next = holidayList().filter(([, f]) => f > t).sort((a, b) => a[1].localeCompare(b[1]))[0];
  if (!next) return '';
  const days = Math.round((parseYmd(next[1]) - parseYmd(t)) / 864e5);
  if (days > 60) return '';
  return `<div class="holiday-banner">🏖️ Plus que <b>${days} dodo${days > 1 ? 's' : ''}</b> avant les ${esc(next[0].replace(/^Vacances /, 'vacances ').replace(/^Pont/, 'pont'))} !</div>`;
}

/* ================= 📸 Album photo familial ================= */
// Chaque photo : une miniature (liste, rapide) dans « photos » et la grande image dans « photoFull » (chargée à l'ouverture).
function resizeImage(file, max, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}
async function uploadPhotos(files) {
  const imgs = files.filter((f) => f.type.startsWith('image/')).slice(0, 20);
  if (!imgs.length) return;
  toast(`📸 Envoi de ${imgs.length} photo${imgs.length > 1 ? 's' : ''}…`);
  let n = 0;
  for (const [i, file] of imgs.entries()) {
    try {
      if (imgs.length > 1) toast(`📸 Photo ${i + 1}/${imgs.length}…`);
      const { thumb, full } = await prepareAttachment(file); // une seule lecture de la photo
      const id = 'p' + newCode().toLowerCase() + Date.now().toString(36);
      // Sans attendre le serveur : les envois partent en arrière-plan.
      save(backend.set('photoFull', id, { data: full }));
      save(backend.set('photos', id, { thumb, author: state.me.id, ts: Date.now() + n, caption: '', likes: [] }));
      n++;
    } catch (e) { console.error(e); toast(`Photo ${i + 1} illisible (format non pris en charge)`, true); }
  }
  if (n) {
    toast(`✅ ${n} photo${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} à l’album`);
    notify('all', { title: `📸 ${state.me.name} a ajouté ${n} photo${n > 1 ? 's' : ''}`, body: 'Venez voir l’album de la famille !', tag: 'album', view: 'album' });
  }
}
function albumView() {
  const ph = state.photos, young = isYoung(state.me);
  const groups = {};
  ph.forEach((p) => { const k = new Date(p.ts).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); (groups[k] ||= []).push(p); });
  return `<div class="view-head"><div><div class="eyebrow">Nos souvenirs</div><h1>📸 Album photo</h1></div>
      <div class="quick">${ph.length ? '<button class="btn" data-action="slideshow">▶ Diaporama</button>' : ''}
        ${young ? '' : `<label class="btn btn-primary">${ICON.plus} Ajouter des photos<input type="file" id="album-upload" accept="image/*" multiple hidden></label>`}</div></div>
    ${ph.length ? Object.entries(groups).map(([k, list]) => `<div class="section-title"><span>${esc(cap(k))}</span><span>${list.length} photo${list.length > 1 ? 's' : ''}</span></div>
      <div class="album-grid">${list.map((p) => `<button class="album-item" data-action="open-photo" data-id="${esc(p.id)}">
        <img src="${esc(p.thumb)}" alt="${esc(p.caption || 'Photo')}" loading="lazy">${(p.likes || []).length ? `<span class="album-likes">❤️ ${(p.likes || []).length}</span>` : ''}</button>`).join('')}</div>`).join('')
      : `<div class="card tint-sky album-empty"><h2>L’album est vide 📷</h2><p class="muted">Ajoutez vos plus belles photos de famille : elles apparaissent chez tout le monde,
        et l’écran de la Maison les fait défiler en diaporama quand personne ne s’en sert.</p></div>`}`;
}
function albumDashboardCard() {
  if (!state.photos.length) return '';
  return `<section class="card tint-sky"><div class="card-head"><h2>📸 Derniers souvenirs</h2><button class="btn btn-sm" data-action="nav" data-view="album">Album</button></div>
    <div class="album-strip">${state.photos.slice(0, 6).map((p) => `<button class="album-item" data-action="open-photo" data-id="${esc(p.id)}"><img src="${esc(p.thumb)}" alt="" loading="lazy"></button>`).join('')}</div></section>`;
}
const fullCache = new Map();
async function fullImage(id) {
  if (fullCache.has(id)) return fullCache.get(id);
  try { const d = await backend.get('photoFull', id); if (d?.data) { fullCache.set(id, d.data); return d.data; } } catch {}
  return null;
}
async function openPhoto(id) {
  const i = state.photos.findIndex((x) => x.id === id), p = state.photos[i];
  if (!p) return;
  const prev = state.photos[i - 1], next = state.photos[i + 1], a = member(p.author), liked = (p.likes || []).includes(state.me.id);
  const canDel = !isYoung(state.me) && (p.author === state.me.id || isParent(state.me));
  $('#modal-root').innerHTML = `<div class="modal-backdrop photo-backdrop" data-action="close-modal"><div class="modal photo-modal" data-id="${esc(p.id)}">
    <div class="photo-stage">${prev ? `<button class="photo-arrow left" data-action="photo-nav" data-id="${esc(prev.id)}" aria-label="Précédente">${ICON.left}</button>` : ''}
      <img id="photo-big" src="${esc(p.thumb)}" alt="">
      ${next ? `<button class="photo-arrow right" data-action="photo-nav" data-id="${esc(next.id)}" aria-label="Suivante">${ICON.right}</button>` : ''}</div>
    <div class="photo-info">${avatar(a)}<div style="flex:1;min-width:0"><b>${esc(a.name)}</b><div class="small muted">${new Date(p.ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
      <button class="btn btn-sm ${liked ? 'liked' : ''}" data-action="photo-like" data-id="${esc(p.id)}">${liked ? '❤️' : '🤍'} ${(p.likes || []).length || ''}</button>
      ${canDel ? `<button class="btn btn-sm btn-danger" data-action="photo-del" data-id="${esc(p.id)}">${ICON.trash}</button>` : ''}
      <button class="btn btn-sm btn-primary" data-action="close-modal-btn">Fermer</button></div>
    ${p.author === state.me.id && !isYoung(state.me) ? `<form id="caption-form" class="caption-form" data-id="${esc(p.id)}"><input type="text" name="caption" maxlength="140" value="${esc(p.caption || '')}" placeholder="Ajouter une légende…"><button class="btn btn-sm">OK</button></form>`
      : p.caption ? `<p class="photo-caption">${esc(p.caption)}</p>` : ''}
  </div></div>`;
  const full = await fullImage(p.id);
  const img = $('#photo-big');
  if (full && img && $('.photo-modal')?.dataset.id === p.id) img.src = full;
}
function likePhoto(id) {
  const p = state.photos.find((x) => x.id === id);
  if (!p) return;
  const likes = new Set(p.likes || []);
  if (likes.has(state.me.id)) likes.delete(state.me.id); else likes.add(state.me.id);
  p.likes = [...likes];
  save(backend.update('photos', id, { likes: p.likes }));
  openPhoto(id);
}
function deletePhoto(id) {
  if (!confirm('Supprimer cette photo de l’album ?')) return;
  save(backend.remove('photos', id)); save(backend.remove('photoFull', id));
  closeModal(); toast('Photo supprimée');
}
let slideIdx = 0, slideLoop = null;
async function startSlideshow(auto = false) {
  if (!state.photos.length || document.getElementById('slideshow')) return;
  closeModal();
  const el = document.createElement('div');
  el.id = 'slideshow';
  el.innerHTML = `<div class="ss-img a"></div><div class="ss-img b"></div>
    <div class="ss-overlay"><div class="ss-clock" id="ss-clock"></div><div class="ss-caption" id="ss-caption"></div></div>
    <div class="ss-hint">${auto ? 'Touchez l’écran pour revenir' : 'Touchez pour fermer'}</div>`;
  document.body.append(el);
  el.addEventListener('pointerdown', stopSlideshow);
  addEventListener('keydown', stopSlideshow, { once: true });
  slideIdx = 0;
  const show = async () => {
    const list = state.photos;
    if (!list.length || !document.getElementById('slideshow')) return;
    const p = list[slideIdx % list.length]; slideIdx++;
    const src = (await fullImage(p.id)) || p.thumb;
    const layers = el.querySelectorAll('.ss-img'), on = el.querySelector('.ss-img.on'), nxt = on === layers[0] ? layers[1] : layers[0];
    nxt.style.backgroundImage = `url("${src}")`;
    nxt.classList.add('on'); on?.classList.remove('on');
    const now = new Date();
    $('#ss-clock').innerHTML = `${clockHtml(now)}<small>${esc(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</small>`;
    $('#ss-caption').textContent = [p.caption, `📸 ${member(p.author).name} · ${new Date(p.ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`].filter(Boolean).join(' — ');
  };
  await show();
  slideLoop = setInterval(show, 8000);
}
function stopSlideshow() {
  clearInterval(slideLoop);
  document.getElementById('slideshow')?.remove();
  resetIdle();
}

/* ================= 🗳️ Sondages famille ================= */
function messagesHead() {
  const box = state.box || 'in', n = unreadCount(), pv = pollsToVote().length;
  return `<div class="view-head"><div><div class="eyebrow">Messagerie de ${esc(state.me.name)}</div><h1>Messages</h1></div>
      <div class="quick"><button class="btn btn-arrive" data-action="arrive">📍 Bien arrivé</button>
        ${box === 'polls' ? `<button class="btn btn-primary" data-action="new-poll">${ICON.plus} Sondage</button>` : `<button class="btn btn-primary" data-action="compose">${ICON.plus} Écrire</button>`}</div></div>
    <div class="seg box-tabs"><button class="${box === 'in' ? 'on' : ''}" data-action="box" data-box="in">📥 Reçus${n ? ` <span class="badge">${n}</span>` : ''}</button>
      <button class="${box === 'out' ? 'on' : ''}" data-action="box" data-box="out">📤 Envoyés</button>
      <button class="${box === 'polls' ? 'on' : ''}" data-action="box" data-box="polls">🗳️ Sondages${pv ? ` <span class="badge">${pv}</span>` : ''}</button></div>`;
}
const pollsToVote = () => (state.me ? state.polls.filter((p) => !p.closed && !(p.votes || {})[state.me.id]) : []);
let pollsBefore = null;
function onPolls(list) {
  const ids = new Set(list.map((p) => p.id));
  if (pollsBefore && state.me) for (const p of list) if (!pollsBefore.has(p.id) && p.author !== state.me.id) toast(`🗳️ Nouveau sondage de ${member(p.author).name} : ${p.question}`);
  pollsBefore = ids;
  state.polls = list.sort((a, b) => (a.closed ? 1 : 0) - (b.closed ? 1 : 0) || b.ts - a.ts);
  refresh();
}
function pollCard(p, compact = false) {
  const votes = p.votes || {}, total = Object.keys(votes).length, mine = votes[state.me.id], a = member(p.author);
  const canManage = p.author === state.me.id || isParent(state.me);
  const counts = Object.fromEntries(p.options.map((o) => [o.id, Object.values(votes).filter((v) => v === o.id).length]));
  const max = Math.max(0, ...Object.values(counts));
  return `<div class="poll ${p.closed ? 'closed' : ''}">
    <div class="poll-head">${avatar(a)}<div style="flex:1;min-width:0"><b class="poll-q">${esc(p.question)}</b>
      <div class="small muted">${esc(a.name)} · ${fmtWhen(p.ts)} · ${total} vote${total > 1 ? 's' : ''}${p.closed ? ' · 🔒 Terminé' : ''}</div></div></div>
    <div class="poll-opts">${p.options.map((o) => {
      const c = counts[o.id], pct = total ? Math.round((c / total) * 100) : 0, voters = Object.entries(votes).filter(([, v]) => v === o.id).map(([m]) => member(m));
      return `<button class="poll-opt ${mine === o.id ? 'mine' : ''} ${p.closed && c === max && c > 0 ? 'win' : ''}" data-action="poll-vote" data-id="${esc(p.id)}" data-opt="${esc(o.id)}" ${p.closed ? 'disabled' : ''}>
        <span class="poll-bar" style="width:${mine || p.closed ? pct : 0}%"></span>
        <span class="poll-txt">${mine === o.id ? '✓ ' : ''}${esc(o.text)}</span>
        ${mine || p.closed ? `<span class="poll-pct">${voters.length ? `<span class="avatars">${voters.map(avatar).join('')}</span>` : ''} ${pct}%</span>` : ''}</button>`;
    }).join('')}</div>
    ${!compact && canManage ? `<div class="poll-actions"><button class="btn btn-sm" data-action="poll-close" data-id="${esc(p.id)}">${p.closed ? 'Rouvrir' : '🔒 Clôturer'}</button>
      <button class="btn btn-sm btn-danger" data-action="poll-del" data-id="${esc(p.id)}">${ICON.trash}</button></div>` : ''}
  </div>`;
}
function pollsView() {
  return `<div class="list polls-list">${state.polls.map((p) => pollCard(p)).join('')
    || '<div class="card empty-verif"><h2>Aucun sondage 🗳️</h2><p class="muted">« Pizza ou burger ce soir ? », « Où partir en vacances ? »… Créez un sondage, toute la famille vote !</p></div>'}</div>`;
}
function pollsDashboardCard() {
  const open = state.polls.filter((p) => !p.closed).slice(0, 2);
  if (!open.length) return '';
  return `<section class="card tint-lilac"><div class="card-head"><h2>🗳️ Sondage${open.length > 1 ? 's' : ''} en cours</h2>
      <button class="btn btn-sm" data-action="box-polls">Tout voir</button></div>
    <div class="list">${open.map((p) => pollCard(p, true)).join('')}</div></section>`;
}
function votePoll(id, opt) {
  const p = state.polls.find((x) => x.id === id);
  if (!p || p.closed) return;
  p.votes = { ...(p.votes || {}), [state.me.id]: opt };
  save(backend.set('polls', id, { votes: { [state.me.id]: opt } }));
  refresh();
}
const pollOptLine = (v) => `<div class="task-line"><input type="text" maxlength="60" value="${esc(v)}" placeholder="Réponse possible"><button type="button" class="del" data-action="poll-del-opt" aria-label="Retirer">${ICON.trash}</button></div>`;
function openNewPoll() {
  const T = ['Qu’est-ce qu’on mange ce soir ?|🍕 Pizza|🍔 Burger|🍝 Pâtes|🥗 Salade', 'Quel film ce soir ?|Film d’animation|Comédie|Aventure',
    'Sortie du week-end ?|🌳 Parc|🏊 Piscine|🎳 Bowling|🏠 On reste à la maison', 'Où partir en vacances ?|🏖️ Mer|🏔️ Montagne|🏕️ Camping|🏙️ Ville'];
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="poll-form">
    <h2 style="margin-bottom:12px">🗳️ Nouveau sondage</h2>
    <div class="field"><span>Idées</span><div class="who">${T.map((t) => `<button type="button" class="who-chip" style="--c:#9B7BE0" data-action="poll-template" data-t="${esc(t)}">${esc(t.split('|')[0])}</button>`).join('')}</div></div>
    <label class="field"><span>Question</span><input type="text" name="question" maxlength="120" required placeholder="Ex. Pizza ou burger ce soir ?"></label>
    <div class="field"><span>Réponses possibles</span><div class="task-edit" id="poll-opts">${pollOptLine('')}${pollOptLine('')}</div>
      <button type="button" class="btn btn-sm" data-action="poll-add-opt" style="margin-top:8px;align-self:flex-start">${ICON.plus} Ajouter une réponse</button></div>
    <div class="error"></div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Lancer le sondage</button></div>
  </form></div>`;
  setTimeout(() => $('#poll-form [name=question]')?.focus(), 50);
}
function submitPoll(f) {
  const question = f.question.value.trim();
  const opts = [...new Set([...f.querySelectorAll('#poll-opts input')].map((i) => i.value.trim()).filter(Boolean))];
  if (!question) return;
  if (opts.length < 2) { f.querySelector('.error').textContent = 'Il faut au moins 2 réponses possibles.'; return; }
  save(backend.add('polls', { question, options: opts.map((t, i) => ({ id: 'o' + i, text: t })), votes: {}, author: state.me.id, ts: Date.now(), closed: false }));
  closeModal();
  toast('🗳️ Sondage lancé — toute la famille peut voter');
  notify('all', { title: `🗳️ Sondage de ${state.me.name}`, body: question, tag: 'poll', view: 'messages' });
}

/* ================= 📍 Je suis bien arrivé ================= */
const PLACES = [['ecole', '🏫 À l’école'], ['maison', '🏠 À la maison'], ['sport', '⚽ Au sport'], ['papi', '👵 Chez Papi & Mamie'],
  ['copain', '🧑‍🤝‍🧑 Chez un copain'], ['travail', '💼 Au travail'], ['autre', '✏️ Autre…']];
function openArrive() {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="close-modal"><form class="modal" id="arrive-form" data-place="ecole">
    <h2 style="margin-bottom:6px">📍 Je suis bien arrivé(e)</h2>
    <p class="muted small" style="margin:0 0 14px">Toute la famille est prévenue tout de suite.</p>
    <div class="who arrive-places">${PLACES.map(([k, l], i) => `<button type="button" class="who-chip ${i === 0 ? 'on' : ''}" style="--c:#3FB0A4" data-action="arrive-place" data-place="${k}">${l}</button>`).join('')}</div>
    <label class="field arrive-other hidden" style="margin-top:12px"><span>Où ça ?</span><input type="text" name="other" maxlength="60" placeholder="Ex. chez Léa, au cinéma…"></label>
    <label class="check-line" style="margin-top:14px"><input type="checkbox" name="geo"> Joindre ma position (carte)</label>
    <div class="error"></div>
    <div class="modal-actions"><span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">📍 Prévenir la famille</button></div>
  </form></div>`;
}
async function submitArrive(f) {
  const k = f.dataset.place, label = k === 'autre' ? (f.other.value.trim() ? (/^(à|au|chez|en|dans)\b/i.test(f.other.value.trim()) ? f.other.value.trim() : 'à ' + f.other.value.trim()) : '') : PLACES.find((p) => p[0] === k)[1].replace(/^\S+\s/, '');
  if (!label) { f.querySelector('.error').textContent = 'Indiquez où vous êtes.'; return; }
  const btn = f.querySelector('.btn-primary'); btn.disabled = true;
  let map = '';
  if (f.geo.checked && navigator.geolocation) {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }));
      map = `https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
    } catch { toast('Position indisponible, message envoyé sans la carte.'); }
  }
  const time = fmtTime(Date.now()), short = label.replace(/^(à la |à l’|à l'|à |au |en )/i, '');
  const text = `📍 ${state.me.name} est bien arrivé(e) ${label} à ${time}.${map ? `\n🗺️ ${map}` : ''}`;
  save(backend.add('messages', { from: state.me.id, to: null, subject: '📍 Bien arrivé', text, kind: 'arrive', ts: Date.now(), readBy: [state.me.id] }));
  save(backend.set('presence', deviceId, { memberId: state.me.id, place: cap(short), placeAt: Date.now() }));
  notify('all', { title: `📍 ${state.me.name} est bien arrivé(e)`, body: `${cap(label)} à ${time}`, tag: 'arrive-' + state.me.id, view: 'messages' });
  closeModal();
  toast('📍 La famille est prévenue !');
}

/* ================= Notifications push (même appli fermée) ================= */
// Chaque appareil s'abonne aux notifications et enregistre son abonnement dans la famille (collection « push »),
// associé à la personne connectée. Pour prévenir quelqu'un, l'appli demande au service Cloudflare (/api/push)
// d'envoyer la notification aux appareils de cette personne.
const VAPID_PUBLIC = 'BJdTOa_jiWM3s3qns3mb00x3Jt9egmlR2eftZNYbYCvye7ebg10Kf2uFCLi78DjxuvsZlHjtq7SDknef_8MyIMo';
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function syncPush(ask = false) {
  if (!pushSupported() || !state.me || !state.family || backend.mode !== 'cloud') return;
  if (Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(VAPID_PUBLIC) });
    save(backend.set('push', deviceId, { memberId: state.me.id, sub: JSON.parse(JSON.stringify(sub)), kind: deviceKind(), updatedAt: Date.now() }));
    if (ask) toast('🔔 Notifications activées sur cet appareil');
  } catch (e) {
    console.error(e);
    if (ask) toast('Impossible d’activer les notifications sur cet appareil.', true);
  }
}
function b64uToBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
// targets : 'all' (toute la famille sauf moi) ou liste d'identifiants de membres.
let pushWarned = false;
async function notify(targets, { title, body = '', tag = '', view = '' }, { includeSelf = false } = {}) {
  if (backend.mode !== 'cloud' || !state.me) return;
  const ids = targets === 'all' ? state.members.map((m) => m.id) : targets;
  const subs = state.push.filter((p) => p.sub?.endpoint && ids.includes(p.memberId) && (includeSelf || (p.memberId !== state.me.id && p.id !== deviceId)));
  if (!subs.length) return;
  try {
    const r = await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subs: subs.map((p) => p.sub), payload: { title, body: String(body).slice(0, 240), tag, url: view ? `./?vue=${view}` : './' } }) });
    if (r.status === 503 && !pushWarned) { pushWarned = true; if (isParent(state.me)) toast('Les notifications push ne sont pas encore configurées sur Cloudflare (voir LISEZMOI).', true); }
    if (!r.ok) return;
    const { results = [] } = await r.json();
    // Abonnements expirés (appli désinstallée…) : on les retire.
    for (const res of results) if (res.status === 404 || res.status === 410) {
      const dead = subs.find((p) => p.sub.endpoint === res.endpoint);
      if (dead) save(backend.remove('push', dead.id));
    }
  } catch (e) { console.error(e); }
}

navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type !== 'open-view') return;
  const v = new URL(e.data.url).searchParams.get('vue');
  if (v && state.me && NAV.some((n) => n[0] === v)) go(v);
});

/* ================= Aide notifications (iPhone / iPad) ================= */
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function notifHelp(notif) {
  if (notif === 'granted') return '';
  if (isIOS() && !isStandalone()) return `<div class="notif-help"><b>📱 Sur iPhone / iPad, Apple n’autorise les notifications que dans l’appli installée :</b>
    <ol><li>Ouvrez cette page dans <b>Safari</b> (iOS 16.4 ou plus récent)</li>
      <li>Touchez <b>Partager</b> <span class="ios-share">⬆︎</span> puis <b>« Sur l’écran d’accueil »</b> → Ajouter</li>
      <li>Ouvrez <b>Kids &amp; Co depuis l’icône</b>, reconnectez-vous, puis revenez ici et touchez <b>Activer</b></li></ol></div>`;
  if (isIOS() && notif === 'unsupported') return '<div class="notif-help">Votre iPhone doit être en <b>iOS 16.4 ou plus récent</b> (Réglages → Général → Mise à jour logicielle).</div>';
  if (notif === 'denied') return `<div class="notif-help">Les notifications ont été refusées. Pour les réactiver : ${isIOS() ? '<b>Réglages de l’iPhone → Notifications → Kids &amp; Co</b> → Autoriser' : 'cliquez sur le <b>cadenas</b> à gauche de l’adresse → Notifications → Autoriser'}, puis rechargez l’appli.</div>`;
  return '';
}

/* ================= Verrouillage de l'appli (code secret ou empreinte / Face ID) ================= */
// Réglage propre à chaque appareil et à chaque personne. Quand on quitte l'appli et qu'on revient
// (après le délai choisi), un écran demande le code secret ou l'empreinte du téléphone.
const lockKey = () => `kc-lock:${state.family?.id || ''}:${state.me?.id || ''}`;
function lockCfg() { try { return JSON.parse(ls.get(lockKey())) || {}; } catch { return {}; } }
function setLockCfg(c) { ls.set(lockKey(), JSON.stringify(c)); }
const bytesToB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let hiddenAt = 0, locked = false, lockDigits = '', lockTries = 0, lockUntil = 0;
state.bioAvail = false;
(async () => { try { state.bioAvail = !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch {} })();

document.addEventListener('visibilitychange', () => {
  const c = lockCfg();
  if (!state.me || !c.on || isMaison(state.me)) return;
  if (document.hidden) {
    hiddenAt = Date.now();
    if (!c.delay) showLock(); // « immédiatement » : on masque aussi l'écran dans le sélecteur d'applis
  } else if (!locked && hiddenAt && Date.now() - hiddenAt >= (c.delay || 0) * 1000) showLock();
});

function lockCard() {
  if (!state.me || isMaison(state.me)) return '';
  return `<section class="card lock-card"><h2 style="margin-bottom:4px">🔒 Code et empreinte</h2>
    <p class="muted small" style="margin:0 0 6px">Protège l’appli sur ce téléphone quand vous la quittez.</p>${lockSettings()}</section>`;
}
function lockSettings() {
  if (!state.me || isMaison(state.me)) return '';
  const c = lockCfg(), canPin = !!state.me.pinHash;
  return `<div class="switch-line"><div><b>🔒 Verrouiller quand je quitte l’appli</b>
      <div class="small muted">${canPin ? 'Au retour, il faut votre code secret' + (c.cred ? ' ou votre empreinte / Face ID' : '') + '.' : 'Créez d’abord un code secret (Modifier mon compte).'}</div></div>
      ${canPin ? `<button class="btn btn-sm ${c.on ? 'btn-primary' : ''}" data-action="lock-toggle">${c.on ? 'Activé' : 'Activer'}</button>` : ''}</div>
    ${c.on ? `<div class="switch-line sub"><b>Verrouiller</b><select data-action="lock-delay">
        ${[[0, 'Immédiatement'], [60, 'Après 1 minute'], [300, 'Après 5 minutes'], [900, 'Après 15 minutes']].map(([v, l]) => `<option value="${v}" ${(c.delay || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="switch-line sub"><div><b>👆 Empreinte / Face ID</b><div class="small muted">${state.bioAvail ? 'Déverrouiller avec le capteur du téléphone.' : 'Non disponible sur cet appareil ou ce navigateur.'}</div></div>
        ${state.bioAvail ? `<button class="btn btn-sm ${c.cred ? 'btn-primary' : ''}" data-action="bio-toggle">${c.cred ? 'Activée' : 'Activer'}</button>` : ''}</div>` : ''}`;
}

async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Kids & Co', id: location.hostname },
    user: { id: new TextEncoder().encode(state.me.id), name: fullName(state.me), displayName: fullName(state.me) },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000,
  } });
  return bytesToB64u(cred.rawId);
}
async function bioCheck(id) {
  const res = await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname,
    allowCredentials: [{ type: 'public-key', id: b64uToBytes(id) }], userVerification: 'required', timeout: 60000,
  } });
  return !!res;
}

function showLock() {
  if (!state.me || locked) return;
  locked = true; lockDigits = '';
  const m = state.me, c = lockCfg();
  let root = document.getElementById('lock-root');
  if (!root) { root = document.createElement('div'); root.id = 'lock-root'; document.body.append(root); }
  root.innerHTML = `<div class="lock-screen"><div class="lock-box">
    <img src="logo.png" alt="" class="lock-logo">
    <span class="profile-avatar${hasPhoto(m) ? ` photo ph-${cssId(m.id)}` : ''}" style="--c:${esc(m.color)}">${faceText(m)}</span>
    <h2>${esc(m.name)}</h2><p class="muted" id="lock-sub">🔒 Appli verrouillée — tapez votre code</p>
    <div class="pin-dots" id="lock-dots">${'<span class="pin-dot"></span>'.repeat(4)}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button class="key" data-action="lock-key" data-k="${k}">${k}</button>`).join('')}
      ${c.cred ? '<button class="key ghost bio" data-action="lock-bio" aria-label="Empreinte / Face ID">👆</button>' : '<span></span>'}
      <button class="key" data-action="lock-key" data-k="0">0</button>
      <button class="key ghost" data-action="lock-key" data-k="del" aria-label="Effacer">⌫</button></div>
    <button class="link" data-action="lock-switch">Ce n’est pas moi — changer d’utilisateur</button>
  </div></div>`;
  if (c.cred && !document.hidden) setTimeout(() => unlockBio(true), 350);
}
function unlock() {
  locked = false; lockTries = 0;
  document.getElementById('lock-root')?.remove();
  hiddenAt = 0;
}
async function unlockBio(auto = false) {
  const c = lockCfg();
  if (!c.cred || !locked) return;
  try { if (await bioCheck(c.cred)) unlock(); }
  catch { if (!auto) { const sub = $('#lock-sub'); if (sub) sub.textContent = 'Empreinte non reconnue — utilisez votre code'; } }
}
async function lockKeyPress(k) {
  if (!locked || Date.now() < lockUntil) return;
  if (k === 'del') lockDigits = lockDigits.slice(0, -1);
  else if (lockDigits.length < 4) lockDigits += k;
  $('#lock-dots')?.querySelectorAll('.pin-dot').forEach((d, i) => d.classList.toggle('on', i < lockDigits.length));
  if (lockDigits.length < 4) return;
  const ok = (await hashPin(lockDigits, state.me.id)) === state.me.pinHash;
  lockDigits = '';
  if (ok) return unlock();
  const box = $('.lock-box');
  box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
  $('#lock-dots').querySelectorAll('.pin-dot').forEach((d) => d.classList.remove('on'));
  if (++lockTries >= 5) { lockTries = 0; lockUntil = Date.now() + 30000; $('#lock-sub').textContent = 'Trop d’essais : attendez 30 secondes.'; }
  else $('#lock-sub').textContent = 'Code incorrect, réessayez.';
}
document.addEventListener('keydown', (e) => {
  if (!locked) return;
  if (/^[0-9]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); lockKeyPress(e.key); }
  else if (e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); lockKeyPress('del'); }
}, true);

(async function boot() {
  // Ouverture via le QR code (?famille=CODE) : on garde le code pour l'écran de connexion.
  const vue = new URLSearchParams(location.search).get('vue');
  if (vue) { state.pendingView = vue; history.replaceState(null, '', location.pathname); }
  const qrCode = new URLSearchParams(location.search).get('famille');
  if (qrCode && /^[A-Z0-9]{8}$/i.test(qrCode)) { ls.set('kc-famille-qr', qrCode.toUpperCase()); history.replaceState(null, '', location.pathname); }
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
