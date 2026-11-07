// Construit chaque jour : 1) articles The Conversation (CC BY-ND, texte intégral, auteur crédité)
// 2) catalogue vidéo : Internet Archive (licences libres / domaine public) + chaînes YouTube (lecture intégrée).
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const FEEDS = [
  "https://theconversation.com/fr/articles.atom",
  "https://theconversation.com/fr/environnement/articles.atom",
  "https://theconversation.com/fr/sante/articles.atom",
  "https://theconversation.com/fr/sciences-et-technologie/articles.atom",
];
const MAX_ART = 40, MAX_VID = 12000;
let FIN = Infinity;
const hash = (x) => { let h = 5381; for (const c of x) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "i" + (h >>> 0).toString(36); };
const SCIENCE = /(scien|espace|astro|plan[èe]te|[ée]toile|oc[ée]an|animal|esp[èe]ce|climat|biodivers|for[êe]t|cerveau|sant[ée]|virus|g[ée]n[ée]tique|cellule|physique|chimie|[ée]nergie|nucl[ée]aire|dinosaure|fossile|arch[ée]olog|pr[ée]histoire|histoire|volcan|s[ée]isme|g[ée]olog|technolog|intelligence artificielle|robot|quantique|nature|m[ée]t[ée]o|glacier|insecte|oiseau|mer\b)/i;
const BALISES = new Set(["p","h2","h3","h4","ul","ol","li","blockquote","strong","em","b","i","br","figure","figcaption","img"]);
const IMG_OK = /^https:\/\/images\.theconversation\.com\//;
const LIC_OK = /creativecommons\.org\/(licenses\/(by|by-sa|by-nd|publicdomain)\/|publicdomain\/)/i;   // exclut les licences "NC" (pas d'usage commercial)

const T0 = Date.now(), BUDGET = 12 * 60 * 1000;                       // sécurité : on s'arrête avant la limite de Netlify
const dansBudget = () => Date.now() - T0 < BUDGET;
const get = async (u, essais = 2) => {
  for (let k = 1; ; k++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "DocuBot/1.0 (site de documentaires; republication sous licences libres)" }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) { if (k >= essais) throw e; await new Promise((r) => setTimeout(r, 1500)); }
  }
};
async function enParallele(liste, n, f) {
  const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < liste.length && dansBudget()) { const k = i++; try { const r = await f(liste[k]); if (r) res.push(r); } catch (e) { /* ignoré */ } }
  }));
  return res;
}
const texte = (s) => cheerio.load("<div>" + (Array.isArray(s) ? s.join(" ") : String(s || "")) + "</div>")("div").text().replace(/\s+/g, " ").trim();
const coupe = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);
const un = (v) => (Array.isArray(v) ? v[0] : v);
const duree = (r) => { r = String(un(r) || "").trim(); if (!r) return 0; let m = r.match(/^(?:(\d+):)?(\d+):(\d+)/); if (m) return Math.round(((+m[1] || 0) * 3600 + +m[2] * 60 + +m[3]) / 60); m = r.match(/^(\d+(?:\.\d+)?)/); return m ? Math.round(+m[1] > 400 ? +m[1] / 60 : +m[1]) : 0; };

/* ---------- The Conversation ---------- */
function nettoyer($, racine) {
  racine.find("script,style,iframe,aside,form,button,noscript,svg,video,audio,[class*=newsletter],[class*=donate],[class*=related],[class*=promo]").remove();
  racine.find("img").each((_, el) => { const s = $(el).attr("src") || ""; if (!IMG_OK.test(s) || /[\s"'<>]/.test(s)) $(el).remove(); });
  racine.find("*").each((_, el) => {
    const t = el.tagName;
    if (!BALISES.has(t)) { $(el).replaceWith($(el).contents()); return; }
    const keep = t === "img" ? { src: $(el).attr("src"), alt: $(el).attr("alt") || "", loading: "lazy" } : {};
    Object.keys(el.attribs || {}).forEach((k) => $(el).removeAttr(k));
    Object.entries(keep).forEach(([k, v]) => $(el).attr(k, v));
  });
  return racine.html().replace(/\s+\n/g, "\n").trim();
}
async function article(url) {
  const $ = cheerio.load(await get(url));
  const meta = (n) => $(`meta[property="${n}"],meta[name="${n}"]`).attr("content") || "";
  const racine = $('[itemprop="articleBody"]').first().length ? $('[itemprop="articleBody"]').first() : $(".content-body").first();
  if (!racine.length) throw new Error("corps introuvable");
  const corps = nettoyer($, racine.clone());
  const brut = cheerio.load(`<div>${corps}</div>`)("div").text();
  const titre = (meta("og:title") || $("h1").first().text()).trim();
  const resume = meta("og:description").trim();
  if (brut.length < 800 || !titre) throw new Error("trop court");
  if (!SCIENCE.test(titre + " " + resume + " " + brut.slice(0, 600))) throw new Error("hors sujet");
  let auteurs = meta("author").split(/,| et /).map((s) => s.trim()).filter(Boolean);
  if (!auteurs.length) auteurs = $('[itemprop="author"] [itemprop="name"]').map((_, e) => $(e).text().trim()).get();
  const idm = url.match(/-(\d+)(?:[/?#].*)?$/), image = meta("og:image");
  return {
    source: "conversation", sourceNom: "The Conversation France", titre, texte: resume, date: meta("article:published_time") || "",
    auteurs, html: corps, image: IMG_OK.test(image) && !/[\s"'<>]/.test(image) ? image : "",
    credit: $("figure.hero figcaption, header figcaption").first().text().trim(), lienOriginal: url,
    pixel: idm ? `https://counter.theconversation.com/content/${idm[1]}/count.gif?distributor=republish-lightbox-advanced` : "",
  };
}
async function conversation() {
  const urls = new Set();
  for (const f of FEEDS) {
    try {
      const $ = cheerio.load(await get(f), { xmlMode: true });
      $("entry link, item link").each((_, el) => {
        const u = ($(el).attr("href") || $(el).text() || "").trim();
        if (/^https:\/\/theconversation\.com\/[^/]+-\d+$/.test(u)) urls.add(u);
      });
      console.log("flux ok:", f);
    } catch (e) { console.log("flux KO:", f, e.message); }
  }
  const liste = [...urls].slice(0, MAX_ART * 2), items = [];
  for (let i = 0; i < liste.length && items.length < MAX_ART; i += 4) {
    const lot = await Promise.allSettled(liste.slice(i, i + 4).map(article));
    lot.forEach((r, k) => (r.status === "fulfilled" ? items.push(r.value) : console.log("ignoré:", liste[i + k], r.reason.message)));
  }
  return items;
}

/* ---------- Internet Archive (licences libres) ---------- */
const licence = (u) => {
  const m = (u || "").match(/creativecommons\.org\/licenses\/([a-z-]+)\/([\d.]+)/i);
  return m ? "CC " + m[1].toUpperCase() + " " + m[2] : /publicdomain|zero/i.test(u || "") ? "Domaine public" : "";
};
const langue = (l) => { const s = String(un(l) || "").toLowerCase(); return /^(fr|fre|fra|french)/.test(s) ? "FR" : /^(en|eng|english)/.test(s) ? "EN" : ""; };
async function archive(src) {
  const out = [], champs = ["identifier", "title", "description", "creator", "date", "publicdate", "licenseurl", "language", "runtime", "format"].map((f) => "fl%5B%5D=" + f).join("&");
  for (let p = 1; out.length < src.max && p <= 25 && Date.now() < FIN; p++) {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(src.q)}&${champs}&sort%5B%5D=downloads+desc&rows=200&page=${p}&output=json`;
    let docs;
    try { docs = JSON.parse(await get(url)).response.docs || []; } catch (e) { console.log("archive KO:", src.nom, "page", p, e.message); break; }
    if (!docs.length) break;
    for (const d of docs) {
      const id = String(d.identifier || ""), titre = texte(un(d.title));
      if (!/^[\w.\-]+$/.test(id) || !titre) continue;
      const lic = String(un(d.licenseurl) || "");
      if (!src.domainePublic && !LIC_OK.test(lic)) continue;
      const mins = duree(d.runtime), fm = [].concat(d.format || []).join(" ");
      if (fm && !/(MPEG4|h\.264|Ogg Video|WebM|Matroska|MPEG2)/i.test(fm)) continue;   // uniquement des films lisibles
      if (src.minMinutes && mins && mins < src.minMinutes) continue;   // on écarte les extraits trop courts
      const desc = texte(d.description), dateBrute = un(d.date) || un(d.publicdate) || "";
      out.push({
        source: "archive", ref: id, duree: mins, cc: /SubRip|WebVTT|Closed Caption/i.test(fm) ? 1 : 0, genre: src.genre || "documentaire", titre: coupe(titre, 140), texte: coupe(desc, 500),
        date: /^\d{4}/.test(dateBrute) ? String(dateBrute).slice(0, 10) : "",
        auteurs: [texte(un(d.creator))].filter(Boolean), langue: langue(d.language),
        credit: src.domainePublic ? src.nom + " — domaine public" : licence(lic),
      });
      if (out.length >= src.max) break;
    }
  }
  console.log("archive", src.nom + ":", out.length);
  return out;
}

/* ---------- Chaînes YouTube (lecture intégrée uniquement) ---------- */
async function youtube(ch) {
  try {
    const $ = cheerio.load(await get("https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(ch.id)), { xmlMode: true });
    const items = [];
    $("entry").each((_, el) => {
      const e = $(el), id = e.find("yt\\:videoId").text().trim();
      if (!/^[\w-]{6,20}$/.test(id)) return;
      items.push({
        source: "youtube", ref: id, genre: "documentaire", sourceNom: ch.nom, titre: coupe(texte(e.find("title").first().text()), 140),
        texte: coupe(texte(e.find("media\\:description").text()), 300), date: e.find("published").text().slice(0, 10),
        image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, video: `https://www.youtube-nocookie.com/embed/${id}`, credit: "Vidéo de " + ch.nom,
      });
    });
    console.log("youtube", ch.nom + ":", items.length);
    return items;
  } catch (e) { console.log("youtube KO:", ch.nom, e.message); return []; }
}


/* ---------- Wikipédia : « articles de qualité » et « bons articles » (CC BY-SA 4.0) ---------- */
const MAX_WIKI = 1200, DIR_WIKI = path.join(__dirname, "..", "public", "data", "wiki");
const WIKI_THEMES = ["astronomie","système solaire","cosmologie","océan","mammifère","oiseau","poisson","insecte","reptile","dinosaure","préhistoire","archéologie","Égypte antique","Rome antique","Moyen Âge","histoire de France","Seconde Guerre mondiale","géologie","volcan","climat","écologie","forêt","médecine","maladie","cerveau","génétique","biologie","physique","chimie","mathématiques","énergie nucléaire","informatique","exploration spatiale","astronaute","physicien","chimiste","naturaliste","explorateur","civilisation","mythologie"];
const escH = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function wikiHtml(txt) {
  const STOP = /^(Notes et références|Notes|Références|Voir aussi|Articles connexes|Liens externes|Bibliographie|Annexes|Sources|Publications|Filmographie|Galerie)$/i;
  const out = []; let intro = "", ignorer = false, total = 0, vuTitre = false;
  for (const ligne of txt.split("\n")) {
    const m = ligne.match(/^(={2,4})\s*(.+?)\s*={2,4}$/);
    if (m) { const niv = m[1].length === 2 ? 2 : 3; if (niv === 2) ignorer = STOP.test(m[2]); if (ignorer) continue; vuTitre = true; out.push(`<h${niv}>${escH(m[2])}</h${niv}>`); continue; }
    const l = ligne.trim(); if (!l || ignorer) continue;
    if (!vuTitre && !intro) intro = l;
    total += l.length; if (total > 70000) break;
    out.push(`<p>${escH(l)}</p>`);
  }
  return { html: out.join(""), intro };
}
async function wikiTitres() {
  const taches = [];
  for (const th of WIKI_THEMES) for (const cat of ["Article de qualité", "Bon article"]) for (const off of [0, 50, 100]) taches.push({ th, cat, off });
  const vus = new Map();
  await enParallele(taches, 6, async (t) => {
    const q = `incategory:"${t.cat}" ${t.th}`;
    const j = JSON.parse(await get(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=50&sroffset=${t.off}&srnamespace=0&srprop=wordcount&format=json`));
    ((j.query && j.query.search) || []).forEach((s) => { if (s.wordcount >= 1200 && !vus.has(s.pageid)) vus.set(s.pageid, s.title); });
  });
  return [...vus.entries()].slice(0, MAX_WIKI);
}
async function wikiArticle([pageid]) {
  const u = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=extracts%7Cpageimages%7Cinfo&explaintext=1&exsectionformat=wiki&piprop=thumbnail&pithumbsize=900&inprop=url&pageids=${pageid}`;
  const p = Object.values(JSON.parse(await get(u)).query.pages)[0];
  if (!p || !p.extract) throw new Error("vide");
  const { html, intro } = wikiHtml(p.extract);
  if (html.length < 3000) throw new Error("court");
  fs.mkdirSync(DIR_WIKI, { recursive: true });
  fs.writeFileSync(path.join(DIR_WIKI, pageid + ".json"), JSON.stringify({ html }));
  const th = p.thumbnail && p.thumbnail.source;
  return {
    source: "wikipedia", ref: String(pageid), sourceNom: "Wikipédia", genre: "dossier", titre: p.title, texte: coupe(intro, 320),
    date: String(p.touched || "").slice(0, 10), image: th && /^https:\/\/upload\.wikimedia\.org\/[\w.\-\/?=&%,+~:@;]+$/.test(th) ? th : "",
    lienOriginal: /^https:\/\/fr\.wikipedia\.org\//.test(p.fullurl || "") ? p.fullurl : "", credit: "Image : Wikimedia Commons",
  };
}
async function wikipedia() {
  const titres = await wikiTitres();
  console.log("wikipedia : titres trouvés", titres.length);
  const items = await enParallele(titres, 8, wikiArticle);
  console.log("wikipedia : dossiers enregistrés", items.length);
  return items;
}

/* ---------- Wikipédia (CC BY-SA) : des milliers d'articles de fond ---------- */
const WP = "https://fr.wikipedia.org/w/api.php";
const wp = async (p) => JSON.parse(await get(WP + "?" + new URLSearchParams({ format: "json", formatversion: "2", ...p })));
const MAUVAIS = /(Personnalit|Naissance|Décès|Biograph|Éponyme|Patronyme|Prénom|Wikipédia|Portail|Projet|Modèle|Liste|Homonymie|Jeu vidéo|Série|Chanson|Album|Film|Sportif|Footballeur)/i;
async function membres(cat, limite) {
  const pages = [], sous = []; let cont;
  do {
    const p = { action: "query", list: "categorymembers", cmtitle: cat, cmlimit: "500", cmtype: "page|subcat", cmnamespace: "0|14" };
    if (cont) p.cmcontinue = cont;
    const j = await wp(p);
    ((j.query && j.query.categorymembers) || []).forEach((x) => (x.ns === 14 ? sous.push(x.title) : pages.push(x.pageid)));
    cont = j.continue && j.continue.cmcontinue;
  } while (cont && pages.length < limite);
  return { pages, sous };
}
async function wikipedia(cfg) {
  const ids = new Set(), vus = new Set(), qualite = new Set(), max = cfg.max || 12000;
  for (const c of cfg.qualite || []) { try { const r = await membres(c, 20000); r.pages.forEach((id) => { qualite.add(id); ids.add(id); }); console.log("wikipédia qualité", c + ":", r.pages.length); } catch (e) { console.log("wikipédia KO:", c, e.message); } }
  const file = (cfg.categories || []).map((c) => [c, 0]);
  while (file.length && ids.size < max * 1.3 && Date.now() < FIN) {
    await Promise.all(file.splice(0, 4).map(async ([cat, prof]) => {
      if (vus.has(cat)) return; vus.add(cat);
      try { const r = await membres(cat, 3000); r.pages.forEach((id) => ids.add(id)); if (prof < (cfg.profondeur ?? 2)) r.sous.filter((x) => !MAUVAIS.test(x)).forEach((x) => file.push([x, prof + 1])); }
      catch (e) { console.log("wikipédia KO:", cat, e.message); }
    }));
  }
  console.log("wikipédia : pages candidates", ids.size, "catégories parcourues", vus.size);
  const liste = [...ids].slice(0, Math.round(max * 1.3)), lots = [], items = [];
  for (let i = 0; i < liste.length; i += 20) lots.push(liste.slice(i, i + 20));
  let k = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (k < lots.length && Date.now() < FIN) {
      const lot = lots[k++];
      try {
        const j = await wp({ action: "query", pageids: lot.join("|"), prop: "extracts|pageimages|pageprops", exintro: "1", explaintext: "1", exlimit: "20", piprop: "thumbnail", pithumbsize: "480", pilimit: "20", ppprop: "disambiguation" });
        for (const p of (j.query && j.query.pages) || []) {
          const ex = (p.extract || "").replace(/\s+/g, " ").trim();
          if (ex.length < 350 || (p.pageprops && "disambiguation" in p.pageprops) || /^Liste /.test(p.title)) continue;
          const im = p.thumbnail && p.thumbnail.source;
          items.push({ source: "wikipedia", ref: String(p.pageid), titre: p.title, texte: coupe(ex, 450), image: im && /^https:\/\/upload\.wikimedia\.org\/[\w.\-\/%,()~]+$/.test(im) ? im : "", genre: "ecrit", q: qualite.has(p.pageid) ? 1 : 0 });
        }
      } catch (e) { /* lot ignoré */ }
    }
  }));
  items.sort((a, b) => b.q - a.q);
  console.log("wikipédia :", items.length, "articles");
  return items.slice(0, max);
}

/* ---------- Écriture par tranches + liste des nouveautés ---------- */
const dossier = path.join(__dirname, "..", "public", "data");
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dossier, f), "utf8")); } catch { return null; } };
function ecrire(nom, items) {
  if (!items.length) { console.log(nom + " : rien récupéré, fichier conservé"); return false; }
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, nom), JSON.stringify({ maj: new Date().toISOString(), total: items.length, items }));
  console.log(nom + " :", items.length, "éléments"); return true;
}
function tranches(prefixe, items, taille = 1500) {
  if (!items.length) { console.log(prefixe + " : rien récupéré, anciennes tranches conservées"); return null; }
  fs.mkdirSync(dossier, { recursive: true });
  fs.readdirSync(dossier).filter((f) => f.startsWith(prefixe + "-")).forEach((f) => fs.unlinkSync(path.join(dossier, f)));
  const n = Math.ceil(items.length / taille);
  for (let k = 0; k < n; k++) fs.writeFileSync(path.join(dossier, `${prefixe}-${k + 1}.json`), JSON.stringify({ items: items.slice(k * taille, (k + 1) * taille) }));
  console.log(prefixe + " :", items.length, "éléments en", n, "fichiers"); return { n, total: items.length };
}
const RUBRIQUES = JSON.parse(fs.readFileSync(path.join(__dirname, "topics.json"), "utf8"));
const etiquettes = (i) => Object.keys(RUBRIQUES).filter((k) => new RegExp(RUBRIQUES[k], "i").test(i.titre + " " + (i.texte || "")));
async function nouveautes(tous) {
  const ids = tous.map((i) => hash(i.source + (i.ref || i.titre)));
  let avant = null;
  try { const base = (process.env.URL || "").replace(/\/$/, ""); if (base) avant = new Set(JSON.parse(await get(base + "/data/ids.json"))); } catch (e) { console.log("nouveautés : liste précédente indisponible"); }
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, "ids.json"), JSON.stringify(ids));
  const neuf = avant && avant.size ? tous.filter((_, k) => !avant.has(ids[k])) : [];
  const rang = (i) => (i.source === "conversation" ? 0 : i.q ? 1 : i.genre === "documentaire" ? 2 : 3);
  const sel = neuf.sort((a, b) => rang(a) - rang(b)).slice(0, 40).map((i) => ({ id: hash(i.source + (i.ref || i.titre)), titre: i.titre, texte: coupe(i.texte || "", 140), source: i.source, sourceNom: i.sourceNom || (i.source === "wikipedia" ? "Wikipédia" : "Internet Archive"), genre: i.genre || "", tags: etiquettes(i) }));
  fs.writeFileSync(path.join(dossier, "nouveautes.json"), JSON.stringify({ maj: new Date().toISOString(), items: sel }));
  console.log("nouveautés :", sel.length, "(sur", neuf.length, "nouveaux contenus)");
}

async function main() {
  FIN = Date.now() + 10 * 60 * 1000;
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "sources.json"), "utf8"));
  const ancien = lireJson("manifest.json") || {};
  const arts = await conversation(); ecrire("articles.json", arts);
  let wiki = []; try { wiki = await wikipedia(cfg.wikipedia || {}); } catch (e) { console.log("wikipédia KO:", e.message); }
  let vids = [];
  for (const lot of await Promise.all((cfg.archive || []).map(archive))) vids.push(...lot);
  for (const c of cfg.youtube || []) vids.push(...(await youtube(c)));
  const vu = new Set();
  vids = vids.filter((v) => (vu.has(v.source + v.ref) ? false : vu.add(v.source + v.ref))).slice(0, MAX_VID);
  const man = { maj: new Date().toISOString(), videos: tranches("videos", vids) || ancien.videos || { n: 0, total: 0 }, wiki: tranches("wiki", wiki) || ancien.wiki || { n: 0, total: 0 } };
  fs.writeFileSync(path.join(dossier, "manifest.json"), JSON.stringify(man));
  const arts2 = (lireJson("articles.json") || {}).items || arts;
  await nouveautes([...(arts2 || []), ...wiki, ...vids]);
  console.log("TOTAL : vidéos", man.videos.total, "| écrits Wikipédia", man.wiki.total, "| articles", (arts2 || []).length);
}
module.exports = { nettoyer, archive, youtube, licence, wikipedia, hash, nouveautes, tranches };
if (require.main === module) main().catch((e) => console.log("Échec :", e.message));
