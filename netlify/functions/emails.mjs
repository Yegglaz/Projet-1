// Envoie chaque jour, aux abonnés, les NOUVEAUX documentaires correspondant à leurs sujets (via Brevo).
export default async () => {
  const E = process.env, site = (E.SITE_URL || E.URL || "").replace(/\/$/, "");
  if (!E.SUPABASE_URL || !E.SUPABASE_SERVICE_KEY || !E.BREVO_API_KEY || !E.EMAIL_EXPEDITEUR || !site) return new Response("Configuration email incomplète", { status: 500 });
  const nouv = await (await fetch(site + "/data/nouveautes.json")).json();
  if (!nouv.items || !nouv.items.length) return new Response("Rien de nouveau");
  const rest = (p, o = {}) => fetch(E.SUPABASE_URL + "/rest/v1/" + p, { ...o, headers: { apikey: E.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + E.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", ...(o.headers || {}) } });
  const abonnes = await (await rest("abonnes?actif=eq.true&select=id,email,sujets,token,dernier_envoi&limit=1000")).json();
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const aEnvoyer = abonnes.filter((a) => new Date(a.dernier_envoi || 0) < new Date(nouv.maj)).slice(0, 250);   // limite gratuite Brevo : 300 emails/jour
  let envoyes = 0;
  const envoyer = async (a) => {
    const choix = nouv.items.filter((i) => !(a.sujets || []).length || (i.tags || []).some((t) => a.sujets.includes(t))).slice(0, 8);
    if (choix.length) {
      const liste = choix.map((i) => `<li style="margin:0 0 14px"><a href="${site}/#d-${esc(i.id)}" style="font-weight:700;color:#7a3d9a;text-decoration:none">${esc(i.titre)}</a><br><span style="color:#666;font-size:13px">${esc(i.sourceNom)} — ${esc(i.texte)}</span></li>`).join("");
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Nouveaux documentaires pour vous</h2><ul style="padding-left:18px">${liste}</ul><p><a href="${site}">Tout découvrir sur Docu</a></p><p style="color:#888;font-size:12px">Vous recevez cet email car vous avez activé les alertes. <a href="${site}/.netlify/functions/desabo?t=${esc(a.token)}">Se désabonner</a></p></div>`;
      const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": E.BREVO_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ sender: { name: "Docu", email: E.EMAIL_EXPEDITEUR }, to: [{ email: a.email }], subject: "Nouveaux documentaires : " + choix[0].titre, htmlContent: html }) });
      if (!r.ok) return;
      envoyes++;
    }
    await rest("abonnes?id=eq." + a.id, { method: "PATCH", body: JSON.stringify({ dernier_envoi: new Date().toISOString() }) });
  };
  for (let i = 0; i < aEnvoyer.length; i += 10) await Promise.all(aEnvoyer.slice(i, i + 10).map((a) => envoyer(a).catch(() => {})));
  return new Response(`Emails envoyés : ${envoyes} / abonnés traités : ${aEnvoyer.length}`);
};
export const config = { schedule: "0 8 * * *" };
