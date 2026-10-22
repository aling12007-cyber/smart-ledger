// /api/keepalive: one harmless request to Supabase with the anon key; refuses callers without the cron secret.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/keepalive.js";

const res = () => { const r = { code: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

test("keepalive pings the entries table with the anon key, read-only", async () => {
  process.env.SUPABASE_URL = "https://x.supabase.co/"; process.env.SUPABASE_ANON_KEY = "anon"; delete process.env.CRON_SECRET;
  let called = null;
  globalThis.fetch = async (u, o) => { called = { u, o }; return { ok: true, status: 200 }; };
  const r = res(); await handler({ headers: {} }, r);
  assert.equal(r.code, 200);
  assert.equal(called.u, "https://x.supabase.co/rest/v1/entries?select=id&limit=1");
  assert.equal(called.o.method, undefined);
  assert.equal(called.o.headers.apikey, "anon");
});

test("with CRON_SECRET set, other callers are refused", async () => {
  process.env.CRON_SECRET = "s";
  globalThis.fetch = async () => { throw new Error("must not be called"); };
  const r = res(); await handler({ headers: { authorization: "Bearer wrong" } }, r);
  assert.equal(r.code, 401);
  delete process.env.CRON_SECRET;
});
