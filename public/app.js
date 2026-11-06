const C = window.CONFIG || {};
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} } };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => { const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) };
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "i" + (h >>> 0).toString(36); };

/* ===== 1. Thématiques ===== */
const TOPICS = {
  espace: ["Espace", /espace|astro|galaxie|plan[èe]te|nasa|apollo|[ée]toile|mars\b|lune|trou noir|t[ée]lescope|cosm|satellite|solaire|fus[ée]e|astronaute|orbite|jupiter|saturne/i],
  animaux: ["Animaux", /animal|faune|esp[èe]ce|oiseau|requin|baleine|insecte|f[ée]lin|singe|loup|ours|pr[ée]dateur|wildlife|lion|elephant|[ée]l[ée]phant/i],
  oceans: ["Océans", /oc[ée]an|\bmer\b|marin|corail|poisson|plong[ée]e|dauphin|ocean|\bsea\b|reef/i],
  climat: ["Climat", /climat|r[ée]chauffement|carbone|pollution|[ée]colog|glacier|s[ée]cheresse|biodiversit|for[êe]t|climate|environment/i],
  sante: ["Santé & cerveau", /sant[ée]|cerveau|m[ée]dic|cancer|virus|vaccin|maladie|sommeil|g[ée]n[ée]tique|\badn\b|neuro|health|brain|disease/i],
  histoire: ["Histoire", /histoire|antique|[ée]gypt|romain|m[ée]di[ée]val|guerre|pharaon|civilisation|pr[ée]histoire|history|ancient|\bwar\b/i],
  archeo: ["Archéologie & fossiles", /arch[ée]olog|fouille|momie|fossile|dinosaure|pal[ée]ontolog|n[ée]andertal|fossil|dinosaur/i],
  tech: ["Technologie", /intelligence artificielle|\bIA\b|robot|ordinateur|technolog|num[ée]rique|quantique|batterie|drone|internet|computer|engineering/i],
  physique: ["Physique & chimie", /physique|particule|atome|chimie|mati[èe]re|laser|[ée]nergie|nucl[ée]aire|physics|chemistry|energy/i],
  terre: ["Planète Terre", /volcan|s[ée]isme|tremblement|g[ée]olog|montagne|d[ée]sert|m[ée]t[ée]o|temp[êe]te|tsunami|earth|volcano|weather|geology/i],
};
const tagger = i => Object.keys(TOPICS).filter(k => TOPICS[k][1].test(i.titre + " " + i.texte));

/* ===== 2. Profil ===== */
let P = { w: {}, follows: [], liked: [], hidden: [], clicked: [], last: Date.now(), ...store.get("profil", {}) };
const prevVisit = P.last;
for (const k in P.w) P.w[k] *= Math.pow(0.97, (Date.now() - P.last) / 864e5);
P.last = Date.now();
let sb = null, user = null, local = store.get("local", null), tSave = null;
function save() {
  store.set("profil", P);
  if (sb && user) { clearTimeout(tSave); tSave = setTimeout(() => sb.from("profils").upsert({ id: user.id, data: P, updated_at: new Date().toISOString() }).then(() => {}, () => {}), 800); }
}
const bump = (i, v) => i.tags.forEach(t => P.w[t] = (P.w[t] || 0) + v);

/* ===== 3. Recommandation ===== */
function score(i) {
  const age = (Date.now() - i.ts) / 864e5, fraicheur = isNaN(age) ? 0.2 : Math.exp(-age / 30);
  let aff = i.tags.reduce((a, t) => a + (P.w[t] || 0) + (P.follows.includes(t) ? 3 : 0), 0) / Math.sqrt(Math.max(1, i.tags.length));
  return aff + fraicheur + Math.random() * 0.6 - (P.clicked.includes(i.id) ? 1.5 : 0);
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

/* ===== 4. Visuels (illustrations originales + vraies images) ===== */
const COUL = { espace: ["#1b1f4b", "#6a3fa0"], oceans: ["#0b4f6c", "#20a4a8"], animaux: ["#3d6b2f", "#a3b83a"], climat: ["#1f5f4a", "#58a36c"], sante: ["#8a1c3b", "#e0566f"], histoire: ["#6b3b1b", "#d28a3c"], archeo: ["#5a3a22", "#c9a15a"], tech: ["#22223a", "#4a6cf7"], physique: ["#3a1c71", "#d76d77"], terre: ["#7a2e0e", "#e9803a"], _: ["#e8794d", "#7a3d9a"] };
const imgOk = u => /^https:\/\/[\w.\-\/?=&%,+~:@;]+$/.test(u || "");
function art(i) {
  const k = i.tags[0] || "_"; let r = parseInt(i.id.slice(1), 36) % 2147483646 + 1; const R = () => (r = r * 16807 % 2147483647) / 2147483647; let g = "";
  if (k === "espace") for (let n = 0; n < 45; n++) g += `<circle cx="${R() * 400 | 0}" cy="${R() * 300 | 0}" r="${(R() * 1.8 + .4).toFixed(1)}" fill="#fff" opacity="${(R() * .7 + .2).toFixed(2)}"/>`;
  else if (k === "oceans") for (let n = 0; n < 7; n++) g += `<path d="M0 ${50 + n * 40} Q50 ${20 + n * 40} 100 ${50 + n * 40} T200 ${50 + n * 40} T300 ${50 + n * 40} T400 ${50 + n * 40}" fill="none" stroke="#fff" stroke-width="2" opacity=".22"/>`;
  else if (k === "terre") g = `<path d="M0 300 L70 160 L120 220 L190 110 L260 230 L320 150 L400 260 L400 300Z" fill="#fff" opacity=".16"/><circle cx="320" cy="70" r="34" fill="#fff" opacity=".18"/>`;
  else if (k === "tech") for (let n = 0; n < 12; n++) g += `<path d="M${R() * 400 | 0} 0V300M0 ${R() * 300 | 0}H400" stroke="#fff" opacity=".12"/><circle cx="${R() * 400 | 0}" cy="${R() * 300 | 0}" r="4" fill="#fff" opacity=".4"/>`;
  else for (let n = 0; n < 6; n++) g += `<circle cx="${300 + (R() * 60 | 0)}" cy="${50 + (R() * 40 | 0)}" r="${30 + n * 34}" fill="none" stroke="#fff" stroke-width="2" opacity="${(.22 - n * .03).toFixed(2)}"/>`;
  return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${g}</svg>`)}')`;
}
const fond = i => { const [a, b] = COUL[i.tags[0] || "_"]; return imgOk(i.image) ? `background:linear-gradient(transparent 45%,#0008),url('${i.image}') center/cover,${a}` : `background:${art(i)} center/cover,linear-gradient(160deg,${a},${b})`; };

/* ===== 5. Données ===== */
let tous = [], byId = new Map(), cat = null, typ = "all", limite = 48, H = null;
const visibles = () => tous.filter(i => !P.hidden.includes(i.id));
const lienOk = u => /^https?:\/\//i.test(u || "");
const play = s => `<i class="pl${s ? " s" : ""}"></i>`;
const meta = i => [i.sourceNom, i.langue && i.langue !== "FR" ? i.langue : "", i.date ? fmt(i.date) : ""].filter(Boolean).join(" · ");
const rw = (i, r) => `<button class="rw" data-open="${i.id}"><span class="th" style="${fond(i)}">${i.video ? play(1) : ""}</span><span class="rt"><b>${esc(i.titre)}</b><small>${esc(r ? raison(i) || meta(i) : meta(i))}</small></span></button>`;
const cc = i => `<button class="cc" data-open="${i.id}" style="${fond(i)}"><span class="chip">${i.video ? "Vidéo" : "Article"} · ${esc(i.sourceNom)}</span><span class="ct">${esc(i.titre)}</span><span class="cx">${esc(i.texte)}</span><span class="go">${i.video ? "▶ Regarder" : "Découvrir"}</span></button>`;
const mc = i => `<button class="mc" data-open="${i.id}"><span class="pic" style="${fond(i)}">${play()}</span><b>${esc(i.titre)}</b><small>${esc(i.sourceNom)}</small></button>`;
const lst = ids => ids.map(x => byId.get(x)).filter(i => i && !P.hidden.includes(i.id));
const avecPubs = l => { const o = []; l.forEach((c, k) => { if (k && k % 9 === 0) o.push('<div class="ad" data-slot="inline" style="grid-column:1/-1"></div>'); o.push(c) }); return o.join(""); };

function calculerAccueil() {
  const base = visibles(), car = recommander(base, 5), vus = new Set(car.map(i => i.id));
  H = { car: car.map(i => i.id), vid: recommander(base.filter(i => i.video && !vus.has(i.id)), 10).map(i => i.id), reco: recommander(base.filter(i => !vus.has(i.id)), 12).map(i => i.id), art: recommander(base.filter(i => !i.video), 6).map(i => i.id) };
}
function rendreAccueil() {
  if (!H) calculerAccueil();
  $("#hello").textContent = new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
  $("#car").innerHTML = lst(H.car).map(cc).join("");
  const v = lst(H.vid); $("#sVid").hidden = !v.length; $("#hsVid").innerHTML = v.map(mc).join("");
  const nouv = visibles().filter(i => i.ts > prevVisit && i.tags.some(t => P.follows.includes(t))).slice(0, 6);
  $("#sNew").hidden = !nouv.length; $("#gNew").innerHTML = nouv.map(i => rw(i, true)).join("");
  $("#gReco").innerHTML = avecPubs(lst(H.reco).map(i => rw(i, true)));
  const a = lst(H.art); $("#sArt").hidden = !a.length; $("#gArt").innerHTML = a.map(i => rw(i)).join("");
}
function rendreJour() {
  const pool = [...visibles()].sort((a, b) => a.id < b.id ? -1 : 1), n = pool.length, jour = Math.floor(Date.now() / 864e5), du = k => pool[((jour - k) % n + n) % n];
  $("#dateJ").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  if (!n) { $("#jour").innerHTML = ""; $("#avant").innerHTML = ""; return; }
  const j = du(0); $("#jour").innerHTML = `<button class="jour" data-open="${j.id}" style="${fond(j)}"><span>${esc(j.sourceNom)}</span><b>${esc(j.titre)}</b><span>${esc(j.texte.slice(0, 130))}</span></button>`;
  $("#avant").innerHTML = [1, 2, 3, 4, 5, 6].map(k => { const x = du(k); return `<button class="rw" data-open="${x.id}"><span class="th" style="${fond(x)}">${x.video ? play(1) : ""}</span><span class="rt"><b>${esc(x.titre)}</b><small>${new Date(Date.now() - k * 864e5).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</small></span></button>` }).join("");
}
function rendreRecherche() {
  $("#catGrid").innerHTML = Object.entries(TOPICS).map(([k, v]) => `<button class="cat" data-cat="${k}" style="${fond({ tags: [k], id: "i" + k })}"><span>${v[0]}</span></button>`).join("");
  $$("[data-typ]").forEach(b => b.setAttribute("aria-pressed", b.dataset.typ === typ));
  const q = $("#q").value.toLowerCase().trim(), actif = q || cat || typ !== "all";
  $("#cats").hidden = !!actif; $("#hRes").hidden = !actif;
  const res = actif ? visibles().filter(i => (!cat || i.tags.includes(cat)) && (typ === "all" || (typ === "video") === !!i.video) && (!q || (i.titre + " " + i.texte + " " + (i.auteurs || []).join(" ")).toLowerCase().includes(q))) : [];
  $("#hRes").textContent = (cat ? TOPICS[cat][0] + " · " : "") + res.length + " résultat" + (res.length > 1 ? "s" : "");
  $("#gRes").innerHTML = res.slice(0, limite).map(i => rw(i)).join("");
  $("#more").hidden = res.length <= limite; $("#msg").hidden = !(actif && !res.length);
}
function rendreBiblio() {
  $("#topics").innerHTML = Object.entries(TOPICS).map(([k, v]) => `<button class="pill" data-t="${k}" aria-pressed="${P.follows.includes(k)}">${P.follows.includes(k) ? "✓ " : "+ "}${v[0]}</button>`).join("");
  const aimes = tous.filter(i => P.liked.includes(i.id)); $("#gLiked").innerHTML = aimes.map(i => rw(i)).join(""); $("#noLiked").hidden = aimes.length > 0;
  $("#acct").textContent = user ? "Connecté : " + user.email : local ? "Profil : " + local.nom : "Non connecté";
}
function rendre() { rendreAccueil(); rendreJour(); rendreRecherche(); rendreBiblio(); montrerPubs(); }
function onglet(t) {
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "v-" + t)); $$("#tabs button[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  if (t !== "search") { cat = null; typ = "all"; $("#q").value = ""; limite = 48; }
  if (t === "home") H = null; rendre(); scrollTo(0, 0);
}

/* ===== 6. Page d'un contenu ===== */
function ouvrir(id) {
  const i = byId.get(id); if (!i) return;
  bump(i, 1.5); if (!P.clicked.includes(id)) P.clicked.push(id); save();
  const corps = i.html || (i.corps && i.corps.length ? i.corps : [i.texte]).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("");
  const vid = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]+|archive\.org\/embed\/[\w.\-]+)$/.test(i.video || "") ? `<iframe src="${i.video}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen title="${esc(i.titre)}"></iframe>` : "";
  const aut = (i.auteurs || []).join(", "), cap = i.credit && i.source === "conversation" ? `<p class="cap">${esc(i.credit)}</p>` : "";
  const pixel = /^https:\/\/counter\.theconversation\.com\//.test(i.pixel || "") ? `<img src="${esc(i.pixel)}" width="1" height="1" alt="" style="border:0;position:absolute;opacity:0">` : "";
  const cred = i.source === "conversation"
    ? `<div class="cred"><p><b>Par ${esc(aut)}</b></p><p>Cet article est republié à partir de ${esc(i.sourceNom)} sous licence Creative Commons (Attribution – Pas de modification). Texte intégral, non modifié.</p>${lienOk(i.lienOriginal) ? `<p><a href="${esc(i.lienOriginal)}" target="_blank" rel="noopener">Article original</a></p>` : ""}</div>${pixel}`
    : i.source === "archive" ? `<p class="cred">Vidéo hébergée par Internet Archive.${i.credit ? " " + esc(i.credit) + "." : ""}${aut ? " Auteur : " + esc(aut) + "." : ""}</p>`
    : i.source === "youtube" ? `<p class="cred">Vidéo de ${esc(i.sourceNom)}, lue depuis YouTube.</p>` : `<p class="cred">${aut ? "Par " + esc(aut) : "Par la rédaction Docu"}</p>`;
  const lies = visibles().filter(x => x.id !== id && x.tags.some(t => i.tags.includes(t))).slice(0, 6);
  $("#detail").innerHTML = `<div class="hero" style="${fond(i)}"><button class="back" data-close>‹ Retour</button><span>${esc(i.sourceNom)}${i.date ? " · " + esc(fmt(i.date)) : ""}${i.langue && i.langue !== "FR" ? " · " + esc(i.langue) : ""}</span><b>${esc(i.titre)}</b>${aut && i.source !== "archive" ? `<span>Par ${esc(aut)}</span>` : ""}</div>
  <div class="body">${vid}${cap}${corps}<div class="acts"><button class="pill ${P.liked.includes(id) ? "on" : ""}" data-like="${id}">♥ J'aime</button><button class="pill" data-hide="${id}">✕ Pas intéressé</button></div>${cred}</div>
  ${lies.length ? `<div class="related"><h2>À découvrir aussi</h2><div class="rows" style="grid-template-columns:1fr">${lies.map(x => rw(x)).join("")}</div></div>` : ""}`;
  $("#detail").hidden = false; $("#detail").scrollTop = 0; document.body.style.overflow = "hidden";
}
function fermer() { $("#detail").hidden = true; document.body.style.overflow = ""; rendre(); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-open],[data-tab],[data-cat],[data-t],[data-close],[data-like],[data-hide],[data-typ],#more"); if (!b) return;
  const d = b.dataset;
  if (b.id === "more") { limite += 48; rendreRecherche(); }
  else if (d.open) ouvrir(d.open); else if (d.tab) onglet(d.tab); else if ("close" in d) fermer();
  else if (d.cat) { cat = d.cat; limite = 48; rendreRecherche(); }
  else if (d.typ) { typ = d.typ; limite = 48; rendreRecherche(); }
  else if (d.t) { P.follows = P.follows.includes(d.t) ? P.follows.filter(x => x !== d.t) : [...P.follows, d.t]; save(); H = null; rendreBiblio(); }
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

/* ===== 8. Connexion ===== */
const FR_ERR = { "Invalid login credentials": "Email ou mot de passe incorrect.", "Email not confirmed": "Confirmez d'abord votre email (lien reçu par mail).", "User already registered": "Ce compte existe déjà : connectez-vous." };
let inscription = false;
if (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) { try { sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); } catch { sb = null; } }
function majBtn() { const t = user ? "👤 " + (user.email || "").split("@")[0] : local ? "👤 " + local.nom : "Connexion"; $$(".authBtn").forEach(b => b.textContent = t); $("#acct").textContent = user ? "Connecté : " + user.email : local ? "Profil : " + local.nom : "Non connecté"; }
if (sb) sb.auth.onAuthStateChange(async (_e, session) => {
  user = session?.user || null; majBtn();
  if (user) { try { const { data } = await sb.from("profils").select("data").eq("id", user.id).maybeSingle(); if (data?.data) { P = { ...P, ...data.data, last: Date.now() }; store.set("profil", P); H = null; rendre(); } else save(); } catch {} }
});
function dialogue() {
  const co = user || local; $("#fSb").hidden = !!co || !sb; $("#fLocal").hidden = !!co || !!sb; $("#fOut").hidden = !co;
  $("#dTitre").textContent = co ? "Mon compte" : inscription ? "Créer un compte" : "Connexion";
  $("#who").textContent = user ? user.email : local ? "Profil sur cet appareil : " + local.nom : "";
  $("#err").hidden = true; $("#dlg").showModal();
}
$$(".authBtn").forEach(b => b.onclick = dialogue);
$("#bX").onclick = () => $("#dlg").close();
$("#bSw").onclick = () => { inscription = !inscription; $("#dTitre").textContent = inscription ? "Créer un compte" : "Connexion"; $("#bOk").textContent = inscription ? "Créer mon compte" : "Se connecter"; $("#bSw").textContent = inscription ? "J'ai déjà un compte" : "Créer un compte"; };
$("#fSb").onsubmit = async e => {
  e.preventDefault(); $("#err").hidden = true;
  const args = { email: $("#em").value.trim(), password: $("#pw").value };
  try {
    const { data, error } = inscription ? await sb.auth.signUp(args) : await sb.auth.signInWithPassword(args);
    if (error) throw error;
    if (inscription && !data.session) { $("#err").textContent = "Compte créé. Vérifiez votre email pour le confirmer, puis connectez-vous."; $("#err").hidden = false; $("#err").style.color = "inherit"; }
    else $("#dlg").close();
  } catch (x) { $("#err").style.color = ""; $("#err").textContent = FR_ERR[x.message] || x.message || "Erreur de connexion."; $("#err").hidden = false; }
};
$("#fLocal").onsubmit = e => { e.preventDefault(); local = { nom: $("#prenom").value.trim() }; store.set("local", local); majBtn(); rendreBiblio(); $("#dlg").close(); };
$("#bOut").onclick = async () => { if (sb && user) await sb.auth.signOut(); user = null; local = null; store.set("local", null); majBtn(); rendreBiblio(); $("#dlg").close(); };

/* ===== 9. Chargement ===== */
$("#gReco").innerHTML = '<div class="sk"></div>'.repeat(5);
const json = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
Promise.all([json("data/articles.json"), json("data/videos.json"), json("contenus.json")]).then(([a, v, own]) => {
  const items = [...(Array.isArray(own) ? own : []).map(o => ({ source: "docu", sourceNom: "Rédaction Docu", ...o })), ...((a && a.items) || []), ...((v && v.items) || [])];
  tous = items.map(i => ({ ...i, titre: i.titre || "", texte: i.texte || "", id: hash(i.source + (i.ref || i.titre)), ts: new Date(i.date).getTime(), tags: [] })).filter(i => i.titre);
  tous.forEach(i => { i.tags = tagger(i); byId.set(i.id, i); });
  tous = [...byId.values()]; H = null; rendre(); save();
  if (!tous.length) $("#gReco").innerHTML = '<p class="mut">Les premiers contenus arrivent bientôt.</p>';
});
majBtn();
