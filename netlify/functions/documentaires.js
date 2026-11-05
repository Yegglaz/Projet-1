// Extraction des titres + courts textes (sans liens, images, crédits)
const cheerio = require("cheerio");

// >>> Adapte ces URL si besoin (flux RSS de préférence) <<<
const SOURCES = [
  { id: "futura", nom: "Futura-Sciences", urls: [
    "https://www.futura-sciences.com/rss/actualites.xml",
    "https://www.futura-sciences.com/rss/sciences.xml",
    "https://www.futura-sciences.com/tv/" ] },
  { id: "natgeo", nom: "National Geographic", urls: [
    "https://www.nationalgeographic.fr/rss",
    "https://www.nationalgeographic.fr/feed",
    "https://www.nationalgeographic.fr/" ] },
];

const MAX_PAR_SOURCE = 24;
const CREDIT = /(cr[ée]dit|©|copyright|photo\s*:|image\s*:|illustration\s*:|cr[ée]é(e)? par|via\s+getty|shutterstock|adobe\s*stock)/i;

function nettoyer(html = "") {
  const $ = cheerio.load(`<div>${html}</div>`);
  $("a, img, figure, figcaption, picture, script, style, iframe").each((_, el) => {
    // on garde le texte des liens, on supprime le lien lui-même
    if (el.tagName === "a") $(el).replaceWith($(el).text());
    else $(el).remove();
  });
  let txt = $("div").text().replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  // retire les phrases contenant une mention de crédit
  txt = txt.split(/(?<=[.!?])\s+/).filter((p) => !CREDIT.test(p)).join(" ");
  return txt.length > 320 ? txt.slice(0, 317).replace(/\s+\S*$/, "") + "…" : txt;
}

const titre = (t = "") => nettoyer(t).replace(CREDIT, "").trim();

function parseFlux(xml, src) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];
  $("item, entry").slice(0, MAX_PAR_SOURCE).each((_, el) => {
    const $el = $(el);
    const t = titre($el.find("title").first().text());
    const texte = nettoyer($el.find("description, summary, content\\:encoded").first().text());
    const date = $el.find("pubDate, published, updated").first().text();
    const l = $el.find("link").first();
    const lien = (l.text() || l.attr("href") || "").trim();
    if (t) items.push({ source: src.id, sourceNom: src.nom, titre: t, texte, date, lien });
  });
  return items;
}

function absolu(h, base) { try { return h ? new URL(h, base).href : ""; } catch { return ""; } }

function parseHtml(html, src) {
  const $ = cheerio.load(html);
  const items = [], vus = new Set();
  $("article, [class*=card], [class*=teaser]").each((_, el) => {
    if (items.length >= MAX_PAR_SOURCE) return;
    const $el = $(el);
    const t = titre($el.find("h1,h2,h3").first().text());
    if (!t || t.length < 12 || vus.has(t)) return;
    vus.add(t);
    items.push({ source: src.id, sourceNom: src.nom, titre: t, texte: nettoyer($el.find("p").first().text()), date: "", lien: absolu($el.find("a").first().attr("href"), src.url) });
  });
  return items;
}

async function lire(src, log) {
  for (const url of src.urls) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuBot/1.0)" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const corps = await r.text();
      const items = /<(rss|feed)[\s>]/i.test(corps.slice(0, 500)) ? parseFlux(corps, src) : parseHtml(corps, src);
      log.push({ source: src.nom, url, ok: items.length > 0, trouves: items.length });
      if (items.length) return items;
    } catch (e) { log.push({ source: src.nom, url, ok: false, erreur: e.message }); }
  }
  return [];
}

exports.handler = async (event) => {
  const log = [];
  const resultats = (await Promise.all(SOURCES.map((s) => lire(s, log)))).flat();
  const debug = event && event.queryStringParameters && event.queryStringParameters.debug;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": debug ? "no-store" : "public, max-age=600, s-maxage=10800",
    },
    body: JSON.stringify(debug ? { log } : { maj: new Date().toISOString(), total: resultats.length, items: resultats }),
  };
};
