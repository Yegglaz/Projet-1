const C = window.CONFIG || {};
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} } };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => { const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) };
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "i" + (h >>> 0).toString(36); };

/* ===== 1. Thématiques ===== */
const TOPICS = {
  espace: ["Espace", /espace|astro|galaxie|plan[èe]te|nasa|apollo|[ée]toile|mars\b|lune|trou noir|t[ée]lescope|cosm|satellite|solaire|fus[ée]e|astronaute|orbite|jupiter|saturne/i],
  animaux: ["Animaux", /animal|faune|esp[èe]ce|oiseau|requin|baleine|insecte|f[ée]lin|singe|loup|ours|pr[ée]dateur|wildlife|lion|zoolog|mammif/i],
  oceans: ["Océans", /oc[ée]an|\bmer\b|marin|corail|poisson|plong[ée]e|dauphin|\bsea\b|reef/i],
  climat: ["Climat", /climat|r[ée]chauffement|carbone|pollution|[ée]colog|glacier|s[ée]cheresse|biodiversit|for[êe]t|climate|environment/i],
  sante: ["Santé & cerveau", /sant[ée]|cerveau|m[ée]dic|cancer|virus|vaccin|maladie|sommeil|g[ée]n[ée]tique|\badn\b|neuro|health|brain|disease/i],
  histoire: ["Histoire", /histoire|antique|[ée]gypt|romain|m[ée]di[ée]val|guerre|pharaon|civilisation|pr[ée]histoire|history|ancient|\bwar\b/i],
  archeo: ["Archéologie & fossiles", /arch[ée]olog|fouille|momie|fossile|dinosaure|pal[ée]ontolog|n[ée]andertal|fossil|dinosaur/i],
  tech: ["Technologie", /intelligence artificielle|\bIA\b|robot|ordinateur|technolog|num[ée]rique|quantique|batterie|drone|internet|informatique|computer|engineering/i],
  physique: ["Physique & chimie", /physique|particule|atome|chimie|mati[èe]re|laser|[ée]nergie|nucl[ée]aire|physics|chemistry|energy/i],
  terre: ["Planète Terre", /volcan|s[ée]isme|tremblement|g[ée]olog|montagne|d[ée]sert|m[ée]t[ée]o|temp[êe]te|tsunami|earth|volcano|weather|geology/i],
};
const tagger = i => Object.keys(TOPICS).filter(k => TOPICS[k][1].test(i.titre + " " + i.texte));

/* ===== 2. Profil ===== */
let P = { w: {}, follows: [], liked: [], hidden: [], clicked: [], last: Date.now(), ...store.get("profil", {}) };
const prevVisit = P.last;
for (const k in P.w) P.w[k] *= Math.pow(0.97, (Date.now() - P.last) / 864e5);
P.last = Date.now();
let sb = null, user = null, local = store.get("local", null), tSave = null, aboActif = false;
function save() {
  store.set("profil", P);
  if (sb && user) { clearTimeout(tSave); tSave = setTimeout(() => sb.from("profils").upsert({ id: user.id, data: P, updated_at: new Date().toISOString() }).then(() => {}, () => {}), 800); }
}
const bump = (i, v) => i.tags.forEach(t => P.w[t] = (P.w[t] || 0) + v);

/* ===== 3. Recommandation ===== */
function score(i) {
  const age = (Date.now() - i.ts) / 864e5, fraicheur = isNaN(age) ? 0.2 : Math.exp(-age / 30);
  const aff = i.tags.reduce((a, t) => a + (P.w[t] || 0) + (P.follows.includes(t) ? 3 : 0), 0) / Math.sqrt(Math.max(1, i.tags.length));
  return aff + fraicheur + (i.genre === "documentaire" || i.q ? 0.7 : 0) + Math.random() * 0.6 - (P.clicked.includes(i.id) ? 1.5 : 0);
}
function recommander(items, n) {
  const pool = items.filter(i => !P.hidden.includes(i.id)).map(i => ({ i, s: score(i) })), out = [], vu = {};
  while (out.length < n && pool.length) {
    pool.forEach(p => p.m = p.s - 0.8 * p.i.tags.reduce((a, t) => a + (vu[t] || 0), 0));
    let b = 0; pool.forEach((p, k) => { if (p.m > pool[b].m) b = k; });
    const p = pool.splice(b, 1)[0]; out.push(p.i); p.i.tags.forEach(t => vu[t] = (vu[t] || 0) + 1);
  }
  return out;
}
function raison(i) {
  const t = [...i.tags].sort((a, b) => (P.w[b] || 0) + (P.follows.includes(b) ? 3 : 0) - (P.w[a] || 0) - (P.follows.includes(a) ? 3 : 0))[0];
  if (!t) return "";
  return P.follows.includes(t) ? "Parce que vous suivez « " + TOPICS[t][0] + " »" : P.w[t] > 0.5 ? "Parce que vous aimez « " + TOPICS[t][0] + " »" : "À découvrir : " + TOPICS[t][0];
}

/* ===== 4. Visuels : illustrations immédiates + vraies images chargées au fil du défilement ===== */
const COUL = { espace: ["#1b1f4b", "#6a3fa0"], oceans: ["#0b4f6c", "#20a4a8"], animaux: ["#3d6b2f", "#a3b83a"], climat: ["#1f5f4a", "#58a36c"], sante: ["#8a1c3b", "#e0566f"], histoire: ["#6b3b1b", "#d28a3c"], archeo: ["#5a3a22", "#c9a15a"], tech: ["#22223a", "#4a6cf7"], physique: ["#3a1c71", "#d76d77"], terre: ["#7a2e0e", "#e9803a"], _: ["#e8794d", "#7a3d9a"] };
const imgOk = u => /^https:\/\/[\w.\-\/?=&%,+~:@;()]+$/.test(u || "");
function art(i) {
  const k = i.tags[0] || "_"; let r = parseInt(i.id.slice(1), 36) % 2147483646 + 1; const R = () => (r = r * 16807 % 2147483647) / 2147483647; let g = "";
  if (k === "espace") for (let n = 0; n < 45; n++) g += `<circle cx="${R() * 400 | 0}" cy="${R() * 300 | 0}" r="${(R() * 1.8 + .4).toFixed(1)}" fill="#fff" opacity="${(R() * .7 + .2).toFixed(2)}"/>`;
  else if (k === "oceans") for (let n = 0; n < 7; n++) g += `<path d="M0 ${50 + n * 40} Q50 ${20 + n * 40} 100 ${50 + n * 40} T200 ${50 + n * 40} T300 ${50 + n * 40} T400 ${50 + n * 40}" fill="none" stroke="#fff" stroke-width="2" opacity=".22"/>`;
  else if (k === "terre") g = `<path d="M0 300 L70 160 L120 220 L190 110 L260 230 L320 150 L400 260 L400 300Z" fill="#fff" opacity=".16"/><circle cx="320" cy="70" r="34" fill="#fff" opacity=".18"/>`;
  else if (k === "tech") for (let n = 0; n < 12; n++) g += `<path d="M${R() * 400 | 0} 0V300M0 ${R() * 300 | 0}H400" stroke="#fff" opacity=".12"/><circle cx="${R() * 400 | 0}" cy="${R() * 300 | 0}" r="4" fill="#fff" opacity=".4"/>`;
  else for (let n = 0; n < 6; n++) g += `<circle cx="${300 + (R() * 60 | 0)}" cy="${50 + (R() * 40 | 0)}" r="${30 + n * 34}" fill="none" stroke="#fff" stroke-width="2" opacity="${(.22 - n * .03).toFixed(2)}"/>`;
  return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${g}</svg>`)}')`;
}
const fond = i => { const [a, b] = COUL[i.tags[0] || "_"]; return `background:${art(i)} center/cover,linear-gradient(160deg,${a},${b})`; };
const lazy = i => imgOk(i.image) ? ` data-src="${i.image}" data-full="linear-gradient(transparent 45%,#0008),url('${i.image}') center/cover,${COUL[i.tags[0] || "_"][0]}"` : "";
const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target); const el = e.target, im = new Image(); im.onload = () => { el.style.background = el.dataset.full; }; im.src = el.dataset.src; }), { rootMargin: "300px" }) : null;
function observer() { $$("[data-full]:not([data-obs])").forEach(el => { el.dataset.obs = 1; if (io) io.observe(el); else el.style.background = el.dataset.full; }); }
let rafObs = 0; new MutationObserver(() => { if (!rafObs) rafObs = requestAnimationFrame(() => { rafObs = 0; observer(); }); }).observe(document.body, { childList: true, subtree: true });

/* ===== 5. Données et listes ===== */
let nBase = 0, courant = null, tous = [], byId = new Map(), cat = null, typ = "all", limite = 48, H = null;
const visibles = () => tous.filter(i => !P.hidden.includes(i.id));
const lienOk = u => /^https?:\/\//i.test(u || "");
const play = s => `<i class="pl${s ? " s" : ""}"></i>`;
const meta = i => [i.sourceNom, i.duree ? i.duree + " min" : "", i.langue && i.langue !== "FR" ? i.langue : "", i.date ? fmt(i.date) : ""].filter(Boolean).join(" · ");
const label = i => i.genre === "documentaire" ? "Documentaire" : i.genre === "archive" ? "Film d'archive" : i.video ? "Clip" : "Documentaire écrit";
const rw = (i, r) => `<button class="rw" data-open="${i.id}"><span class="th" style="${fond(i)}"${lazy(i)}>${i.video ? play(1) : ""}</span><span class="rt"><b>${esc(i.titre)}</b><small>${esc(r ? raison(i) || meta(i) : meta(i))}</small></span></button>`;
const cc = i => `<button class="cc" data-open="${i.id}" style="${fond(i)}"${lazy(i)}><span class="chip">${esc(label(i))} · ${esc(i.sourceNom)}</span><span class="ct">${esc(i.titre)}</span><span class="cx">${esc(i.texte)}</span><span class="go">${i.video ? "▶ Regarder" : "Lire"}</span></button>`;
const mc = i => `<button class="mc" data-open="${i.id}"><span class="pic" style="${fond(i)}"${lazy(i)}>${play()}</span><b>${esc(i.titre)}</b><small>${esc([i.sourceNom, i.duree ? i.duree + " min" : ""].filter(Boolean).join(" · "))}</small></button>`;
const lst = ids => ids.map(x => byId.get(x)).filter(i => i && !P.hidden.includes(i.id));
const avecPubs = l => { const o = []; l.forEach((c, k) => { if (k && k % 9 === 0) o.push('<div class="ad" data-slot="inline" style="grid-column:1/-1"></div>'); o.push(c) }); return o.join(""); };
const compteur = () => { if (tous.length) $("#count").textContent = tous.length.toLocaleString("fr-FR") + " documentaires et articles à découvrir"; };

function calculerAccueil() {
  const base = visibles(), car = recommander(base, 5), vus = new Set(car.map(i => i.id));
  H = { car: car.map(i => i.id), vid: recommander(base.filter(i => i.genre === "documentaire" && !vus.has(i.id)), 10).map(i => i.id), reco: recommander(base.filter(i => !vus.has(i.id)), 12).map(i => i.id), art: recommander(base.filter(i => !i.video), 12).map(i => i.id) };
}
function rendreAccueil() {
  if (!H) calculerAccueil();
  $("#hello").textContent = new Date().getHours() < 18 ? "Bonjour" : "Bonsoir"; compteur();
  $("#car").innerHTML = lst(H.car).map(cc).join("");
  const v = lst(H.vid); $("#sVid").hidden = !v.length; $("#hsVid").innerHTML = v.map(mc).join("");
  const nouv = visibles().filter(i => i.ts > prevVisit && i.tags.some(t => P.follows.includes(t))).slice(0, 6);
  $("#sNew").hidden = !nouv.length; $("#gNew").innerHTML = nouv.map(i => rw(i, true)).join("");
  $("#gReco").innerHTML = avecPubs(lst(H.reco).map(i => rw(i, true)));
  const a = lst(H.art); $("#sArt").hidden = !a.length; $("#gArt").innerHTML = a.map(i => rw(i)).join("");
}
function rendreJour() {
  const pool = tous.slice(0, nBase).filter(i => !P.hidden.includes(i.id)).sort((a, b) => a.id < b.id ? -1 : 1), n = pool.length, jour = Math.floor(Date.now() / 864e5), du = k => pool[((jour - k) % n + n) % n];
  $("#dateJ").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  if (!n) { $("#jour").innerHTML = ""; $("#avant").innerHTML = ""; return; }
  const j = du(0); $("#jour").innerHTML = `<button class="jour" data-open="${j.id}" style="${fond(j)}"${lazy(j)}><span>${esc(label(j))} · ${esc(j.sourceNom)}</span><b>${esc(j.titre)}</b><span>${esc(j.texte.slice(0, 130))}</span></button>`;
  $("#avant").innerHTML = [1, 2, 3, 4, 5, 6].map(k => { const x = du(k); return `<button class="rw" data-open="${x.id}"><span class="th" style="${fond(x)}"${lazy(x)}>${x.video ? play(1) : ""}</span><span class="rt"><b>${esc(x.titre)}</b><small>${new Date(Date.now() - k * 864e5).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</small></span></button>` }).join("");
}
const okTyp = i => typ === "all" || (typ === "doc" && i.genre === "documentaire") || (typ === "clip" && i.video && i.genre !== "documentaire") || (typ === "article" && !i.video);
function rendreRecherche() {
  $("#catGrid").innerHTML = Object.entries(TOPICS).map(([k, v]) => `<button class="cat" data-cat="${k}" style="${fond({ tags: [k], id: "i" + k })}"><span>${v[0]}</span></button>`).join("");
  $$("[data-typ]").forEach(b => b.setAttribute("aria-pressed", b.dataset.typ === typ));
  const q = $("#q").value.toLowerCase().trim(), actif = q || cat || typ !== "all";
  $("#cats").hidden = !!actif; $("#hRes").hidden = !actif;
  const res = actif ? visibles().filter(i => (!cat || i.tags.includes(cat)) && okTyp(i) && (!q || (i.titre + " " + i.texte + " " + (i.auteurs || []).join(" ")).toLowerCase().includes(q))) : [];
  $("#hRes").textContent = (cat ? TOPICS[cat][0] + " · " : "") + res.length.toLocaleString("fr-FR") + " résultat" + (res.length > 1 ? "s" : "");
  $("#gRes").innerHTML = res.slice(0, limite).map(i => rw(i)).join("");
  $("#more").hidden = res.length <= limite; $("#msg").hidden = !(actif && !res.length);
}
function rendreBiblio() {
  $("#topics").innerHTML = Object.entries(TOPICS).map(([k, v]) => `<button class="pill" data-t="${k}" aria-pressed="${P.follows.includes(k)}">${P.follows.includes(k) ? "✓ " : "+ "}${v[0]}</button>`).join("");
  const aimes = tous.filter(i => P.liked.includes(i.id)); $("#gLiked").innerHTML = aimes.map(i => rw(i)).join(""); $("#noLiked").hidden = aimes.length > 0;
}
function rendre() { rendreAccueil(); rendreJour(); rendreRecherche(); rendreBiblio(); montrerPubs(); }
function onglet(t) {
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "v-" + t)); $$("#tabs button[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  if (t !== "search") { cat = null; typ = "all"; $("#q").value = ""; limite = 48; }
  if (t === "home") H = null;
  rendre(); scrollTo(0, 0);
}

/* ===== 6. Page d'un contenu ===== */
const SKIP = /^(Notes et références|Voir aussi|Liens externes|Bibliographie|Articles connexes|Sources|Références|Annexes|Notes|Liens internes)$/i;
function wikiHtml(t) {
  let saute = false; const o = [];
  for (const l of t.split("\n")) {
    const b = l.trim(); if (!b) continue;
    const m = b.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (m) { saute = SKIP.test(m[2]); if (!saute) o.push(`<h${m[1].length}>${esc(m[2])}</h${m[1].length}>`); continue; }
    if (!saute) o.push(`<p>${esc(b)}</p>`);
  }
  return o.join("");
}
async function chargerWiki(i) {
  try {
    const j = await (await fetch(`https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&pageids=${i.ref}&format=json&formatversion=2&origin=*`)).json();
    const t = (j.query.pages[0].extract || "").trim(); if (courant !== i.id || !$("#wk")) return;
    if (t.length > i.texte.length) $("#wk").innerHTML = wikiHtml(t); else if ($("#wkm")) $("#wkm").remove();
  } catch { if (courant === i.id && $("#wkm")) $("#wkm").textContent = "Lecture complète momentanément indisponible."; }
}
function ouvrir(id) {
  const i = byId.get(id); if (!i) return; courant = id;
  bump(i, 1.5); if (!P.clicked.includes(id)) P.clicked.push(id); save();
  const wiki = i.source === "wikipedia" && /^\d+$/.test(i.ref || "");
  const corps = wiki ? `<div id="wk"><p>${esc(i.texte)}</p><p class="mut" id="wkm">Chargement de l'article complet…</p></div>` : i.html || (i.corps && i.corps.length ? i.corps : [i.texte]).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("");
  const okV = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]+|archive\.org\/embed\/[\w.\-]+)$/.test(i.video || "");
  const vid = okV ? `<button class="facade" data-play="${esc(i.video)}" style="${fond(i)}"${lazy(i)} aria-label="Lancer la lecture"><i class="pl big"></i></button>` : "";
  const aut = (i.auteurs || []).join(", "), cap = i.credit && i.source === "conversation" ? `<p class="cap">${esc(i.credit)}</p>` : "";
  const pixel = /^https:\/\/counter\.theconversation\.com\//.test(i.pixel || "") ? `<img src="${esc(i.pixel)}" width="1" height="1" alt="" style="border:0;position:absolute;opacity:0">` : "";
  const cred = i.source === "conversation"
    ? `<div class="cred"><p><b>Par ${esc(aut)}</b></p><p>Cet article est republié à partir de ${esc(i.sourceNom)} sous licence Creative Commons (Attribution – Pas de modification). Texte intégral, non modifié.</p>${lienOk(i.lienOriginal) ? `<p><a href="${esc(i.lienOriginal)}" target="_blank" rel="noopener">Article original</a></p>` : ""}</div>${pixel}`
    : wiki ? `<div class="cred"><p>Article issu de Wikipédia, écrit par ses contributeurs, sous licence <b>CC BY-SA 4.0</b>. <a href="https://fr.wikipedia.org/?curid=${i.ref}" target="_blank" rel="noopener">Article d'origine</a> · <a href="https://fr.wikipedia.org/w/index.php?curid=${i.ref}&amp;action=history" target="_blank" rel="noopener">Auteurs</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">Licence</a></p>${i.image ? "<p>Image : Wikimedia Commons.</p>" : ""}</div>`
    : i.source === "archive" ? `<p class="cred">Vidéo hébergée par Internet Archive.${i.credit ? " " + esc(i.credit) + "." : ""}${aut ? " Auteur : " + esc(aut) + "." : ""}</p>`
    : i.source === "youtube" ? `<p class="cred">Vidéo de ${esc(i.sourceNom)}, lue depuis YouTube.</p>` : `<p class="cred">${aut ? "Par " + esc(aut) : "Par la rédaction Docu"}</p>`;
  const lies = visibles().filter(x => x.id !== id && x.tags.some(t => i.tags.includes(t))).slice(0, 6);
  $("#detail").innerHTML = `<div class="hero" style="${fond(i)}"${lazy(i)}><button class="back" data-close>‹ Retour</button><span>${esc(label(i))} · ${esc(i.sourceNom)}${i.date ? " · " + esc(fmt(i.date)) : ""}${i.langue && i.langue !== "FR" ? " · " + esc(i.langue) : ""}</span><b>${esc(i.titre)}</b>${aut && i.source !== "archive" ? `<span>Par ${esc(aut)}</span>` : ""}</div>
  <div class="body">${vid}${cap}${corps}<div class="acts"><button class="pill ${P.liked.includes(id) ? "on" : ""}" data-like="${id}">♥ J'aime</button><button class="pill" data-hide="${id}">✕ Pas intéressé</button></div>${cred}</div>
  ${lies.length ? `<div class="related"><h2>À découvrir aussi</h2><div class="rows" style="grid-template-columns:1fr">${lies.map(x => rw(x)).join("")}</div></div>` : ""}`;
  $("#detail").hidden = false; $("#detail").scrollTop = 0; document.body.style.overflow = "hidden";
  if (wiki) chargerWiki(i);
}
function fermer() { $("#detail").hidden = true; document.body.style.overflow = ""; courant = null; rendre(); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-open],[data-tab],[data-cat],[data-t],[data-close],[data-like],[data-hide],[data-typ],[data-play],#more,#btnAlert"); if (!b) return;
  const d = b.dataset;
  if (b.id === "btnAlert") majAbo(!aboActif);
  else if (d.play) { const f = document.createElement("iframe"); f.src = d.play; f.allow = "autoplay; fullscreen; picture-in-picture"; f.allowFullscreen = true; f.title = "Lecteur"; b.replaceWith(f); }
  else if (b.id === "more") { limite += 48; rendreRecherche(); }
  else if (d.open) ouvrir(d.open); else if (d.tab) onglet(d.tab); else if ("close" in d) fermer();
  else if (d.cat) { cat = d.cat; limite = 48; rendreRecherche(); }
  else if (d.typ) { typ = d.typ; limite = 48; rendreRecherche(); }
  else if (d.t) { P.follows = P.follows.includes(d.t) ? P.follows.filter(x => x !== d.t) : [...P.follows, d.t]; save(); H = null; rendreBiblio(); if (aboActif) majAbo(true); }
  else if (d.like) { const i = byId.get(d.like), on = P.liked.includes(i.id); P.liked = on ? P.liked.filter(x => x !== i.id) : [...P.liked, i.id]; bump(i, on ? -3 : 3); save(); b.classList.toggle("on", !on); }
  else if (d.hide) { const i = byId.get(d.hide); P.hidden.push(i.id); bump(i, -2); save(); fermer(); }
});
$("#q").oninput = () => { limite = 48; rendreRecherche(); };

/* ===== 7. Publicités + cookies ===== */
let consent = store.get("consent", null), adsLoaded = false;
function montrerPubs() {
  $$(".ad:not([data-done])").forEach(el => {
    el.dataset.done = 1;
    if (C.ADSENSE_CLIENT && consent === "yes") { el.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(C.ADSENSE_CLIENT)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {} }
    else if (C.AFFICHER_EMPLACEMENTS !== false) { el.classList.add("ph"); el.textContent = "Espace publicitaire"; }
  });
}
function chargerAds() { if (adsLoaded || !C.ADSENSE_CLIENT || consent !== "yes") return; adsLoaded = true; const s = document.createElement("script"); s.async = true; s.crossOrigin = "anonymous"; s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(C.ADSENSE_CLIENT); document.head.appendChild(s); }
function choisir(v) { consent = v; store.set("consent", v); $("#consent").hidden = true; $$(".ad").forEach(a => { delete a.dataset.done; a.className = "ad"; a.innerHTML = ""; }); chargerAds(); montrerPubs(); }
$("#cYes").onclick = () => choisir("yes"); $("#cNo").onclick = () => choisir("no");
$("#cookies").onclick = e => { e.preventDefault(); $("#consent").hidden = false; };
if (consent === null) $("#consent").hidden = false; else chargerAds();

/* ===== 8. Connexion + alertes email ===== */
const FR_ERR = { "Invalid login credentials": "Email ou mot de passe incorrect.", "Email not confirmed": "Confirmez d'abord votre email (lien reçu par mail).", "User already registered": "Ce compte existe déjà : connectez-vous." };
let inscription = false;
if (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) { try { sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); } catch { sb = null; } }
function majBtn() { const t = user ? "👤 " + (user.email || "").split("@")[0] : local ? "👤 " + local.nom : "Connexion"; $$(".authBtn").forEach(b => b.textContent = t); $("#acct").textContent = user ? "Connecté : " + user.email : local ? "Profil : " + local.nom : "Non connecté"; }
function majAlert() {
  $("#alertes").hidden = !(user || local); $("#btnAlert").hidden = !user;
  $("#alTxt").textContent = user ? (aboActif ? "✓ Alertes email activées" : "Recevoir les nouveaux documentaires par email") : "Alertes email : créez un compte avec votre email pour les recevoir.";
  $("#btnAlert").textContent = aboActif ? "Désactiver" : "Activer";
}
async function majAbo(actif) {
  if (!sb || !user) return;
  try { const { error } = await sb.from("abonnes").upsert({ id: user.id, email: user.email, actif, sujets: P.follows }); if (!error) aboActif = actif; } catch {}
  majAlert();
}
if (sb) sb.auth.onAuthStateChange(async (_e, session) => {
  user = session?.user || null; majBtn();
  if (user) {
    try {
      const { data } = await sb.from("profils").select("data").eq("id", user.id).maybeSingle();
      if (data?.data) { P = { ...P, ...data.data, last: Date.now() }; store.set("profil", P); H = null; rendre(); } else save();
      const ab = await sb.from("abonnes").select("actif").eq("id", user.id).maybeSingle(); aboActif = !!(ab.data && ab.data.actif);
      if (store.get("optin", false)) { store.set("optin", false); await majAbo(true); }
    } catch {}
  } else aboActif = false;
  majAlert();
});
function dialogue() {
  const co = user || local; $("#fSb").hidden = !!co || !sb; $("#fLocal").hidden = !!co || !!sb; $("#fOut").hidden = !co;
  $("#dTitre").textContent = co ? "Mon compte" : inscription ? "Créer un compte" : "Connexion";
  $("#who").textContent = user ? user.email : local ? "Profil sur cet appareil : " + local.nom : "";
  $("#err").hidden = true; $("#dlg").showModal();
}
$$(".authBtn").forEach(b => b.onclick = dialogue);
$("#bX").onclick = () => $("#dlg").close();
$("#bSw").onclick = () => { inscription = !inscription; $("#optinWrap").hidden = !inscription; $("#dTitre").textContent = inscription ? "Créer un compte" : "Connexion"; $("#bOk").textContent = inscription ? "Créer mon compte" : "Se connecter"; $("#bSw").textContent = inscription ? "J'ai déjà un compte" : "Créer un compte"; };
$("#fSb").onsubmit = async e => {
  e.preventDefault(); $("#err").hidden = true;
  const args = { email: $("#em").value.trim(), password: $("#pw").value };
  try {
    const { data, error } = inscription ? await sb.auth.signUp(args) : await sb.auth.signInWithPassword(args);
    if (error) throw error;
    if (inscription && $("#optin").checked) store.set("optin", true);
    if (inscription && !data.session) { $("#err").textContent = "Compte créé. Vérifiez votre email pour le confirmer, puis connectez-vous."; $("#err").hidden = false; $("#err").style.color = "inherit"; }
    else $("#dlg").close();
  } catch (x) { $("#err").style.color = ""; $("#err").textContent = FR_ERR[x.message] || x.message || "Erreur de connexion."; $("#err").hidden = false; }
};
$("#fLocal").onsubmit = e => { e.preventDefault(); local = { nom: $("#prenom").value.trim() }; store.set("local", local); majBtn(); majAlert(); $("#dlg").close(); };
$("#bOut").onclick = async () => { if (sb && user) await sb.auth.signOut(); user = null; local = null; aboActif = false; store.set("local", null); majBtn(); majAlert(); $("#dlg").close(); };

/* ===== 9b. Mode direct : va chercher en ligne des articles Wikipédia (texte libre CC BY-SA) si le catalogue est trop petit ===== */
const THEMES = ["astronomie", "océan", "faune", "climat", "cerveau", "histoire", "paléontologie", "robotique", "physique", "volcan", "médecine", "géologie", "écologie", "biologie", "chimie", "archéologie"];
async function wikiDirect(cible) {
  const base = "https://fr.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=extracts%7Cpageimages%7Cpageprops&exintro=1&explaintext=1&exlimit=20&piprop=thumbnail&pithumbsize=480&pilimit=20&ppprop=disambiguation&generator=search&gsrnamespace=0&gsrlimit=20&gsrsearch=";
  let ajoutes = 0;
  for (let off = 0; off < 400 && ajoutes < cible; off += 20) {
    for (let k = 0; k < THEMES.length && ajoutes < cible; k += 4) {
      const lots = await Promise.all(THEMES.slice(k, k + 4).map(t => json(base + encodeURIComponent(t) + "&gsroffset=" + off)));
      const items = [];
      lots.forEach(j => ((j && j.query && j.query.pages) || []).forEach(p => {
        const ex = (p.extract || "").replace(/\s+/g, " ").trim();
        if (ex.length < 350 || (p.pageprops && "disambiguation" in p.pageprops) || /^Liste /.test(p.title)) return;
        const im = p.thumbnail && p.thumbnail.source;
        items.push({ source: "wikipedia", ref: String(p.pageid), titre: p.title, texte: ex.slice(0, 450), image: im && /^https:\/\/upload\.wikimedia\.org\//.test(im) ? im : "", genre: "ecrit" });
      }));
      const avant = tous.length; ajouter(items); ajoutes += tous.length - avant;
      compteur(); if ($("#v-search").classList.contains("on")) rendreRecherche();
    }
  }
}

/* ===== 9. Chargement rapide par tranches ===== */
$("#gReco").innerHTML = '<div class="sk"></div>'.repeat(5);
const json = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
const complet = i => i.source === "archive" ? { sourceNom: "Internet Archive", image: `https://archive.org/services/img/${i.ref}`, video: `https://archive.org/embed/${i.ref}`, ...i }
  : i.source === "wikipedia" ? { sourceNom: "Wikipédia", ...i }
  : i.source === "youtube" ? { image: `https://i.ytimg.com/vi/${i.ref}/hqdefault.jpg`, video: `https://www.youtube-nocookie.com/embed/${i.ref}`, ...i } : i;
function ajouter(items) {
  for (const o of items) {
    const i = complet(o); if (!i.titre) continue;
    i.texte = i.texte || ""; i.id = hash(i.source + (i.ref || i.titre)); if (byId.has(i.id)) continue;
    i.ts = new Date(i.date).getTime(); i.tags = tagger(i); byId.set(i.id, i); tous.push(i);
  }
}
let enAttente = (location.hash.match(/^#d-(i[0-9a-z]+)$/) || [])[1];
function ouvrirAttendu() { if (enAttente && byId.has(enAttente)) { const x = enAttente; enAttente = null; ouvrir(x); } }
Promise.all([json("data/manifest.json"), json("data/articles.json"), json("contenus.json")]).then(async ([man, a, own]) => {
  ajouter((Array.isArray(own) ? own : []).map(o => ({ source: "docu", sourceNom: "Rédaction Docu", ...o })));
  ajouter((a && a.items) || []);
  const m = man || {}, nv = (m.videos && m.videos.n) || 0, nw = (m.wiki && m.wiki.n) || 0;
  const premiers = await Promise.all([nv ? json("data/videos-1.json") : null, nw ? json("data/wiki-1.json") : null]);
  premiers.forEach(d => d && d.items && ajouter(d.items));
  nBase = tous.length; H = null; rendre(); save(); ouvrirAttendu();
  if (((m.wiki && m.wiki.total) || 0) < 1000) wikiDirect(1500);
  if (!tous.length) $("#gReco").innerHTML = '<p class="mut">Les premiers contenus arrivent bientôt.</p>';
  for (let k = 2; k <= Math.max(nv, nw); k++) {
    const ds = await Promise.all([k <= nv ? json(`data/videos-${k}.json`) : null, k <= nw ? json(`data/wiki-${k}.json`) : null]);
    ds.forEach(d => d && d.items && ajouter(d.items));
    compteur(); if ($("#v-search").classList.contains("on")) rendreRecherche(); ouvrirAttendu();
  }
});
majBtn(); majAlert();
