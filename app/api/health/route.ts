import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type CheckStatus = "ok" | "fail" | "not_configured";

type HealthReport = {
  ok: boolean;
  checkedAt: string;
  checks: {
    supabase: { status: CheckStatus; detail?: string };
    gemini: { status: CheckStatus; detail?: string };
  };
};

async function checkSupabase(): Promise<HealthReport["checks"]["supabase"]> {
  const sb = getSupabaseServer();
  if (!sb) return { status: "not_configured", detail: "Supabase env vars missing" };
  try {
    const { error } = await sb.from("arjuna_invites").select("code").limit(1);
    if (error) return { status: "fail", detail: error.message };
    return { status: "ok" };
  } catch (err) {
    return {
      status: "fail",
      detail: err instanceof Error ? err.message : "unreachable",
    };
  }
}

async function checkGemini(): Promise<HealthReport["checks"]["gemini"]> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    // Families use their own keys; a missing server key is not a failure.
    return { status: "not_configured", detail: "No server GEMINI_API_KEY set" };
  }
  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ok" }] }],
        generationConfig: { maxOutputTokens: 4, temperature: 0 },
      }),
    });
    // 429 means the key authenticated but the free-tier quota is busy.
    if (res.ok || res.status === 429) return { status: "ok" };
    return { status: "fail", detail: `Google returned ${res.status}` };
  } catch (err) {
    return {
      status: "fail",
      detail: err instanceof Error ? err.message : "unreachable",
    };
  }
}

async function logFailureForOwner(report: HealthReport) {
  const sb = getSupabaseServer();
  if (!sb) return;

  const failed = Object.entries(report.checks)
    .filter(([, check]) => check.status === "fail")
    .map(([name, check]) => `${name}: ${check.detail ?? "failed"}`);
  const summary = `Daily health check failed — ${failed.join("; ")}`;

  // Skip if the same alert was already logged in the last 20 hours.
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await sb
    .from("arjuna_feedback")
    .select("id")
    .eq("submitted_by", "system")
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) return;

  await sb.from("arjuna_feedback").insert({
    submitted_by: "system",
    child_name: "Health check",
    raw_text: summary,
    analysis: {
      summary,
      priority: "high",
      action_items: ["Open /api/health for details", "Ask the AI agent to investigate"],
      tags: ["system", "health"],
    },
  });
}

export async function GET(request: NextRequest) {
  const [supabase, gemini] = await Promise.all([checkSupabase(), checkGemini()]);

  const report: HealthReport = {
    ok: supabase.status !== "fail" && gemini.status !== "fail",
    checkedAt: new Date().toISOString(),
    checks: { supabase, gemini },
  };

  const isCron = request.headers
    .get("user-agent")
    ?.toLowerCase()
    .includes("vercel-cron");
  if (!report.ok && isCron) {
    await logFailureForOwner(report);
  }

  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
