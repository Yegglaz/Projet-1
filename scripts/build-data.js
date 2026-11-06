// Récupère chaque jour les articles de The Conversation France (licence CC BY-ND :
// texte republié EN ENTIER, SANS modification, avec auteur(s) + crédit + compteur).
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const FEEDS = [
  "https://theconversation.com/fr/articles.atom",
  "https://theconversation.com/fr/environnement/articles.atom",
  "https://theconversation.com/fr/sante/articles.atom",
  "https://theconversation.com/fr/sciences-et-technologie/articles.atom",
];
const MAX = 40;
const SCIENCE = /(scien|espace|astro|plan[èe]te|[ée]toile|oc[ée]an|animal|esp[èe]ce|climat|biodivers|for[êe]t|cerveau|sant[ée]|virus|g[ée]n[ée]tique|cellule|physique|chimie|[ée]nergie|nucl[ée]aire|dinosaure|fossile|arch[ée]olog|pr[ée]histoire|histoire|volcan|s[ée]isme|g[ée]olog|technolog|intelligence artificielle|robot|quantique|nature|m[ée]t[ée]o|glacier|insecte|oiseau|mer\b)/i;
const BALISES = new Set(["p","h2","h3","h4","ul","ol","li","blockquote","strong","em","b","i","br","figure","figcaption","img"]);
const IMG_OK = /^https:\/\/images\.theconversation\.com\//;

const get = async (u) => {
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuBot/1.0)" } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
};

// Nettoyage : on garde le texte à l'identique, on retire pubs/scripts/liens (le texte des liens reste).
function nettoyer($, racine) {
  racine.find("script,style,iframe,aside,form,button,noscript,svg,video,audio,[class*=newsletter],[class*=donate],[class*=related],[class*=promo]").remove();
  racine.find("img").each((_, el) => { const s = $(el).attr("src") || ""; if (!IMG_OK.test(s) || /[\s"'<>]/.test(s)) $(el).remove(); });
  racine.find("*").each((_, el) => {
    const t = el.tagName;
    if (!BALISES.has(t)) { $(el).replaceWith($(el).contents()); return; }   // liens <a> -> texte seul
    const keep = t === "img" ? { src: $(el).attr("src"), alt: $(el).attr("alt") || "", loading: "lazy" } : {};
    Object.keys(el.attribs || {}).forEach((k) => $(el).removeAttr(k));
    Object.entries(keep).forEach(([k, v]) => $(el).attr(k, v));
  });
  return racine.html().replace(/\s+\n/g, "\n").trim();
}

async function article(url) {
  const html = await get(url);
  const $ = cheerio.load(html);
  const meta = (n) => $(`meta[property="${n}"],meta[name="${n}"]`).attr("content") || "";
  const racine = $('[itemprop="articleBody"]').first().length ? $('[itemprop="articleBody"]').first() : $(".content-body").first();
  if (!racine.length) throw new Error("corps introuvable");
  const corps = nettoyer($, racine.clone());
  const brut = cheerio.load(`<div>${corps}</div>`)("div").text();
  const titre = (meta("og:title") || $("h1").first().text()).trim();
  const texte = meta("og:description").trim();
  if (brut.length < 800 || !titre) throw new Error("trop court");
  if (!SCIENCE.test(titre + " " + texte + " " + brut.slice(0, 600))) throw new Error("hors sujet");
  let auteurs = meta("author").split(/,| et /).map((s) => s.trim()).filter(Boolean);
  if (!auteurs.length) auteurs = $('[itemprop="author"] [itemprop="name"]').map((_, e) => $(e).text().trim()).get();
  const idm = url.match(/-(\d+)(?:[/?#].*)?$/);
  const image = meta("og:image");
  return {
    source: "conversation", sourceNom: "The Conversation France", titre, texte, date: meta("article:published_time") || "",
    auteurs, html: corps,
    image: IMG_OK.test(image) && !/[\s"'<>]/.test(image) ? image : "",
    credit: $("figure.hero figcaption, header figcaption").first().text().trim(),
    lienOriginal: url,
    pixel: idm ? `https://counter.theconversation.com/content/${idm[1]}/count.gif?distributor=republish-lightbox-advanced` : "",
  };
}

async function main() {
  const urls = new Set();
  for (const f of FEEDS) {
    try {
      const $ = cheerio.load(await get(f), { xmlMode: true });
      $("entry link[rel=alternate], item link, entry link").each((_, el) => {
        const u = ($(el).attr("href") || $(el).text() || "").trim();
        if (/^https:\/\/theconversation\.com\/(?!fr\/)[^/]+-\d+/.test(u) || /^https:\/\/theconversation\.com\/[^/]+-\d+$/.test(u)) urls.add(u);
      });
      console.log("flux ok:", f);
    } catch (e) { console.log("flux KO:", f, e.message); }
  }
  const liste = [...urls].slice(0, MAX * 2), items = [];
  for (let i = 0; i < liste.length && items.length < MAX; i += 4) {
    const lot = await Promise.allSettled(liste.slice(i, i + 4).map(article));
    lot.forEach((r, k) => r.status === "fulfilled" ? items.push(r.value) : console.log("ignoré:", liste[i + k], r.reason.message));
  }
  const sortie = path.join(__dirname, "..", "public", "data", "articles.json");
  if (!items.length) { console.log("Aucun article récupéré : on conserve le fichier existant."); return; }
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, JSON.stringify({ maj: new Date().toISOString(), total: items.length, items }));
  console.log(items.length, "articles enregistrés");
}
module.exports = { nettoyer };
if (require.main === module) main().catch((e) => { console.log("Échec :", e.message); });
