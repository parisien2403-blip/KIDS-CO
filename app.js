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
// Avatars proposés pour les profils (les enfants adorent choisir le leur).
const EMOJIS = ['🦁', '🐼', '🦊', '🐱', '🐶', '🐸', '🦄', '🐙', '🐝', '🦋', '🐢', '🐬', '⭐', '🌈', '⚽', '🎮', '🎨', '🚀', '🎸', '🌸', '🍕', '🧁', '👑', '🏠'];
const isMaison = (m) => !!m && m.role === 'maison';
const isParent = (m) => !!m && m.role !== 'enfant' && m.role !== 'maison';
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
      if (i >= 0) arr[i] = { ...arr[i], ...data }; else arr.push({ id, ...data });
      write(col, arr);
    },
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
  members: [], events: [], messages: [], notes: [], cours: [], edtNotes: [], edtConfig: {}, presence: [],
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
  else if (state.membersLoaded && !$('#modal-root').innerHTML && $('.who-screen')) renderWho();
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
        <span class="mini-status">${esc(presenceText(pr))}</span></span></span>
  </button>`;
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
    ev.alert?.on ? '🔔' : '', ev.verify ? '📌 À vérifier' : '', ev.notes ? '📝' : ''].filter(Boolean).join(' · ');
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

function renderWho() {
  state.me = null;
  closeModal();
  if (!state.membersLoaded) {
    $('#app').innerHTML = '<div class="splash"><img src="logo.png" alt="" width="96" height="96"><p class="wordmark">Kids &amp; Co</p></div>';
    return;
  }
  if (!state.members.length) return renderFirstProfile();
  $('#app').innerHTML = `<div class="auth who-screen"><div class="who-wrap">
    <img class="who-logo" src="logo.png" alt="">
    <div class="eyebrow">${esc(state.family.name)}</div>
    <h1>Qui est là ?</h1>
    <div class="profiles">
      ${state.members.map((m) => `<button class="profile ${presenceOf(m.id).online ? 'online' : ''}" style="--c:${esc(m.color)}" data-action="pick-profile" data-id="${esc(m.id)}" title="${esc(presenceText(presenceOf(m.id)))}">
        <span class="profile-avatar${hasPhoto(m) ? ` photo ph-${cssId(m.id)}` : ''}">${faceText(m)}</span>
        <span class="profile-name">${esc(m.name)}</span>
        <span class="profile-tag">${m.pinHash ? '🔒 ' : ''}${roleLabel(m)}</span></button>`).join('')}
      <button class="profile add" data-action="add-member-start"><span class="profile-avatar">${ICON.plus}</span><span class="profile-name">Ajouter</span><span class="profile-tag">Nouveau membre</span></button>
    </div>
    ${backend.mode === 'cloud' ? '<button class="link" data-action="logout">Déconnecter cet appareil</button>'
      : '<p class="demo-banner" style="display:inline-block">Mode démo : les profils restent sur cet appareil.</p>'}
  </div></div>`;
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
  renderShell();
  resetIdle();
  beat();
  if (!quiet) toast(`Bonjour ${m.name} ${hasPhoto(m) ? '👋' : m.emoji || '👋'}`);
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
    <details class="more-opts"><summary>Pas de photo ? Choisir un avatar rigolo</summary>
      <div class="emojis" style="margin-top:10px">
        <button type="button" class="emoji-opt ${m.emoji ? '' : 'on'}" data-action="pick-emoji" data-emoji="" title="Initiale">Aa</button>
        ${EMOJIS.map((e) => `<button type="button" class="emoji-opt ${m.emoji === e ? 'on' : ''}" data-action="pick-emoji" data-emoji="${e}">${e}</button>`).join('')}</div></details>
    <div class="field"><span>Couleur</span>${colorPicker(m.color)}</div>
    <label class="field"><span>Code secret (4 chiffres${first ? ', conseillé pour un parent' : ', facultatif'})</span>
      <input type="password" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="new-password"
        placeholder="${m.pinHash ? '•••• (laisser vide pour garder le code actuel)' : 'Ex. 2580'}"></label>
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
  if (old && isParent(old) && role !== 'parent' && state.members.filter(isParent).length === 1) {
    errEl.textContent = 'Il faut garder au moins un parent dans la famille.'; return;
  }
  const data = { name, lastName, role, color: form.dataset.color, emoji: form.dataset.emoji, createdAt: old?.createdAt || Date.now() };
  if (memberPhoto !== undefined) data.photo = memberPhoto || null;
  try {
    if (pinVal) data.pinHash = await hashPin(pinVal, id);
    else if (fd.get('nopin')) data.pinHash = null;
  } catch { errEl.textContent = 'Le code secret nécessite une connexion sécurisée (https).'; return; }
  save(backend.set('membres', id, data));
  const saved = { id, ...old, ...data };
  closeModal();
  if (state.me?.id === id) { state.me = saved; refresh(); }
  if (first) return openCard(saved, { welcome: true, onDone: () => startAs(saved) });
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
    : [['Nom', (m.lastName || '—').toUpperCase()], ['Prénom', m.name], ['Statut', roleLabel(m)], ['Famille', state.family.name], ['Membre depuis', since]];
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
  stopSubs();
  state.user = user;
  state.me = null;
  if (!user) return renderLogin();
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
  if (!family) return renderFamilySetup();

  state.family = family;
  state.loadedMessages = false;
  state.membersLoaded = false;
  state.edtNotesLoaded = false;
  doneBefore = null;
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
    backend.subscribe('edtConfig', (list) => { state.edtConfig = list.find((x) => x.id === 'main') || {}; refresh(); }),
    backend.subscribe('presence', onPresence),
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
  ['edt', 'Emploi du temps', 'book', 'Lycée'], ['messages', 'Messages', 'chat'],
  ['important', 'Pense-bête', 'star', 'Notes', true], ['reglages', 'Réglages', 'gear'],
];
function navButtons(short = false) {
  const badges = { messages: unreadCount(), verif: verifItems().filter((i) => !i.done).length };
  return NAV.filter((n) => !(short && n[4])).map(([id, label, icon, s]) => `<button class="nav-btn ${state.view === id ? 'active' : ''}" data-action="nav" data-view="${id}">
    ${ICON[icon]}<span>${short && s ? s : label}</span>${badges[id] ? `<span class="badge">${badges[id]}</span>` : ''}</button>`).join('');
}
function renderShell() {
  $('#app').innerHTML = `<div class="shell">
    <nav class="sidebar"><div class="brand"><img src="logo.png" alt=""><span class="brand-name">Kids &amp; Co</span><small id="fam-name">${esc(state.family.name)}</small></div>
      <div id="nav-side"></div>
      <div class="me-card" id="me-card"></div></nav>
    <header class="topbar"><img src="logo.png" alt=""><div><span class="brand-name">Kids &amp; Co</span><small id="fam-name-top">${esc(state.family.name)}</small></div>
      <button class="me-btn" data-action="switch-user" aria-label="Changer d’utilisateur" id="me-btn"></button></header>
    <main id="main"></main>
    <nav class="tabbar" id="nav-tab"></nav>
  </div>`;
  refresh();
}

// Redessine la vue en gardant ce que l'utilisateur est en train de taper.
function refresh() {
  const main = $('#main');
  if (!main || !state.me) return;
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
    return `<div class="dash-head">
        <div class="hero">
          <div class="greet">${hello} ${isMaison(state.me) ? 'la famille' : esc(state.me.name)}</div>
          <div class="clock" id="clock">${clockHtml(now)}</div>
          <div class="today-label">${esc(dateTxt)}</div></div>
        <div class="quick">
          <button class="btn btn-primary" data-action="new-event" data-date="${t}">${ICON.plus} Rendez-vous</button>
          <button class="btn" data-action="nav" data-view="important">${ICON.star} Pense-bête</button>
          <button class="btn" data-action="compose">${ICON.chat} Message</button>
        </div></div>
      ${presenceStrip()}
      <div class="dash-grid">
        <section class="card tint-peach"><div class="card-head"><h2>Aujourd’hui</h2><span class="muted small">${today.length || 'Rien'} prévu${today.length > 1 ? 's' : ''}</span></div>
          <div class="list">${today.map((ev) => evItem(ev)).join('') || '<div class="empty">Journée libre ☀️</div>'}</div></section>
        <section class="card tint-butter"><div class="card-head"><h2>À ne pas oublier</h2><button class="btn btn-sm" data-action="nav" data-view="important">Tout voir</button></div>
          <div class="list">${important.map(noteItem).join('') || '<div class="empty">Rien à signaler.</div>'}</div></section>
        <section class="card tint-mint"><div class="card-head"><h2>À venir</h2><button class="btn btn-sm" data-action="nav" data-view="agenda">Agenda</button></div>
          ${upcoming.map((d) => `<div class="day-group"><h3>${d === ymd(addDays(now, 1)) ? 'Demain' : esc(fmtLong(parseYmd(d)))}</h3>
            <div class="list">${map[d].map((ev) => evItem(ev)).join('')}</div></div>`).join('') || '<div class="empty">Rien dans les 2 prochaines semaines.</div>'}</section>
        ${edtDashboardCard()}
        <section class="card tint-sky"><div class="card-head"><h2>Ma boîte de réception${unread ? ` <span class="badge" style="margin-left:6px">${unread}</span>` : ''}</h2><button class="btn btn-sm" data-action="nav" data-view="messages">Tout voir</button></div>
          <div class="list">${myMail.map((m) => mailItem(m, 'in', true)).join('') || '<div class="empty">Aucun message pour vous.</div>'}</div></section>
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
        <button class="btn btn-primary" data-action="new-event" data-date="${sel}">${ICON.plus} Ajouter</button></div>
      <div class="agenda">
        <div><div class="cal">${DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
          <div class="legend"><span><i class="lg imp1"></i>Important</span><span><i class="lg imp2"></i>Urgent</span><span>🔁 Répété</span><span>🔔 Alerte</span></div></div>
        <section class="card day-panel"><div class="card-head"><h2>${esc(fmtLong(parseYmd(sel)))}</h2>
          <button class="btn btn-icon" data-action="new-event" data-date="${sel}" aria-label="Ajouter ce jour">${ICON.plus}</button></div>
          <div class="list">${selEvents.map((ev) => evItem(ev)).join('') || '<div class="empty">Rien de prévu ce jour-là.</div>'}</div></section>
      </div>`;
  },

  messages() {
    const box = state.box || 'in';
    const list = box === 'out' ? outbox() : inbox();
    const n = unreadCount();
    return `<div class="view-head"><div><div class="eyebrow">Messagerie de ${esc(state.me.name)}</div><h1>Messages</h1></div>
        <button class="btn btn-primary" data-action="compose">${ICON.plus} Écrire</button></div>
      <div class="seg box-tabs"><button class="${box === 'in' ? 'on' : ''}" data-action="box" data-box="in">📥 Boîte de réception${n ? ` <span class="badge">${n}</span>` : ''}</button>
        <button class="${box === 'out' ? 'on' : ''}" data-action="box" data-box="out">📤 Boîte d’envoi</button></div>
      <div class="list mail-list">${list.map((m) => mailItem(m, box)).join('')
        || `<div class="empty">${box === 'out' ? 'Vous n’avez encore envoyé aucun message.' : 'Aucun message reçu pour l’instant.'}</div>`}</div>`;
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
        <button class="btn btn-primary">${ICON.plus} Ajouter</button>
      </form>
      <div class="list">${open.map(noteItem).join('') || '<div class="empty">Rien à faire, profitez-en !</div>'}</div>
      ${done.length ? `<div class="section-title"><span>Terminé (${done.length})</span><span>
        <button class="btn btn-sm" data-action="toggle-done">${state.showDone ? 'Masquer' : 'Afficher'}</button>
        <button class="btn btn-sm btn-danger" data-action="clear-done">Tout effacer</button></span></div>
        ${state.showDone ? `<div class="list">${done.map(noteItem).join('')}</div>` : ''}` : ''}`;
  },

  edt() {
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
            const ns = notesFor(c.id, k), cancel = ns.some((n) => EDT_TYPES[n.type]?.cancel);
            return `<button class="edt-block ${cancel ? 'cancel' : ''} ${ns.length ? 'has-notes' : ''}" style="top:${top}px;height:${h}px;--c:${esc(c.color || '#4FB9E8')}" data-action="open-course" data-id="${esc(c.id)}" data-date="${k}">
              <b>${esc(c.subject)}</b><span>${esc(c.start)}–${esc(c.end)}${c.room ? ' · ' + esc(c.room) : ''}</span>${c.teacher && h > 62 ? `<span>${esc(c.teacher)}</span>` : ''}
              ${ns.length ? `<span class="edt-badges">${ns.map((n) => `<i title="${esc(EDT_TYPES[n.type]?.label || '')}">${(EDT_TYPES[n.type]?.label || '💬').split(' ')[0]}</i>`).join('')}</span>` : ''}</button>`;
          }).join('')}
          ${k === t && nowMin >= minH * 60 && nowMin <= maxH * 60 ? `<div class="edt-now" style="top:${(nowMin - minH * 60) * PPM}px"></div>` : ''}
        </div></div>`;
    }).join('');
    const sel = Math.min(state.edtDay ?? Math.max(0, Math.min(nDays - 1, (new Date().getDay() + 6) % 7)), nDays - 1);
    const selDate = ymd(days[sel]), selNotes = notesFor('', selDate), selList = coursesOn(selDate);
    const end = days[nDays - 1];
    return `<div class="view-head"><div><div class="eyebrow">Emploi du temps${student ? ' de ' + esc(student.name) : ''}</div><h1>${esc(cfg.title)}</h1></div>
        <div class="cal-nav"><button class="btn btn-icon" data-action="edt-week" data-delta="-1" aria-label="Semaine précédente">${ICON.left}</button>
          <h2 class="edt-weeklabel">Du ${mon.getDate()} au ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'long' })}${wt ? ` <span class="week-ab">Semaine ${wt}</span>` : ''}</h2>
          <button class="btn btn-icon" data-action="edt-week" data-delta="1" aria-label="Semaine suivante">${ICON.right}</button>
          <button class="btn btn-sm" data-action="edt-week" data-delta="0">Cette semaine</button></div>
        <div class="quick"><button class="btn btn-sm" data-action="edt-settings">⚙️ Réglages</button>
          <button class="btn btn-primary" data-action="edit-course" data-id="">${ICON.plus} Cours</button></div></div>
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
        <section class="card"><h2 style="margin-bottom:10px">La famille</h2>
          ${state.members.map((m) => `<div class="member-line"><button class="member-open" data-action="show-card" data-id="${esc(m.id)}">${avatar(m)}<div><b>${esc(fullName(m))}</b>${m.id === state.me.id ? ' <span class="muted small">(vous)</span>' : ''}
              <div class="small muted">${roleLabel(m)}${m.pinHash ? ' · 🔒' : ''} · voir la carte</div></div></button>
            ${isParent(state.me) || m.id === state.me.id ? `<button class="btn btn-sm" data-action="edit-member" data-id="${esc(m.id)}">Modifier</button>` : ''}</div>`).join('')}
          ${isParent(state.me) ? `<div class="quick" style="margin-top:10px"><button class="btn btn-sm" data-action="add-member">${ICON.plus} Ajouter un membre</button>
            ${state.members.some(isMaison) ? '' : `<button class="btn btn-sm" data-action="add-maison">🏠 Créer le compte Maison</button>`}</div>` : ''}
          <form id="family-form" style="margin-top:18px"><label class="field"><span>Nom de la famille</span>
            <input type="text" id="f-name" value="${esc(state.family.name)}" maxlength="40" ${isParent(state.me) ? '' : 'disabled'}></label></form>
          ${backend.mode === 'cloud' ? `<p class="muted small" style="margin:4px 0 0">Code pour connecter un nouvel appareil (téléphone, tablette, PC) à la famille :</p>
            <div class="invite">${esc(state.family.id)}</div>
            <button class="btn btn-sm" data-action="share-code">Partager le code</button>` : ''}
        </section>
        <section class="card"><h2 style="margin-bottom:6px">Cet appareil</h2>
          <div class="switch-line"><div><b>Mode tablette de la maison</b><div class="small muted">Écran toujours allumé, retour à l’accueil après 2 min.</div></div>
            <button class="btn btn-sm ${tablet ? 'btn-primary' : ''}" data-action="toggle-tablet">${tablet ? 'Activé' : 'Activer'}</button></div>
          <div class="switch-line"><div><b>Demander « Qui est là ? » à chaque ouverture</b><div class="small muted">Conseillé sur la tablette de la cuisine.</div></div>
            <button class="btn btn-sm ${ls.get('kc-ask') === '1' ? 'btn-primary' : ''}" data-action="toggle-ask">${ls.get('kc-ask') === '1' ? 'Activé' : 'Activer'}</button></div>
          <div class="switch-line"><b>Thème</b><select data-action="theme">
            ${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<option value="${v}" ${theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="switch-line"><div><b>Notifications</b><div class="small muted">Alerte quand un message arrive et que l’appli est en arrière-plan.</div></div>
            ${notif === 'granted' ? '<span class="small muted">Activées</span>' : notif === 'denied' ? '<span class="small muted">Bloquées par le navigateur</span>'
              : notif === 'unsupported' ? '<span class="small muted">Non disponible</span>' : '<button class="btn btn-sm" data-action="notif">Activer</button>'}</div>
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
    <div class="mail-text">${esc(m.text)}</div>
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
  closeModal();
  toast('Message envoyé ✉️');
}

/* ================= Emploi du temps du lycée ================= */
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
function courseRow(c, date) {
  const ns = notesFor(c.id, date), cancel = ns.some((n) => EDT_TYPES[n.type]?.cancel);
  return `<button class="edt-row ${cancel ? 'cancel' : ''}" style="--c:${esc(c.color || '#4FB9E8')}" data-action="open-course" data-id="${esc(c.id)}" data-date="${date}">
    <span class="edt-time">${esc(c.start)}<small>${esc(c.end)}</small></span>
    <span class="edt-info"><b>${esc(c.subject)}</b><span class="muted small">${[c.room && 'Salle ' + c.room, c.teacher].filter(Boolean).map(esc).join(' · ')}</span>
      ${ns.map(edtNoteLine).join('')}</span></button>`;
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
    <div class="modal-actions">${c ? `<button class="btn" data-action="edit-course" data-id="${esc(c.id)}">✏️ Modifier le cours</button>` : ''}<span class="grow"></span>
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
    <div class="row"><label class="field"><span>Jour</span><select name="day">${EDT_DAYS.slice(0, cfg.saturday ? 6 : 5).map((d, i) => `<option value="${i + 1}" ${Number(c.day) === i + 1 ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label class="field"><span>Début</span><input type="time" name="start" value="${esc(c.start)}" required></label>
      <label class="field"><span>Fin</span><input type="time" name="end" value="${esc(c.end)}" required></label></div>
    <label class="field"><span>Quelles semaines ?</span><select name="weeks">
      ${[['all', 'Toutes les semaines'], ['A', 'Semaine A seulement'], ['B', 'Semaine B seulement']].map(([v, l]) => `<option value="${v}" ${(c.weeks || 'all') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="field"><span>Couleur</span><div class="colors">${SUBJECT_COLORS.map((x) => `<button type="button" class="color-dot ${x === c.color ? 'on' : ''}" style="--c:${x}" data-action="pick-color" data-color="${x}" aria-label="Couleur"></button>`).join('')}</div></div>
    <div class="error"></div>
    <div class="modal-actions">${isNew ? '' : `<button type="button" class="btn btn-danger" data-action="delete-course">${ICON.trash} Supprimer</button>`}<span class="grow"></span>
      <button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
  setTimeout(() => $('#course-form [name=subject]')?.focus(), 50);
}
function submitCourse(form) {
  const fd = new FormData(form), err = form.querySelector('.error');
  const data = { subject: fd.get('subject').trim(), teacher: fd.get('teacher').trim(), room: fd.get('room').trim(), day: Number(fd.get('day')),
    start: fd.get('start'), end: fd.get('end'), weeks: fd.get('weeks'), color: form.dataset.color };
  if (!data.subject) return;
  if (toMin(data.end) <= toMin(data.start)) { err.textContent = 'L’heure de fin doit être après l’heure de début.'; return; }
  const id = form.dataset.id;
  if (id) save(backend.update('cours', id, { ...data, editedBy: state.me.id }));
  else save(backend.add('cours', { ...data, author: state.me.id, ts: Date.now() }));
  closeModal();
  toast(id ? 'Cours modifié — visible par toute la famille' : 'Cours ajouté — il se répète chaque semaine');
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
    ${!isNew && ev.createdBy ? `<p class="small muted">Ajouté par ${esc(member(ev.createdBy).name)}</p>` : ''}
    <div class="error"></div>
    <div class="modal-actions">${isNew ? '' : `<button type="button" class="btn btn-danger" data-action="delete-event">${ICON.trash} Supprimer</button>`}
      <span class="grow"></span><button type="button" class="btn" data-action="close-modal-btn">Annuler</button><button class="btn btn-primary">Enregistrer</button></div>
  </form></div>`;
  if (isNew) setTimeout(() => $('#event-form [name=title]')?.focus(), 50);
}
const closeModal = () => { $('#modal-root').innerHTML = ''; setTimeout(checkAlerts, 400); };

function submitEvent(form) {
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
  if (id) save(backend.update('events', id, data));
  else save(backend.add('events', { ...data, createdBy: state.me.id, ts: Date.now() }));
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
    stopSubs(); await backend.signOut();
  },
  'switch-user': () => switchUser(),
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
  'card-done'() { const done = cardDone; cardDone = null; closeModal(); if (done) done(); },
  'remove-photo'() { memberPhoto = null; $('#photo-preview').style.backgroundImage = ''; updatePhotoPreview(); },
  compose: () => openCompose(),
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
    form.querySelector('.maison-hint').classList.toggle('hidden', el.dataset.role !== 'maison');
    if (el.dataset.role === 'maison' && !form.name.value) form.name.value = 'Maison';
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
  'new-verif': () => openEventModal(null, todayStr(), { verify: true }),
  'verif-filter'(el) { state.verifFilter = el.dataset.v; refresh(); },
  'verif-done'(el) { setDone(el.dataset.id, el.dataset.occ, { by: state.me.id, at: Date.now() }); toast('✅ Validé — tout le monde le voit'); },
  'verif-undo'(el) { if (confirm('Retirer le tampon VALIDÉ ?')) setDone(el.dataset.id, el.dataset.occ, null); },
  'edit-event': (el) => { const ev = state.events.find((x) => x.id === el.dataset.id); if (ev) openEventModal(ev); },
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
    save(backend.remove('events', id)); closeModal(); toast('Rendez-vous supprimé');
  },
  'edt-week'(el) {
    const n = Number(el.dataset.delta);
    state.edtWeek = n === 0 ? mondayOf(new Date()) : addDays(state.edtWeek || mondayOf(new Date()), 7 * n);
    if (n === 0) state.edtDay = undefined;
    refresh();
  },
  'edt-day'(el) { state.edtDay = Number(el.dataset.i); refresh(); },
  'edt-settings': () => openEdtSettings(),
  'open-course'(el) { openCourse(el.dataset.id, el.dataset.date); },
  'edit-course'(el) {
    const c = state.cours.find((x) => x.id === el.dataset.id);
    openCourseEdit(c, { day: Number(el.dataset.day) || 1 });
  },
  'edt-slot'(el, e) {
    if (e.target !== el && !e.target.classList.contains('edt-hline')) return;
    const r = el.getBoundingClientRect();
    const min = Number(el.dataset.minh) * 60 + (e.clientY - r.top) / Number(el.dataset.ppm);
    const m5 = Math.max(0, Math.round(min / 15) * 15);
    openCourseEdit(null, { day: Number(el.dataset.day), start: `${pad(Math.floor(m5 / 60))}:${pad(m5 % 60)}` });
  },
  'delete-course'() {
    const id = $('#course-form').dataset.id, c = state.cours.find((x) => x.id === id);
    if (!c || !confirm(`Supprimer le cours « ${c.subject} » du ${EDT_DAYS[c.day - 1].toLowerCase()} ?`)) return;
    save(backend.remove('cours', id));
    state.edtNotes.filter((n) => n.courseId === id).forEach((n) => save(backend.remove('edtNotes', n.id)));
    closeModal(); toast('Cours supprimé');
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

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'photo-input' && t.files && t.files[0]) {
    try { memberPhoto = await readPhoto(t.files[0]); updatePhotoPreview(); }
    catch { toast('Impossible de lire cette photo, essayez-en une autre.', true); }
    t.value = '';
  }
  if (t.dataset.action === 'theme') { ls.set('maison-theme', t.value); applyTheme(); }
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
  if (f.id === 'login-form') {
    const email = f.email.value.trim(), pw = f.password.value;
    const btn = f.querySelector('.btn-primary'); btn.disabled = true;
    try { await (f.dataset.mode === 'signup' ? backend.signUp(email, pw) : backend.signIn(email, pw)); }
    catch (err) { renderLogin(f.dataset.mode, AUTH_ERRORS[err.code] || err.message); $('#login-form [name=email]').value = email; }
  } else if (f.id === 'setup-form') submitSetup(f);
  else if (f.id === 'event-form') submitEvent(f);
  else if (f.id === 'compose-form') submitCompose(f);
  else if (f.id === 'course-form') submitCourse(f);
  else if (f.id === 'edt-note-form') {
    const box = $('.course-modal'), text = f.text.value.trim();
    f.text.value = '';
    save(backend.add('edtNotes', { courseId: box.dataset.id, date: box.dataset.date, type: f.type.value, text, author: state.me.id, ts: Date.now() }));
    toast('Info ajoutée — toute la famille la voit');
  } else if (f.id === 'edt-settings-form') {
    const ab = f.ab.value, mon = mondayOf(new Date());
    save(backend.set('edtConfig', 'main', { title: f.title.value.trim() || 'Lycée Max Linder', studentId: f.studentId.value, saturday: f.saturday.checked,
      refA: ab === 'A' ? ymd(mon) : ab === 'B' ? ymd(addDays(mon, -7)) : '' }));
    closeModal(); toast('Emploi du temps mis à jour');
  }
  else if (f.id === 'note-form') {
    const input = $('#note-input'), text = input.value.trim();
    if (!text) return;
    save(backend.add('notes', { text, important: state.noteImportant, done: false, author: state.me.id, ts: Date.now() }));
    input.value = ''; state.noteImportant = false; refresh();
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
let maisonTimer = null;
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
