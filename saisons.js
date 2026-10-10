// Kids & Co — décors illustrés de saison (dessins SVG faits maison, animés en CSS).
// Chaque scène fait 400 × 150 et s'affiche en bandeau sur l'accueil ; FX = petits éléments qui volent sur l'écran.

const g = (x, y, s, body, cls = '') => `<g transform="translate(${x} ${y}) scale(${s})">${cls ? `<g class="${cls}">${body}</g>` : body}</g>`;

/* ---------- Petits dessins réutilisables ---------- */
const pumpkin = (x, y, s, d = 0) => g(x, y, s, `<g class="sw" style="animation-delay:${d}s">
  <ellipse cx="0" cy="0" rx="26" ry="21" fill="#F07A1A"/><ellipse cx="-12" cy="0" rx="13" ry="20" fill="#F58A2A"/><ellipse cx="12" cy="0" rx="13" ry="20" fill="#E36B10"/>
  <ellipse cx="0" cy="0" rx="9" ry="21" fill="#F7922F"/><path d="M-2-20q2-10 9-12" stroke="#3E7B27" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path class="glow" d="M-14-6l6-7 5 7zM14-6l-6-7-5 7zM-15 6q15 14 30 0l-5 3-3-4-4 5-3-5-4 5-3-4z" fill="#FFE066"/></g>`);
const bat = (x, y, s, d = 0) => g(x, y, s, `<g class="flap" style="animation-delay:${d}s"><path d="M0 4c-6-9-16-11-26-6 6 1 8 5 7 9-4-3-9-2-11 1 7-1 11 3 12 7 4-5 11-7 18-5 4 1 6-2 6-6l2-4 2 4c0 4 2 7 6 6 7-2 14 0 18 5 1-4 5-8 12-7-2-3-7-4-11-1-1-4 1-8 7-9-10-5-20-3-26 6z" fill="#1E0F2E"/>
  <circle cx="-2" cy="2" r="1.3" fill="#FFD84D"/><circle cx="2" cy="2" r="1.3" fill="#FFD84D"/></g>`);
const ghost = (x, y, s, d = 0) => g(x, y, s, `<g class="bob" style="animation-delay:${d}s"><path d="M-16 20v-22a16 16 0 0 1 32 0v22l-5-5-5 5-6-5-6 5-5-5z" fill="#FBFBFF" stroke="#D9D4EE" stroke-width="1.5"/>
  <ellipse cx="-6" cy="-3" rx="3" ry="4.5" fill="#2B1145"/><ellipse cx="6" cy="-3" rx="3" ry="4.5" fill="#2B1145"/><ellipse cx="0" cy="7" rx="3.5" ry="4" fill="#2B1145"/></g>`);
const web = `<g stroke="#E9E2F5" stroke-width="1" fill="none" opacity=".85">${[0, 18, 36, 54, 72, 90].map((a) => `<line x1="0" y1="0" x2="${70 * Math.cos(a * Math.PI / 180)}" y2="${70 * Math.sin(a * Math.PI / 180)}"/>`).join('')}
  ${[16, 30, 44, 58].map((r) => `<path d="${[0, 18, 36, 54, 72, 90].map((a, i) => `${i ? 'Q' + (r * 0.82 * Math.cos((a - 9) * Math.PI / 180)).toFixed(1) + ' ' + (r * 0.82 * Math.sin((a - 9) * Math.PI / 180)).toFixed(1) + ' ' : 'M'}${(r * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(r * Math.sin(a * Math.PI / 180)).toFixed(1)}`).join(' ')}"/>`).join('')}</g>
  <g class="spider"><line x1="44" y1="0" x2="44" y2="34" stroke="#E9E2F5"/><circle cx="44" cy="38" r="5" fill="#1E0F2E"/><path d="M39 36l-6-4M39 39l-7 1M49 36l6-4M49 39l7 1" stroke="#1E0F2E" stroke-width="1.6"/></g>`;
const witch = g(0, 0, 1, `<path d="M-38 14l64-10" stroke="#5A3A1E" stroke-width="3" stroke-linecap="round"/><path d="M-38 14l-14 -4 2 6-6 2 6 3-2 6 14-6z" fill="#C8963E"/>
  <path d="M-6 8q-4-16 6-24l6 4q4 10-2 18z" fill="#2A1640"/><circle cx="4" cy="-17" r="6" fill="#8BC34A"/><path d="M8-17l6 2-6 1z" fill="#7CB342"/>
  <path d="M-8-20l12-2 2-4-6-18z" fill="#2A1640"/><path d="M-11-19h20" stroke="#2A1640" stroke-width="3"/><path d="M-6 6q-10 4-14 12M2 8l8 10" stroke="#2A1640" stroke-width="3" stroke-linecap="round"/>
  <path d="M-4-14q-8 6-6 14" stroke="#E8590C" stroke-width="3" fill="none"/>`, 'fly');
const snowflake = (x, y, s, d = 0) => g(x, y, s, `<g class="spin" style="animation-delay:${d}s" stroke="#fff" stroke-width="2" stroke-linecap="round">${[0, 60, 120].map((a) => `<g transform="rotate(${a})"><line x1="-9" y1="0" x2="9" y2="0"/><path d="M5-3l3 3-3 3M-5-3l-3 3 3 3" fill="none"/></g>`).join('')}</g>`);
const fir = (x, y, s, snow = true) => g(x, y, s, `<rect x="-3" y="10" width="6" height="10" fill="#6D4C2F"/><path d="M0-34l18 24h-8l14 18H-24l14-18h-8z" fill="#1F6B45"/>
  ${snow ? '<path d="M0-34l7 10-4 2-3-3-3 3-4-2zM-12-10h6l-3 3zM6-10h6l-3 3zM-20 8h10l-5 3zM10 8h10l-5 3z" fill="#fff"/>' : ''}`);
const gift = (x, y, w, h, c, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}"/><rect x="${x + w / 2 - 3}" y="${y}" width="6" height="${h}" fill="${r}"/><rect x="${x}" y="${y + h / 2 - 3}" width="${w}" height="6" fill="${r}"/>
  <path d="M${x + w / 2} ${y}q-10-10-12 0zM${x + w / 2} ${y}q10-10 12 0z" fill="${r}"/>`;
const leaf = (c, v) => `<path d="M0-12C8-8 10 4 0 12-10 4-8-8 0-12z" fill="${c}"/><path d="M0-12V14M0-4l4-3M0 2l-4-3M0 6l4-3" stroke="${v}" stroke-width="1.2" fill="none"/>`;
const flower = (x, y, s, c, d = 0) => g(x, y, s, `<path d="M0 0q2 16 0 30" stroke="#4CAF50" stroke-width="3" fill="none"/><path d="M0 18q-10-6-14 0 8 4 14 0z" fill="#66BB6A"/>
  <g class="sw" style="animation-delay:${d}s">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-8" rx="6" ry="9" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="#FFD54F"/></g>`);
const butterfly = (x, y, s, c, d = 0) => g(x, y, s, `<g class="flap" style="animation-delay:${d}s"><path d="M0 0C-6-14-22-14-18-2-16 4-6 4 0 0zM0 0C6-14 22-14 18-2 16 4 6 4 0 0zM0 2C-4 8-14 14-12 6-11 2-4 2 0 2zM0 2C4 8 14 14 12 6 11 2 4 2 0 2z" fill="${c}"/>
  <rect x="-1.2" y="-6" width="2.4" height="12" rx="1.2" fill="#3E2723"/></g>`, 'drift');
const crepe = (x, y, s, rot = 0) => g(x, y, s, `<g transform="rotate(${rot})"><ellipse rx="34" ry="11" fill="#F2C46D"/><ellipse rx="30" ry="9" fill="#F6D58E"/>
  ${[[-14, -2], [8, 3], [-2, -4], [16, -3], [-20, 3]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="3" ry="1.4" fill="#D9A04B" opacity=".8"/>`).join('')}</g>`);
const strawberry = (x, y, s) => g(x, y, s, `<path d="M0 12C-10 4-10-6 0-6 10-6 10 4 0 12z" fill="#E53935"/><path d="M-6-6l6 3 6-3-3-3-3 2-3-2z" fill="#43A047"/>
  ${[[-3, -1], [3, 0], [0, 4], [-4, 4], [4, 5]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r=".9" fill="#FFE082"/>`).join('')}`);
const sunGlasses = g(70, 48, 1, `<g class="spin-slow">${Array.from({ length: 12 }, (_, i) => `<path d="M0-44l5 12h-10z" fill="#FFB300" transform="rotate(${i * 30})"/>`).join('')}</g>
  <circle r="30" fill="#FFD54F"/><circle r="30" fill="url(#sunShade)"/>
  <path d="M-24-6h20q2 12-9 12-11 0-11-12zM4-6h20q0 12-11 12-11 0-9-12z" fill="#1A237E"/><path d="M-4-4h8" stroke="#1A237E" stroke-width="3"/><path d="M-20-4l6 5" stroke="#5C6BC0" stroke-width="2"/>
  <path d="M-12 12q12 10 24 0" stroke="#BF360C" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-18" cy="12" r="4" fill="#FF8A65" opacity=".6"/><circle cx="18" cy="12" r="4" fill="#FF8A65" opacity=".6"/>`);

/* ---------- Scènes en images de synthèse (Fluent Emoji 3D de Microsoft, licence MIT — voir saisons/LICENCE-fluent-emoji.txt) ---------- */
// im(nom, x, y, taille, classe d'animation, délai, ombre au sol)
const im = (n, x, y, w, cls = '', d = 0, shadow = false) => `${shadow ? `<ellipse cx="${x + w / 2}" cy="${y + w * .96}" rx="${w * .36}" ry="${w * .07}" fill="#000" opacity=".22" filter="url(#soft)"/>` : ''}<g class="${cls}" style="animation-delay:${d}s"><image href="saisons/${n}.webp" x="${x}" y="${y}" width="${w}" height="${w}"/></g>`;
const defs = (extra = '') => `<defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>${extra}</defs>`;
const stars = (n, h = 70) => Array.from({ length: n }, (_, i) => `<circle class="twinkle" style="animation-delay:${i * 0.3}s" cx="${(i * 53) % 400}" cy="${(i * 29) % h + 6}" r="${i % 3 ? 1 : 1.6}" fill="#fff"/>`).join('');
const snowfall = (n) => Array.from({ length: n }, (_, i) => `<circle class="snow" style="animation-delay:${-(i * 0.7)}s;animation-duration:${6 + (i % 5)}s" cx="${(i * 37) % 400}" cy="${(i * 23) % 120}" r="${i % 3 ? 1.6 : 2.4}" fill="#fff" opacity=".9"/>`).join('');
const garland = `<path d="M0 6q50 26 100 4t100 4 100-4 100 4" stroke="#2E7D32" stroke-width="3" fill="none"/>${Array.from({ length: 16 }, (_, i) => { const x = 12 + i * 25, y = 10 + Math.sin(i * 1.6) * 6 + 6; return `<g class="twinkle" style="animation-delay:${(i % 4) * .3}s"><rect x="${x - 2}" y="${y - 4}" width="4" height="4" fill="#555"/><ellipse cx="${x}" cy="${y + 4}" rx="4" ry="6" fill="${['#FF5252', '#FFD740', '#69F0AE', '#40C4FF'][i % 4]}"/><ellipse cx="${x - 1.2}" cy="${y + 2}" rx="1.2" ry="2" fill="#fff" opacity=".7"/></g>`; }).join('')}`;
export const SCENES = {
  halloween: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="hwSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#150726"/><stop offset=".62" stop-color="#4A1F73"/><stop offset="1" stop-color="#E9772A"/></linearGradient><radialGradient id="hwMoon"><stop offset=".45" stop-color="#FFF3C4" stop-opacity=".8"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient>`)}
    <rect width="400" height="150" fill="url(#hwSky)"/>${stars(20)}<circle cx="318" cy="44" r="58" fill="url(#hwMoon)" opacity=".55"/>${im('full_moon', 282, 8, 72)}
    <g class="witch-path">${im('woman_mage', -30, 20, 46)}</g>${im('bat', 120, 18, 30, 'flap', 0)}${im('bat', 200, 34, 24, 'flap', .3)}${im('bat', 250, 12, 22, 'flap', .6)}${im('bat', 368, 50, 24, 'flap', .2)}
    ${im('spider_web', -6, -6, 70)}<g class="spider">${im('spider', 40, 26, 26)}</g><line x1="53" y1="0" x2="53" y2="30" stroke="#E9E2F5" stroke-width=".8" class="spider"/>
    <path d="M0 150V116q40-22 90-8 30-20 70-6 40-16 80 2 40-18 80-4 40-10 80 8v42z" fill="#1A0E26"/>${im('derelict_house', 300, 64, 62)}
    ${im('ghost', 26, 64, 46, 'bob', 0)}${im('ghost', 236, 52, 34, 'bob', 1.1)}${im('owl', 168, 60, 34, 'sw', .4)}
    ${im('jack-o-lantern', 70, 98, 52, 'glow', 0, true)}${im('jack-o-lantern', 130, 112, 36, 'glow', .6, true)}${im('jack-o-lantern', 196, 96, 56, 'glow', .3, true)}
    ${im('candy', 262, 124, 22)}${im('lollipop', 290, 118, 26)}${im('candy', 364, 126, 20)}</svg>`,

  noel: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="xmSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1E3A"/><stop offset="1" stop-color="#2A5E9E"/></linearGradient><radialGradient id="xmGlow"><stop offset="0" stop-color="#FFE082" stop-opacity=".9"/><stop offset="1" stop-color="#FFE082" stop-opacity="0"/></radialGradient>`)}
    <rect width="400" height="150" fill="url(#xmSky)"/>${stars(14, 50)}${snowfall(26)}
    <path d="M0 150v-30q60-16 120-4 70-18 140 0 70-14 140 2v32z" fill="#F4F8FF"/><path d="M0 150v-14q100-10 200-2t200-4v20z" fill="#E3EEFB"/>
    <circle cx="318" cy="70" r="70" fill="url(#xmGlow)" opacity=".35"/>${im('christmas_tree', 262, 16, 116, '', 0, true)}${im('star', 306, 6, 26, 'twinkle')}
    ${im('wrapped_gift', 250, 108, 34, '', 0, true)}${im('wrapped_gift', 352, 112, 30, '', 0, true)}${im('wrapped_gift', 286, 118, 26)}
    ${im('santa_claus', 112, 38, 92, 'bob', 0, true)}${im('sled', 18, 86, 70, '', 0, true)}${im('wrapped_gift', 34, 72, 28, 'sw')}${im('deer', 196, 70, 66, '', 0, true)}
    ${im('snowman', 3, 40, 40, 'sw', .5)}${im('bell', 92, 26, 22, 'sw', .2)}${garland}</svg>`,

  hiver: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="wiSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EBFEE"/><stop offset="1" stop-color="#E4F1FC"/></linearGradient>`)}
    <rect width="400" height="150" fill="url(#wiSky)"/>${im('cloud_with_snow', 20, 4, 54, 'drift')}${im('cloud_with_snow', 300, 0, 46, 'drift', 1)}
    ${im('snow-capped_mountain', 40, 30, 110)}${im('snow-capped_mountain', 220, 22, 130)}${snowfall(22)}
    <path d="M0 150v-34q70-20 140-4 60-16 130 0 70-18 130 4v34z" fill="#fff"/><path d="M0 150v-16q90-12 200-2t200-4v22z" fill="#EAF3FC"/>
    ${im('evergreen_tree', 10, 62, 60, '', 0, true)}${im('evergreen_tree', 54, 78, 44, '', 0, true)}${im('evergreen_tree', 352, 66, 54, '', 0, true)}
    <path d="M130 18q55 20 110 0" stroke="#7B5E57" stroke-width="1.5" fill="none"/><g class="sw">${im('gloves', 142, 14, 38)}</g><g class="sw" style="animation-delay:.6s">${im('scarf', 186, 16, 44)}</g>
    ${im('snowman', 252, 40, 96, '', 0, true)}${im('hot_beverage', 110, 112, 30, '', 0, true)}${im('snowflake', 106, 56, 22, 'spin')}${im('snowflake', 230, 70, 18, 'spin', 1)}${im('snowflake', 358, 20, 20, 'spin', 2)}</svg>`,

  automne: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="auSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB25B"/><stop offset="1" stop-color="#FFE7C2"/></linearGradient><radialGradient id="auTree" cx=".4" cy=".35"><stop offset="0" stop-color="#FFB74D"/><stop offset=".6" stop-color="#EF6C00"/><stop offset="1" stop-color="#BF360C"/></radialGradient>`)}
    <rect width="400" height="150" fill="url(#auSky)"/><circle cx="340" cy="34" r="20" fill="#FFE082" opacity=".85"/>
    ${[[56, 64, 1], [150, 54, 1.2], [344, 72, .9]].map(([x, y, sc]) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-4 64V10q-10-14-18-16M4 64V8q10-12 16-14" stroke="#5D4037" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="0" cy="-8" r="30" fill="url(#auTree)"/><circle cx="-24" cy="6" r="20" fill="url(#auTree)"/><circle cx="24" cy="4" r="21" fill="url(#auTree)"/><circle cx="-6" cy="-28" r="18" fill="url(#auTree)"/></g>`).join('')}
    <path d="M0 150v-30q80-18 170-2 90-16 230 2v30z" fill="#A0522D"/><path d="M0 150v-16q100-10 200 0t200-2v18z" fill="#8B4513"/>
    ${[['fallen_leaf', 0], ['maple_leaf', 2.2], ['leaf_fluttering_in_wind', 4.4], ['fallen_leaf', 6], ['maple_leaf', 7.6]].map(([n, d], i) => `<g class="leaf-fly" style="animation-delay:${-d}s"><g transform="translate(0 ${10 + i * 14})">${im(n, 0, 0, 22 + (i % 2) * 8, 'spin', d)}</g></g>`).join('')}
    ${im('hedgehog', 228, 102, 46, '', 0, true)}${im('chipmunk', 98, 96, 42, 'bob', 0, true)}${im('mushroom', 168, 112, 30, '', 0, true)}${im('mushroom', 192, 120, 22, '', 0, true)}
    ${im('chestnut', 290, 124, 20)}${im('chestnut', 306, 128, 16)}${im('fallen_leaf', 30, 124, 22)}${im('maple_leaf', 372, 122, 22)}</svg>`,

  ete: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="suSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FB5F0"/><stop offset="1" stop-color="#B3E5FC"/></linearGradient><linearGradient id="suSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#039BE5"/><stop offset="1" stop-color="#4FC3F7"/></linearGradient>`)}
    <rect width="400" height="150" fill="url(#suSky)"/><g class="spin-slow">${Array.from({ length: 12 }, (_, i) => `<path d="M68 48l0 0" />`).join('')}</g>
    <circle cx="70" cy="44" r="46" fill="#FFF59D" opacity=".35"/>${im('sun_with_face', 32, 6, 76, 'sw')}<g class="sw">${im('sunglasses', 44, 22, 52)}</g>
    <path class="cloud" d="M170 30q6-14 20-10 8-10 20-2 14-2 14 10 10 2 8 12h-66q-4-8 4-10z" fill="#fff" opacity=".9"/>
    <rect y="90" width="400" height="26" fill="url(#suSea)"/>${im('sailboat', 250, 58, 40, 'bob')}<path class="wave" d="M0 94q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0v6H0z" fill="#B3E5FC" opacity=".8"/>
    <path d="M0 150v-38q100-10 200-2t200-2v42z" fill="#FFE0A3"/><path d="M0 150v-14q120-8 240-2t160 0v16z" fill="#F7D48A"/>
    ${im('palm_tree', 320, 20, 100, 'sw', 0, true)}${im('umbrella_on_ground', 150, 52, 86, '', 0, true)}${im('watermelon', 96, 116, 30, '', 0, true)}
    ${im('soft_ice_cream', 238, 104, 34, 'bob', 0, true)}${im('tropical_drink', 272, 112, 28, '', 0, true)}${im('crab', 30, 118, 30, 'sw', 0, true)}${im('spiral_shell', 66, 128, 18)}${im('spiral_shell', 300, 132, 16)}</svg>`,

  printemps: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="spSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9DDF8"/><stop offset="1" stop-color="#F1F8E9"/></linearGradient>`)}
    <rect width="400" height="150" fill="url(#spSky)"/>${im('rainbow', 110, -8, 170)}<path class="cloud" d="M40 34q6-14 20-10 8-10 20-2 14-2 14 10 10 2 8 12H56q-20 0-16-10z" fill="#fff"/>
    <path d="M0 150v-36q90-24 200-6 100-18 200 4v38z" fill="#9CCC65"/><path d="M0 150v-16q120-14 240-2 80-8 160 0v18z" fill="#7CB342"/>
    ${im('cherry_blossom', 330, 12, 44, 'sw')}${im('blossom', 360, 50, 30, 'sw', .5)}
    ${[['tulip', 18, 96, 40], ['sunflower', 60, 82, 52], ['tulip', 112, 104, 34], ['blossom', 150, 112, 28], ['tulip', 250, 100, 38], ['sunflower', 290, 88, 48], ['tulip', 344, 104, 36], ['blossom', 210, 116, 26]].map(([n, x, y, w], i) => im(n, x, y, w, 'sw', i * .3)).join('')}
    ${im('butterfly', 100, 30, 32, 'drift')}${im('butterfly', 250, 46, 26, 'drift', 1.2)}${im('honeybee', 190, 60, 24, 'drift', .6)}${im('lady_beetle', 176, 124, 18)}${im('bird', 290, 12, 30, 'drift', .4)}${im('hatching_chick', 384, 118, 28, '', 0, true)}</svg>`,

  chandeleur: `<svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice">${defs(`<linearGradient id="chBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9B0"/><stop offset="1" stop-color="#FFF6E0"/></linearGradient><linearGradient id="chTable" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A1887F"/><stop offset="1" stop-color="#6D4C41"/></linearGradient>`)}
    <rect width="400" height="150" fill="url(#chBg)"/><g opacity=".3">${Array.from({ length: 10 }, (_, i) => `<rect x="${i * 40}" y="0" width="20" height="150" fill="#F8BBD0"/>`).join('')}</g>
    <rect y="112" width="400" height="38" fill="url(#chTable)"/><rect y="112" width="400" height="4" fill="#BCAAA4"/>
    ${im('pancakes', 140, 10, 124, '', 0, true)}${im('strawberry', 112, 92, 30, '', 0, true)}${im('strawberry', 262, 96, 26, '', 0, true)}${im('strawberry', 128, 80, 22, 'bob', .5)}
    ${im('honey_pot', 30, 66, 54, '', 0, true)}${im('chocolate_bar', 300, 70, 54, '', 0, true)}${im('glass_of_milk', 82, 72, 44, '', 0, true)}${im('candle', 358, 66, 40, 'glow')}
    ${im('sparkles', 120, 6, 26, 'twinkle')}${im('sparkles', 270, 12, 22, 'twinkle', .7)}</svg>`,
};

// Petits éléments 3D qui volent sur l'écran (derrière le contenu).
const fxImg = (n) => `<img src="saisons/${n}.webp" alt="" loading="lazy">`;
export const FX = {
  printemps: { move: 'float', items: ['cherry_blossom', 'butterfly', 'blossom', 'honeybee', 'butterfly'].map(fxImg) },
  ete: { move: 'float', items: ['sparkles', 'watermelon', 'sparkles', 'spiral_shell'].map(fxImg) },
  automne: { move: 'wind', items: ['fallen_leaf', 'maple_leaf', 'leaf_fluttering_in_wind', 'fallen_leaf', 'maple_leaf'].map(fxImg) },
  hiver: { move: 'fall', items: ['snowflake', 'snowflake', 'snowflake', 'gloves'].map(fxImg) },
  noel: { move: 'fall', items: ['snowflake', 'star', 'snowflake', 'wrapped_gift', 'snowflake'].map(fxImg) },
  halloween: { move: 'float', items: ['bat', 'ghost', 'bat', 'jack-o-lantern', 'bat', 'candy'].map(fxImg) },
  chandeleur: { move: 'fall', items: ['pancakes', 'strawberry', 'pancakes', 'chocolate_bar'].map(fxImg) },
};
