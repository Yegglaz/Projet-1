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


/* ---------- 4. Interface mobile ---------- */
let tous=[],cat=null;
const COUL={espace:["#1b1f4b","#6a3fa0"],oceans:["#0b4f6c","#20a4a8"],animaux:["#3d6b2f","#a3b83a"],climat:["#1f5f4a","#58a36c"],sante:["#8a1c3b","#e0566f"],histoire:["#6b3b1b","#d28a3c"],archeo:["#5a3a22","#c9a15a"],tech:["#22223a","#4a6cf7"],physique:["#3a1c71","#d76d77"],terre:["#7a2e0e","#e9803a"],_:["#e8794d","#7a3d9a"]};
const imgOk=u=>/^https:\/\/[\w.\-\/?=&%,+~:@;]+$/.test(u||"");
const fond=i=>{const [a,b]=COUL[i.tags[0]||"_"];return imgOk(i.image)?`background:linear-gradient(transparent 30%,#0008),url(${i.image}) center/cover,${a}`:`background:linear-gradient(160deg,${a},${b})`};
const lienOk=u=>/^https?:\/\//i.test(u||"");
const rw=(i,r)=>`<button class="rw" data-open="${i.id}"><span class="th" style="${fond(i)}"></span><span class="rt"><b>${esc(i.titre)}</b><small>${esc(r?raison(i)||i.sourceNom:i.sourceNom+(i.date?" · "+fmt(i.date):""))}</small></span></button>`;
const cc=i=>`<button class="cc" data-open="${i.id}" style="${fond(i)}"><span class="chip">${esc(i.sourceNom)}</span><span class="ct">${esc(i.titre)}</span><span class="cx">${esc(i.texte)}</span><span class="go">Découvrir</span></button>`;
const avecPubs=l=>{const o=[];l.forEach((c,k)=>{if(k&&k%6===0)o.push('<div class="ad" data-slot="inline" style="grid-column:1/-1"></div>');o.push(c)});return o.join("")};
const visibles=()=>tous.filter(i=>!P.hidden.includes(i.id));

function rendre(){
  const base=visibles(), h=new Date().getHours();
  $("#hello").textContent=h<18?"Bonjour":"Bonsoir";
  const reco=recommander(base,12);
  $("#car").innerHTML=reco.slice(0,5).map(cc).join("");
  $("#gReco").innerHTML=avecPubs(reco.slice(5).map(i=>rw(i,true)));
  const nouv=base.filter(i=>i.ts>prevVisit&&i.tags.some(t=>P.follows.includes(t))).slice(0,6);
  $("#gNew").previousElementSibling.hidden=$("#gNew").hidden=!nouv.length;
  $("#gNew").innerHTML=nouv.map(i=>rw(i,true)).join("");
  // Du jour : un documentaire par jour, stable pour tous
  const pool=[...base].sort((a,b)=>a.id<b.id?-1:1), n=pool.length, jour=Math.floor(Date.now()/864e5);
  const du=k=>pool[((jour-k)%n+n)%n];
  $("#dateJ").textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  if(n){const j=du(0);$("#jour").innerHTML=`<button class="jour" data-open="${j.id}" style="${fond(j)}"><span>${esc(j.sourceNom)}</span><b>${esc(j.titre)}</b><span>${esc(j.texte.slice(0,120))}</span></button>`;
   $("#avant").innerHTML=[1,2,3,4,5,6].map(k=>{const x=du(k);return `<button class="rw" data-open="${x.id}"><span class="th" style="${fond(x)}"></span><span class="rt"><b>${esc(x.titre)}</b><small>${new Date(Date.now()-k*864e5).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</small></span></button>`}).join("");}
  // Recherche
  $("#catGrid").innerHTML=Object.entries(TOPICS).map(([k,v])=>`<button class="cat" data-cat="${k}" style="${fond({tags:[k]})}">${v[0]}</button>`).join("");
  const q=$("#q").value.toLowerCase().trim(), actif=q||cat;
  $("#cats").hidden=!!actif; $("#hRes").hidden=!actif;
  const res=actif?base.filter(i=>(!cat||i.tags.includes(cat))&&(i.titre+" "+i.texte).toLowerCase().includes(q)):[];
  $("#hRes").textContent=(cat?TOPICS[cat][0]+" · ":"")+res.length+" résultat"+(res.length>1?"s":"");
  $("#gRes").innerHTML=res.map(i=>rw(i)).join(""); $("#msg").hidden=!(actif&&!res.length);
  // Bibliothèque
  const aimes=tous.filter(i=>P.liked.includes(i.id));
  $("#gLiked").innerHTML=aimes.map(i=>rw(i)).join(""); $("#noLiked").hidden=aimes.length>0;
  pills(); montrerPubs();
}
function pills(){$("#topics").innerHTML=Object.entries(TOPICS).map(([k,v])=>`<button class="pill" data-t="${k}" aria-pressed="${P.follows.includes(k)}">${P.follows.includes(k)?"✓ ":"+ "}${v[0]}</button>`).join("")}
function onglet(t){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id==="v-"+t));document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));if(t!=="search"){cat=null;$("#q").value=""}rendre();scrollTo(0,0)}
function ouvrir(id){
  const i=tous.find(x=>x.id===id); if(!i)return;
  bump(i,1.5); if(!P.clicked.includes(id))P.clicked.push(id); save();
  const corps=i.html||(i.corps||[i.texte]).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join("");
  const vid=/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+$/.test(i.video||"")?`<iframe src="${i.video}" loading="lazy" allowfullscreen></iframe>`:"";
  const aut=(i.auteurs||[]).join(", ");
  const cap=i.credit?`<p class="cap">${esc(i.credit)}</p>`:"";
  const pixel=/^https:\/\/counter\.theconversation\.com\//.test(i.pixel||"")?`<img src="${esc(i.pixel)}" width="1" height="1" alt="" style="border:0;position:absolute;opacity:0">`:"";
  const cred=i.source==="conversation"
   ?`<div class="cred"><p><b>Par ${esc(aut)}</b></p><p>Cet article est republié à partir de ${esc(i.sourceNom)} sous licence Creative Commons (Attribution – Pas de modification). Texte intégral, non modifié.</p>${lienOk(i.lienOriginal)?`<p><a href="${esc(i.lienOriginal)}" target="_blank" rel="noopener">Article original</a></p>`:""}</div>${pixel}`
   :`<p class="cred">${aut?"Par "+esc(aut):"Par la rédaction Docu"}</p>`;
  $("#detail").innerHTML=`<div class="hero" style="${fond(i)};position:relative"><button class="back" data-close>‹ Retour</button><span>${esc(i.sourceNom)}${i.date?" · "+esc(fmt(i.date)):""}</span><b>${esc(i.titre)}</b>${aut?`<span>Par ${esc(aut)}</span>`:""}</div>
  <div class="body">${cap}${vid}${corps}<div class="acts"><button class="pill ${P.liked.includes(id)?"on":""}" data-like="${id}">♥ J'aime</button><button class="pill" data-hide="${id}">✕ Pas intéressé</button></div>${cred}</div>`;
  $("#detail").hidden=false; $("#detail").scrollTop=0; document.body.style.overflow="hidden";
}
function fermer(){$("#detail").hidden=true;document.body.style.overflow="";rendre()}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-open],[data-tab],[data-cat],[data-t],[data-close],[data-like],[data-hide]"); if(!b)return;
  const d=b.dataset;
  if(d.open)ouvrir(d.open); else if(d.tab)onglet(d.tab); else if("close" in d)fermer();
  else if(d.cat){cat=d.cat;rendre()} 
  else if(d.t){P.follows=P.follows.includes(d.t)?P.follows.filter(x=>x!==d.t):[...P.follows,d.t];save();rendre()}
  else if(d.like){const i=tous.find(x=>x.id===d.like),on=P.liked.includes(i.id);P.liked=on?P.liked.filter(x=>x!==i.id):[...P.liked,i.id];bump(i,on?-3:3);save();b.classList.toggle("on",!on)}
  else if(d.hide){const i=tous.find(x=>x.id===d.hide);P.hidden.push(i.id);bump(i,-2);save();fermer()}
});
$("#q").oninput=rendre;
$("#q").addEventListener("keydown",e=>{if(e.key==="Escape"){cat=null;$("#q").value="";rendre()}});

/* ---------- 7. Chargement ---------- */
function ingerer(d,own){
  const tout=[...(own||[]).map(o=>({source:"docu",sourceNom:"Rédaction Docu",lien:"",...o})),...d.items];
  tous=tout.map(i=>({...i,texte:i.texte||"",id:hash(i.source+i.titre),ts:new Date(i.date).getTime(),tags:[]}));
  tous.forEach(i=>i.tags=tagger(i)); rendre();
}
$("#gReco").innerHTML='<div class="sk"></div>'.repeat(5);
const json=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
Promise.all([json("data/articles.json"),json("contenus.json")]).then(([d,own])=>{
  ingerer(d&&d.items?d:{items:[]},Array.isArray(own)?own:[]); save();
  if(!tous.length)$("#gReco").innerHTML='<p class="mut">Les premiers contenus arrivent bientôt.</p>';
});
majBtn();
