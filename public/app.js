const C = window.CONFIG || {};
const $ = s => document.querySelector(s);
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} } };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => { const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) };

/* ---------- 1. Thématiques (détection par mots-clés) ---------- */
const TOPICS = {
  espace: ["Espace", /espace|astro|galaxie|plan[èe]te|nasa|[ée]toile|mars\b|lune|trou noir|t[ée]lescope|cosm|satellite|solaire/i],
  animaux: ["Animaux", /animal|faune|esp[èe]ce|oiseau|requin|baleine|insecte|f[ée]lin|singe|loup|ours|pr[ée]dateur/i],
  oceans: ["Océans", /oc[ée]an|\bmer\b|marin|corail|poisson|plong[ée]e|dauphin/i],
  climat: ["Climat", /climat|r[ée]chauffement|carbone|pollution|[ée]colog|glacier|s[ée]cheresse|biodiversit|for[êe]t/i],
  sante: ["Santé & cerveau", /sant[ée]|cerveau|m[ée]dic|cancer|virus|vaccin|maladie|sommeil|g[ée]n[ée]tique|\badn\b|neuro/i],
  histoire: ["Histoire", /histoire|antique|[ée]gypt|romain|m[ée]di[ée]val|guerre|pharaon|civilisation|pr[ée]histoire/i],
  archeo: ["Archéologie & fossiles", /arch[ée]olog|fouille|momie|fossile|dinosaure|pal[ée]ontolog|n[ée]andertal/i],
  tech: ["Technologie", /intelligence artificielle|\bIA\b|robot|ordinateur|technolog|num[ée]rique|quantique|batterie|drone|internet/i],
  physique: ["Physique & chimie", /physique|particule|atome|chimie|mati[èe]re|laser|[ée]nergie|nucl[ée]aire/i],
  terre: ["Planète Terre", /volcan|s[ée]isme|tremblement|g[ée]olog|montagne|d[ée]sert|m[ée]t[ée]o|temp[êe]te|tsunami/i],
};
const tagger = i => Object.keys(TOPICS).filter(k => TOPICS[k][1].test(i.titre + " " + i.texte));
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "i" + (h >>> 0).toString(36); };

/* ---------- 2. Profil utilisateur (goûts appris) ---------- */
let P = store.get("profil", { w: {}, follows: [], liked: [], hidden: [], clicked: [], last: Date.now() });
const prevVisit = P.last;
const jours = (Date.now() - P.last) / 864e5;
for (const k in P.w) P.w[k] *= Math.pow(0.97, jours);       // oubli progressif des goûts anciens
P.last = Date.now();
let sb = null, user = null, tSave = null;
function save() {
  store.set("profil", P);
  if (sb && user) { clearTimeout(tSave); tSave = setTimeout(() => sb.from("profils").upsert({ id: user.id, data: P, updated_at: new Date().toISOString() }), 800); }
}
const bump = (item, v) => { item.tags.forEach(t => P.w[t] = (P.w[t] || 0) + v); };

/* ---------- 3. Algorithme de recommandation ---------- */
function score(i) {
  const age = (Date.now() - i.ts) / 864e5;
  const fraicheur = isNaN(age) ? 0.3 : Math.exp(-age / 10);                  // les contenus récents montent
  let aff = i.tags.reduce((a, t) => a + (P.w[t] || 0) + (P.follows.includes(t) ? 3 : 0), 0);
  aff /= Math.sqrt(Math.max(1, i.tags.length));                              // évite de favoriser les contenus sur-étiquetés
  return aff + fraicheur * 1.5 + Math.random() * 0.4 - (P.clicked.includes(i.id) ? 1.5 : 0);
}
function recommander(items, n) {
  const pool = items.filter(i => !P.hidden.includes(i.id)).map(i => ({ i, s: score(i) }));
  const out = [], vu = {};
  while (out.length < n && pool.length) {                                   // ré-ordonnancement avec diversité (MMR)
    pool.forEach(p => p.m = p.s - 0.8 * p.i.tags.reduce((a, t) => a + (vu[t] || 0), 0));
    pool.sort((a, b) => b.m - a.m);
    const p = pool.shift(); out.push(p.i); p.i.tags.forEach(t => vu[t] = (vu[t] || 0) + 1);
  }
  const hors = pool.filter(p => p.i.tags.every(t => !(P.w[t] > 0.5)));       // 1 carte « découverte » hors de vos habitudes
  if (out.length >= 4 && hors.length) out[out.length - 1] = hors[Math.floor(Math.random() * hors.length)].i;
  return out;
}
function raison(i) {
  const t = [...i.tags].sort((a, b) => (P.w[b] || 0) + (P.follows.includes(b) ? 3 : 0) - (P.w[a] || 0) - (P.follows.includes(a) ? 3 : 0))[0];
  if (!t) return "";
  if (P.follows.includes(t)) return "Parce que vous suivez « " + TOPICS[t][0] + " »";
  return P.w[t] > 0.5 ? "Parce que vous aimez « " + TOPICS[t][0] + " »" : "À découvrir : " + TOPICS[t][0];
}

/* ---------- 4. Affichage ---------- */
let tous = [], filtre = "all";
const lienOk = u => /^https?:\/\//i.test(u || "");
function carte(i, opts = {}) {
  const nouveau = opts.nouveau ? '<span class="new">NOUVEAU</span>' : "";
  return `<article class="card ${i.source}" data-id="${i.id}"><div class="in"><span class="tag">${esc(i.sourceNom)}</span>${nouveau}
  <h3>${esc(i.titre)}</h3>${i.texte ? `<p>${esc(i.texte)}</p>` : ""}
  <div class="why">${opts.raison ? esc(raison(i)) : esc(fmt(i.date))}</div></div>
  <div class="acts"><button data-a="like" class="${P.liked.includes(i.id) ? "on" : ""}">♥ J'aime</button><button data-a="hide">✕ Pas intéressé</button>
  ${lienOk(i.lien) ? `<a href="${esc(i.lien)}" target="_blank" rel="noopener nofollow" data-a="open">Lire sur ${esc(i.sourceNom)} ↗</a>` : ""}</div></article>`;
}
const pubSlot = () => `<div class="ad" data-slot="inline"></div>`;
function avecPubs(cartes) { const o = []; cartes.forEach((c, k) => { if (k && k % 8 === 0) o.push(pubSlot()); o.push(c); }); return o.join(""); }

function rendre() {
  const q = $("#q").value.toLowerCase().trim();
  const base = tous.filter(i => !P.hidden.includes(i.id) && (filtre === "all" || i.source === filtre));
  const liste = base.filter(i => (i.titre + " " + i.texte).toLowerCase().includes(q));
  const rech = q.length > 0;
  $("#secReco").hidden = rech; $("#secNew").hidden = true;
  if (!rech) {
    $("#gReco").innerHTML = recommander(base, 6).map(i => carte(i, { raison: true })).join("");
    const nouv = base.filter(i => i.ts > prevVisit && i.tags.some(t => P.follows.includes(t))).slice(0, 6);
    if (nouv.length) { $("#secNew").hidden = false; $("#gNew").innerHTML = nouv.map(i => carte(i, { nouveau: true })).join(""); }
  }
  $("#hAll").textContent = rech ? `Résultats (${liste.length})` : "Tous les contenus";
  $("#gAll").innerHTML = avecPubs(liste.map(i => carte(i)));
  $("#msg").hidden = liste.length > 0; $("#msg").textContent = "Aucun résultat.";
  montrerPubs();
}
function pills() {
  const src = [["all", "Tout"], ...new Map(tous.map(i => [i.source, i.sourceNom]))];
  $("#sources").innerHTML = src.map(([id, n]) => `<button class="pill" data-s="${id}" aria-pressed="${id === filtre}">${esc(n)}</button>`).join("");
  $("#topics").innerHTML = Object.entries(TOPICS).map(([k, v]) => `<button class="pill" data-t="${k}" aria-pressed="${P.follows.includes(k)}">${P.follows.includes(k) ? "✓ " : "+ "}${v[0]}</button>`).join("");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-s],[data-t],[data-a]"); if (!b) return;
  if (b.dataset.s) { filtre = b.dataset.s; pills(); rendre(); }
  if (b.dataset.t) { const t = b.dataset.t; P.follows = P.follows.includes(t) ? P.follows.filter(x => x !== t) : [...P.follows, t]; save(); pills(); rendre(); }
  if (b.dataset.a) {
    const i = tous.find(x => x.id === b.closest(".card").dataset.id); if (!i) return;
    if (b.dataset.a === "like") { const on = P.liked.includes(i.id); P.liked = on ? P.liked.filter(x => x !== i.id) : [...P.liked, i.id]; bump(i, on ? -3 : 3); save(); rendre(); }
    if (b.dataset.a === "hide") { P.hidden.push(i.id); bump(i, -2); save(); rendre(); }
    if (b.dataset.a === "open") { bump(i, 1.5); if (!P.clicked.includes(i.id)) P.clicked.push(i.id); save(); }
  }
});
$("#q").oninput = rendre;

/* ---------- 5. Publicités + consentement ---------- */
let consent = store.get("consent", null), adsLoaded = false;
function montrerPubs() {
  document.querySelectorAll(".ad:not([data-done])").forEach(el => {
    el.dataset.done = 1;
    if (C.ADSENSE_CLIENT && consent === "yes") {
      el.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(C.ADSENSE_CLIENT)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    } else if (C.AFFICHER_EMPLACEMENTS) { el.classList.add("ph"); el.textContent = "Espace publicitaire"; }
  });
}
function chargerAds() {
  if (adsLoaded || !C.ADSENSE_CLIENT || consent !== "yes") return;
  adsLoaded = true; const s = document.createElement("script"); s.async = true; s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(C.ADSENSE_CLIENT); document.head.appendChild(s);
}
function choisir(v) { consent = v; store.set("consent", v); $("#consent").hidden = true; document.querySelectorAll(".ad").forEach(a => { delete a.dataset.done; a.className = "ad"; a.innerHTML = ""; }); chargerAds(); montrerPubs(); }
$("#cYes").onclick = () => choisir("yes"); $("#cNo").onclick = () => choisir("no");
$("#cookies").onclick = e => { e.preventDefault(); $("#consent").hidden = false; };
if (consent === null) $("#consent").hidden = false; else chargerAds();

/* ---------- 6. Connexion (Supabase) ---------- */
let modeInscription = false;
function majBtn() { $("#btnAuth").textContent = user ? "Déconnexion" : "Connexion"; }
if (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) {
  sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  sb.auth.onAuthStateChange(async (_e, session) => {
    user = session?.user || null; majBtn();
    if (user) {
      const { data } = await sb.from("profils").select("data").eq("id", user.id).maybeSingle();
      if (data?.data) { P = { ...P, ...data.data, last: Date.now() }; store.set("profil", P); pills(); rendre(); } else save();
    }
  });
}
$("#btnAuth").onclick = async () => {
  if (!sb) { alert("La connexion n'est pas encore activée (voir config.js)."); return; }
  if (user) { await sb.auth.signOut(); return; }
  $("#dlg").showModal();
};
$("#bX").onclick = () => $("#dlg").close();
$("#bSw").onclick = () => { modeInscription = !modeInscription; $("#dTitre").textContent = modeInscription ? "Créer un compte" : "Connexion"; $("#bOk").textContent = modeInscription ? "Créer mon compte" : "Se connecter"; $("#bSw").textContent = modeInscription ? "J'ai déjà un compte" : "Créer un compte"; };
$("#fAuth").onsubmit = async e => {
  e.preventDefault(); $("#err").hidden = true;
  const args = { email: $("#em").value, password: $("#pw").value };
  const { error } = modeInscription ? await sb.auth.signUp(args) : await sb.auth.signInWithPassword(args);
  if (error) { $("#err").textContent = error.message; $("#err").hidden = false; return; }
  if (modeInscription) $("#dInfo").textContent = "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.";
  else $("#dlg").close();
};

/* ---------- 7. Chargement des contenus ---------- */
function ingerer(d) {
  tous = d.items.map(i => ({ ...i, id: hash(i.source + i.titre), ts: new Date(i.date).getTime(), tags: [] }));
  tous.forEach(i => i.tags = tagger(i));
  $("#maj").textContent = `${d.total} contenus · mis à jour le ${fmt(d.maj)}`;
  pills(); rendre();
}
const cache = store.get("cacheContenus", null);
if (cache && cache.items && cache.items.length) ingerer(cache);                // affichage instantané
else $("#gAll").innerHTML = '<div class="card sk"></div>'.repeat(6);          // squelette
fetch("/.netlify/functions/documentaires").then(r => r.json()).then(d => {
  if (!d.items || !d.items.length) throw new Error("vide");
  store.set("cacheContenus", d); ingerer(d); save();
}).catch(() => {
  if (!tous.length) { $("#gAll").innerHTML = ""; $("#maj").textContent = ""; $("#msg").hidden = false; $("#msg").textContent = "Contenus momentanément indisponibles. Réessayez dans quelques minutes."; }
});
majBtn(); montrerPubs();
