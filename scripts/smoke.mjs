#!/usr/bin/env node
/**
 * Hits every /api/* route with a minimal payload and checks the server
 * responds with parseable JSON instead of crashing (Next's default error
 * page is HTML, so a JSON-parse failure reliably catches an unhandled
 * exception). Does NOT require a working Gemini key or Supabase — 400/401/
 * 422/502/503 with a structured JSON body are all expected "pass" results
 * when nothing is configured; the only failure signal is "did the server
 * blow up or return something that isn't JSON."
 *
 * Usage: npm run dev (in one terminal), then npm run smoke (in another).
 * Override target with SMOKE_BASE_URL.
 */

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3000";

function formData(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return form;
}

const tinyBlob = () => new Blob(["smoke"], { type: "image/jpeg" });
const tinyAudioBlob = () => new Blob(["smoke"], { type: "audio/webm" });

const routes = [
  { name: "chat", method: "POST", path: "/api/chat", json: {} },
  { name: "curriculum GET", method: "GET", path: "/api/curriculum" },
  { name: "curriculum POST", method: "POST", path: "/api/curriculum", json: {} },
  { name: "english/concept", method: "POST", path: "/api/english/concept", json: {} },
  { name: "english/daily-words", method: "POST", path: "/api/english/daily-words", json: {} },
  { name: "english/journal", method: "POST", path: "/api/english/journal", json: {} },
  { name: "events POST", method: "POST", path: "/api/events", json: {} },
  { name: "events GET", method: "GET", path: "/api/events" },
  { name: "exam GET", method: "GET", path: "/api/exam" },
  { name: "exam POST", method: "POST", path: "/api/exam", json: {} },
  { name: "exam/[id] GET", method: "GET", path: "/api/exam/smoketest" },
  {
    name: "exam/material",
    method: "POST",
    path: "/api/exam/material",
    form: () => formData({ examId: "smoketest" }),
  },
  { name: "exam/quiz", method: "POST", path: "/api/exam/quiz", json: {} },
  { name: "exam/revise", method: "POST", path: "/api/exam/revise", json: {} },
  { name: "exam/timetable JSON", method: "POST", path: "/api/exam/timetable", json: {} },
  { name: "extract-tasks", method: "POST", path: "/api/extract-tasks", json: {} },
  { name: "family/children GET", method: "GET", path: "/api/family/smoketest/children" },
  {
    name: "family/children POST",
    method: "POST",
    path: "/api/family/smoketest/children",
    json: {},
  },
  { name: "family/setup", method: "POST", path: "/api/family/smoketest/setup", json: {} },
  { name: "family/verify", method: "POST", path: "/api/family/smoketest/verify", json: {} },
  { name: "feedback", method: "POST", path: "/api/feedback", json: {} },
  { name: "gemini-test", method: "POST", path: "/api/gemini-test", json: {} },
  { name: "health", method: "GET", path: "/api/health" },
  { name: "invite/[code]", method: "GET", path: "/api/invite/smoketest" },
  { name: "owner/feedback", method: "GET", path: "/api/owner/feedback" },
  { name: "owner/invites GET", method: "GET", path: "/api/owner/invites" },
  { name: "owner/invites POST", method: "POST", path: "/api/owner/invites", json: {} },
  { name: "owner/login", method: "POST", path: "/api/owner/login", json: {} },
  { name: "owner/logout", method: "POST", path: "/api/owner/logout" },
  { name: "owner/sessions", method: "GET", path: "/api/owner/sessions" },
  {
    name: "photo",
    method: "POST",
    path: "/api/photo",
    form: () => formData({ photo: tinyBlob() }),
  },
  { name: "room POST", method: "POST", path: "/api/room" },
  { name: "room/[code] GET", method: "GET", path: "/api/room/smoketest" },
  { name: "room/[code] PATCH", method: "PATCH", path: "/api/room/smoketest", json: {} },
  { name: "room/supabase GET", method: "GET", path: "/api/room/supabase?code=smoketest" },
  { name: "room/supabase POST", method: "POST", path: "/api/room/supabase", json: {} },
  { name: "room/supabase PATCH", method: "PATCH", path: "/api/room/supabase", json: {} },
  { name: "solution", method: "POST", path: "/api/solution", json: {} },
  { name: "speak GET", method: "GET", path: "/api/speak" },
  { name: "speak POST", method: "POST", path: "/api/speak", json: {} },
  { name: "student/outcome", method: "POST", path: "/api/student/outcome", json: {} },
  { name: "summary", method: "POST", path: "/api/summary", json: {} },
  {
    name: "transcribe",
    method: "POST",
    path: "/api/transcribe",
    form: () => formData({ audio: tinyAudioBlob() }),
  },
  {
    name: "verify-answer",
    method: "POST",
    path: "/api/verify-answer",
    form: () => formData({ photo: tinyBlob(), subject: "Maths", task: "smoke test" }),
  },
];

async function checkRoute(route) {
  const init = { method: route.method };
  if (route.json !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(route.json);
  } else if (route.form) {
    init.body = route.form();
  }

  try {
    const res = await fetch(`${BASE_URL}${route.path}`, init);
    const text = await res.text();
    let parsed = true;
    if (text) {
      try {
        JSON.parse(text);
      } catch {
        parsed = false;
      }
    }
    const pass = parsed;
    return { route, pass, status: res.status, detail: parsed ? "" : text.slice(0, 120) };
  } catch (err) {
    return { route, pass: false, status: "ERR", detail: err.message };
  }
}

async function main() {
  console.log(`Smoke testing ${routes.length} routes against ${BASE_URL}\n`);
  const results = [];
  for (const route of routes) {
    results.push(await checkRoute(route));
  }

  let failures = 0;
  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    console.log(
      `${icon} [${r.status}] ${r.route.method} ${r.route.path} — ${r.route.name}${
        r.detail ? ` (${r.detail})` : ""
      }`,
    );
    if (!r.pass) failures += 1;
  }

  console.log(
    failures === 0
      ? `\nAll ${routes.length} routes responded with parseable JSON (no crashes).`
      : `\n${failures} of ${routes.length} route(s) returned a non-JSON response — investigate.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
