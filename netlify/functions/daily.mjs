// Chaque jour : relance la construction du site (qui récupère les nouveaux articles)
export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) return new Response("BUILD_HOOK_URL manquant", { status: 500 });
  await fetch(hook, { method: "POST" });
  return new Response("ok");
};
export const config = { schedule: "0 5 * * *" };
