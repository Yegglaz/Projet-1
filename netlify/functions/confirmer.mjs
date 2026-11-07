// Lien de confirmation reçu par e-mail
const page = (t, s = 200) => new Response(`<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;max-width:480px;margin:60px auto;padding:0 20px"><h2>Docu</h2><p>${t}</p><p><a href="/">Retour au site</a></p>`, { status: s, headers: { "content-type": "text/html; charset=utf-8" } });
export default async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!/^[0-9a-f-]{36}$/i.test(t)) return page("Lien invalide.", 400);
  const E = process.env;
  const r = await fetch(`${E.SUPABASE_URL}/rest/v1/lettre?token=eq.${t}`, { method: "PATCH", headers: { apikey: E.SUPABASE_SERVICE_KEY, Authorization: "Bearer " + E.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ confirme: true, actif: true, dernier_envoi: new Date().toISOString() }) });
  return r.ok ? page("Merci ! Votre inscription est confirmée : vous recevrez les nouveaux documentaires par e-mail.") : page("Confirmation impossible pour le moment. Réessayez plus tard.", 500);
};
