// Inscription aux nouveautés par e-mail, SANS compte (double confirmation par e-mail)
const SUJETS = ["espace", "animaux", "oceans", "climat", "sante", "histoire", "archeo", "tech", "physique", "terre"];
const rep = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });
export default async (req) => {
  if (req.method !== "POST") return rep({ ok: false, message: "Méthode non autorisée." }, 405);
  const E = process.env, site = (E.SITE_URL || E.URL || "").replace(/\/$/, "");
  if (!E.SUPABASE_URL || !E.SUPABASE_SERVICE_KEY || !E.BREVO_API_KEY || !E.EMAIL_EXPEDITEUR || !site) return rep({ ok: false, message: "L'inscription par e-mail n'est pas encore activée sur ce site." }, 503);
  let b; try { b = await req.json(); } catch { return rep({ ok: false, message: "Requête invalide." }, 400); }
  if (b.site) return rep({ ok: true, message: "Merci !" });                       // piège à robots
  const email = String(b.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) return rep({ ok: false, message: "Adresse e-mail invalide." }, 400);
  const sujets = (Array.isArray(b.sujets) ? b.sujets : []).filter((s) => SUJETS.includes(s));
  const H = { apikey: E.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + E.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" };
  const base = E.SUPABASE_URL + "/rest/v1/lettre";
  try {
    const ex = await (await fetch(`${base}?email=eq.${encodeURIComponent(email)}&select=id,token,confirme,actif,demande_le`, { headers: H })).json();
    const ligne = Array.isArray(ex) ? ex[0] : null;
    if (ligne && ligne.confirme && ligne.actif) {
      await fetch(`${base}?id=eq.${ligne.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ sujets }) });
      return rep({ ok: true, message: "Vous êtes déjà inscrit : vos sujets ont été mis à jour." });
    }
    if (ligne && !ligne.confirme && Date.now() - new Date(ligne.demande_le).getTime() < 10 * 60 * 1000) return rep({ ok: true, message: "Un e-mail de confirmation vous a déjà été envoyé : vérifiez votre boîte (et les indésirables)." });
    let token;
    if (ligne) {
      token = ligne.token;
      await fetch(`${base}?id=eq.${ligne.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ sujets, actif: true, confirme: false, demande_le: new Date().toISOString() }) });
    } else {
      const r = await fetch(base, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ email, sujets }) });
      if (!r.ok) return rep({ ok: false, message: "Inscription impossible pour le moment. Réessayez plus tard." }, 500);
      token = (await r.json())[0].token;
    }
    const lien = `${site}/.netlify/functions/confirmer?t=${token}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Confirmez votre inscription</h2><p>Vous avez demandé à recevoir par e-mail les nouveaux documentaires de Docu.</p><p><a href="${lien}" style="display:inline-block;background:#7a3d9a;color:#fff;padding:12px 22px;border-radius:24px;text-decoration:none;font-weight:700">Confirmer mon inscription</a></p><p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : aucun e-mail ne vous sera envoyé.</p></div>`;
    const m = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": E.BREVO_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ sender: { name: "Docu", email: E.EMAIL_EXPEDITEUR }, to: [{ email }], subject: "Confirmez votre inscription à Docu", htmlContent: html }) });
    if (!m.ok) return rep({ ok: false, message: "L'e-mail de confirmation n'a pas pu être envoyé. Réessayez plus tard." }, 502);
    return rep({ ok: true, message: "Presque fini ! Un e-mail de confirmation vient de vous être envoyé : cliquez sur le lien pour valider votre inscription (pensez à vérifier les indésirables)." });
  } catch { return rep({ ok: false, message: "Inscription impossible pour le moment. Réessayez plus tard." }, 500); }
};
