// GET /api/keepalive — run once a day by Vercel Cron (vercel.json) so a free Supabase project is never paused
// for inactivity (it pauses after about 7 days without database requests).
// It asks the database for one entry id with the public anon key. Row-level security returns nothing to an
// anonymous caller, so no bookkeeping data is read or changed — the request alone counts as activity.
const env = (k) => String(process.env[k] || "").trim();
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  // With CRON_SECRET set in Vercel, only Vercel Cron (which sends it as a Bearer token) can call this.
  const secret = env("CRON_SECRET");
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
  const url = env("SUPABASE_URL").replace(/\/+$/, ""), key = env("SUPABASE_ANON_KEY");
  if (!url || !key) return res.status(500).json({ ok: false, error: "SUPABASE_URL / SUPABASE_ANON_KEY not set" });
  try {
    const r = await fetch(`${url}/rest/v1/entries?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String((e && e.message) || e) });
  }
}
