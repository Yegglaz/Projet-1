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
const SCIENCE = /(scien|espace|astro|plan[èe]te|[ée]toile|oc[ée]an|animal|esp[èe]ce|climat|biodivers|for[êe]t|cerveau|sant[ée]|virus|g[ée]n[ée]tique|cellule|physique|chimie|[ée]nergie|nucl[ée]aire|dinosaure|fossile|arch[ée]olog|pr[ée]histoire|histoire|volcan|s[ée]isme|g[ée]olog|technolog|intelligence artificielle|robot|quantique|nature|m[ée]t[ée]o|glacier|insecte|oiseau|mer\b)/i;
const BALISES = new Set(["p","h2","h3","h4","ul","ol","li","blockquote","strong","em","b","i","br","figure","figcaption","img"]);
const IMG_OK = /^https:\/\/images\.theconversation\.com\//;
const LIC_OK = /creativecommons\.org\/(licenses\/(by|by-sa|by-nd|publicdomain)\/|publicdomain\/)/i;   // exclut les licences "NC" (pas d'usage commercial)

const get = async (u) => {
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuBot/1.0)" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
};
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
  const out = [], champs = ["identifier", "title", "description", "creator", "date", "publicdate", "licenseurl", "language", "runtime"].map((f) => "fl%5B%5D=" + f).join("&");
  for (let p = 1; out.length < src.max && p <= 25; p++) {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(src.q)}&${champs}&sort%5B%5D=downloads+desc&rows=200&page=${p}&output=json`;
    let docs;
    try { docs = JSON.parse(await get(url)).response.docs || []; } catch (e) { console.log("archive KO:", src.nom, "page", p, e.message); break; }
    if (!docs.length) break;
    for (const d of docs) {
      const id = String(d.identifier || ""), titre = texte(un(d.title));
      if (!/^[\w.\-]+$/.test(id) || !titre) continue;
      const lic = String(un(d.licenseurl) || "");
      if (!src.domainePublic && !LIC_OK.test(lic)) continue;
      const mins = duree(d.runtime);
      if (src.minMinutes && mins && mins < src.minMinutes) continue;   // on écarte les extraits trop courts
      const desc = texte(d.description), dateBrute = un(d.date) || un(d.publicdate) || "";
      out.push({
        source: "archive", ref: id, duree: mins, genre: src.genre || "documentaire", titre: coupe(titre, 140), texte: coupe(desc, 500),
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

function ecrire(nom, items) {
  const f = path.join(__dirname, "..", "public", "data", nom);
  if (!items.length) { console.log(nom + " : rien récupéré, fichier conservé"); return; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ maj: new Date().toISOString(), total: items.length, items }));
  console.log(nom + " :", items.length, "éléments");
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "sources.json"), "utf8"));
  ecrire("articles.json", await conversation());
  let vids = [];
  for (const lot of await Promise.all((cfg.archive || []).map(archive))) vids.push(...lot);
  for (const c of cfg.youtube || []) vids.push(...(await youtube(c)));
  const vu = new Set();
  vids = vids.filter((v) => (vu.has(v.source + v.ref) ? false : vu.add(v.source + v.ref))).slice(0, MAX_VID);
  ecrire("videos.json", vids);
}
module.exports = { nettoyer, archive, youtube, licence };
if (require.main === module) main().catch((e) => console.log("Échec :", e.message));
