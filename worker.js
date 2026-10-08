// Kids & Co — petit service Cloudflare : sert l'appli et envoie les notifications push.
// POST /api/push { subs: [PushSubscription JSON], payload: { title, body, tag, url } }
// Chiffrement Web Push (RFC 8291, aes128gcm) et signature VAPID (RFC 8292), avec WebCrypto.
// La clé privée VAPID est un secret Cloudflare : VAPID_PRIVATE_KEY (valeur « d » de la clé).

const VAPID_X = 'l1M5r-OJYzezeqezeZvTTHcm316CaVHZ5-1k1htgK_I';
const VAPID_Y = 'e7ebg10Kf2uFCLi78DjxuvsZlHjtq7SDknef_8MyIMo';
const VAPID_PUBLIC = 'BJdTOa_jiWM3s3qns3mb00x3Jt9egmlR2eftZNYbYCvye7ebg10Kf2uFCLi78DjxuvsZlHjtq7SDknef_8MyIMo';
const VAPID_SUBJECT = 'mailto:contact@kids-and-co.app';
// Services de notification officiels (Google/Android, Firefox, Apple, Windows) : on n'envoie nulle part ailleurs.
const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

const enc = new TextEncoder();
const b64u = {
  enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)),
};
const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let i = 0;
  for (const a of arrs) { out.set(a, i); i += a.length; }
  return out;
};
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

// Chiffre le message pour un abonnement (RFC 8291).
export async function encryptPayload(sub, plaintext) {
  const uaPublic = b64u.dec(sub.keys.p256dh), authSecret = b64u.dec(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

// Jeton VAPID signé (ES256) pour le service de notification visé.
export async function vapidAuth(endpoint, privateD) {
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: VAPID_X, y: VAPID_Y, d: privateD, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u.enc(sig)}, k=${VAPID_PUBLIC}`;
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

async function handlePush(request, env) {
  if (!env.VAPID_PRIVATE_KEY) return json({ error: 'not-configured' }, 503);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
  const subs = Array.isArray(data.subs) ? data.subs.slice(0, 40) : [];
  const p = data.payload || {};
  const payload = enc.encode(JSON.stringify({
    title: String(p.title || 'Kids & Co').slice(0, 120), body: String(p.body || '').slice(0, 300),
    tag: String(p.tag || '').slice(0, 80), url: String(p.url || './').slice(0, 200),
  }));
  const results = await Promise.all(subs.map(async (sub) => {
    try {
      const host = new URL(sub.endpoint).hostname;
      if (new URL(sub.endpoint).protocol !== 'https:' || !PUSH_HOSTS.some((r) => r.test(host)) || !sub.keys?.p256dh || !sub.keys?.auth) return { endpoint: sub.endpoint, status: 'refused' };
      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          Authorization: await vapidAuth(sub.endpoint, env.VAPID_PRIVATE_KEY),
          'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high',
        },
        body: await encryptPayload(sub, payload),
      });
      return { endpoint: sub.endpoint, status: res.status };
    } catch (e) {
      return { endpoint: sub.endpoint, status: 'error' };
    }
  }));
  return json({ results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/push') {
      if (request.method !== 'POST') return json({ error: 'method' }, 405);
      return handlePush(request, env);
    }
    if (url.pathname === '/api/push-status') return json({ configured: !!env.VAPID_PRIVATE_KEY });
    return env.ASSETS.fetch(request);
  },
};
