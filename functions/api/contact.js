const ALLOWED_HOSTS = ['itamax.fr', 'www.itamax.fr', 'localhost', '127.0.0.1'];
const MAX = { name: 100, email: 150, phone: 30, subject: 150, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function onRequestPost(context) {
  try {
    return await handle(context);
  } catch (err) {
    console.log('contact: exception', err && err.stack ? err.stack : String(err));
    return json(500, { ok: false, error: 'Erreur interne (E500). Veuillez réessayer plus tard.' });
  }
}

async function handle({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Requête invalide.' });
  }
  if (clean(data.website, 200)) return json(200, { ok: true });

  const name = clean(data.name, MAX.name);
  const email = clean(data.email, MAX.email);
  const phone = clean(data.phone, MAX.phone);
  const subject = clean(data.subject, MAX.subject);
  const message = clean(data.message, MAX.message);
  const token = clean(data.token, 2048);

  if (!email || !message) {
    return json(400, { ok: false, error: 'Veuillez remplir tous les champs obligatoires.' });
  }
  if (!EMAIL_RE.test(email)) {
    return json(400, { ok: false, error: 'Adresse email invalide.' });
  }
  if (!token) {
    return json(400, { ok: false, error: 'Vérification anti-robot manquante.' });
  }
  if (!env.TURNSTILE_SECRET || !env.MAILER) {
    return json(500, { ok: false, error: 'Formulaire non configuré.' });
  }
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);

  let verify;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    verify = await r.json();
  } catch {
    return json(502, { ok: false, error: 'Vérification anti-robot indisponible.' });
  }
  if (!verify.success || (verify.hostname && !ALLOWED_HOSTS.includes(verify.hostname))) {
    console.log('contact: turnstile refused', JSON.stringify(verify));
    const codes = (verify['error-codes'] || []).join(',') || (verify.success ? 'hostname:' + verify.hostname : 'inconnu');
    return json(403, { ok: false, codes, error: `Vérification anti-robot échouée (${codes}). Rechargez la page.` });
  }
  try {
    const r = await env.MAILER.fetch('https://mailer/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, subject, message }),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok || !result.ok) {
      console.log('contact: mailer failed', r.status, JSON.stringify(result).slice(0, 500));
      return json(500, { ok: false, error: "L'envoi a échoué (E-MAIL). Veuillez réessayer plus tard." });
    }
  } catch (err) {
    console.log('contact: mailer error', String(err));
    return json(500, { ok: false, error: "L'envoi a échoué (E-BIND). Veuillez réessayer plus tard." });
  }

  console.log('contact: sent');
  return json(200, { ok: true });
}

export const onRequest = () => json(405, { ok: false, error: 'Méthode non autorisée.' });
