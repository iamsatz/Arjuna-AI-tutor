"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppPhase } from "@/lib/phase";
import type { StoredInvite } from "@/lib/invitesStore";
import type { StoredSession } from "@/lib/sessionsStore";
import type { FeedbackAnalysis } from "@/lib/feedback";

type FeedbackRow = {
  id: string;
  created_at: string;
  submitted_by: string;
  child_name: string | null;
  raw_text: string;
  analysis: FeedbackAnalysis;
};

type HealthReport = {
  ok: boolean;
  checkedAt: string;
  checks: Record<string, { status: "ok" | "fail" | "not_configured"; detail?: string }>;
};

export default function OwnerDashboardPage() {
  const router = useRouter();
  const phase = getAppPhase();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [invites, setInvites] = useState<StoredInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteLabel, setInviteLabel] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [health, setHealth] = useState<HealthReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionsRes, invitesRes, feedbackRes] = await Promise.all([
          fetch("/api/owner/sessions"),
          fetch("/api/owner/invites"),
          fetch("/api/owner/feedback"),
        ]);

        if (!sessionsRes.ok || !invitesRes.ok) {
          throw new Error("Could not load dashboard data");
        }

        const sessionsData = (await sessionsRes.json()) as {
          sessions: StoredSession[];
        };
        const invitesData = (await invitesRes.json()) as {
          invites: StoredInvite[];
        };
        const feedbackData = feedbackRes.ok
          ? ((await feedbackRes.json()) as { feedback: FeedbackRow[] })
          : { feedback: [] };

        setSessions(sessionsData.sessions ?? []);
        setInvites(invitesData.invites ?? []);
        setFeedback(feedbackData.feedback ?? []);
      } catch {
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();

    void fetch("/api/health")
      .then((res) => res.json() as Promise<HealthReport>)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/owner/logout", { method: "POST" });
    router.push("/owner/login");
    router.refresh();
  }

  async function handleCreateInvite() {
    setCreatingInvite(true);
    try {
      const response = await fetch("/api/owner/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: inviteLabel }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Create failed");
      }

      const data = (await response.json()) as { invite: StoredInvite };
      setInvites((current) => [data.invite, ...current]);
      setInviteLabel("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create invite link.",
      );
    } finally {
      setCreatingInvite(false);
    }
  }

  function inviteUrl(code: string) {
    if (typeof window === "undefined") return `/join/${code}`;
    return `${window.location.origin}/join/${code}`;
  }

  async function copyInviteLink(code: string) {
    await navigator.clipboard.writeText(inviteUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function whatsappInviteMessage(code: string) {
    return [
      "Hi! 🏹 Arjuna is a free AI homework tutor for your kids (Telugu + English).",
      "",
      "1. Open this link on your phone:",
      inviteUrl(code),
      "",
      `2. If it asks for a family code, type: ${code}`,
      "3. Enter your child's name — homework starts right away!",
    ].join("\n");
  }

  function whatsappShareUrl(code: string) {
    return `https://wa.me/?text=${encodeURIComponent(whatsappInviteMessage(code))}`;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl bg-arjuna-bg px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
            Arjuna · Owner
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-arjuna-text">
            Dashboard
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="rounded-xl border border-arjuna-primary/20 bg-white px-4 py-2 text-sm font-medium text-arjuna-text"
        >
          Log out
        </button>
      </div>

      <section className="mb-6 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">Invite links</h2>
        <p className="mt-2 text-sm text-arjuna-muted">
          Create a link for each family. They enter the child&apos;s name on
          first open.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={inviteLabel}
            onChange={(event) => setInviteLabel(event.target.value)}
            placeholder="Optional label (e.g. Sharma family) — not the link code"
            className="flex-1 rounded-xl border border-arjuna-primary/20 bg-white px-4 py-2 text-sm text-arjuna-text outline-none focus:border-arjuna-primary"
          />
          <button
            type="button"
            disabled={creatingInvite}
            onClick={() => void handleCreateInvite()}
            className="rounded-xl bg-arjuna-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creatingInvite ? "Creating..." : "Create invite"}
          </button>
        </div>

        {invites.length > 0 && (
          <ul className="mt-4 space-y-3">
            {invites.map((invite) => (
              <li
                key={invite.code}
                className="rounded-xl border border-arjuna-primary/10 bg-arjuna-bg px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-arjuna-text">
                    {invite.label || "Invite"} · {invite.code}
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={whatsappShareUrl(invite.code)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white"
                    >
                      Share on WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyInviteLink(invite.code)}
                      className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-arjuna-primaryDark"
                    >
                      {copiedCode === invite.code ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                </div>
                <p className="mt-2 break-all text-xs text-arjuna-muted">
                  {inviteUrl(invite.code)}
                </p>
                <p className="mt-2 text-xs text-arjuna-muted">
                  {invite.childName
                    ? `Claimed by ${invite.childName}${invite.grade ? ` · ${invite.grade}` : ""}`
                    : "Not claimed yet"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">App health</h2>
        <p className="mt-1 text-sm text-arjuna-muted">
          Checked automatically every day and each time you open this page.
        </p>
        {health === null ? (
          <p className="mt-3 text-sm text-arjuna-muted">Checking…</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.entries(health.checks).map(([name, check]) => (
              <li
                key={name}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  check.status === "fail"
                    ? "bg-red-50 text-red-700"
                    : check.status === "ok"
                      ? "bg-green-50 text-green-800"
                      : "bg-arjuna-bg text-arjuna-muted"
                }`}
                title={check.detail}
              >
                {name}:{" "}
                {check.status === "ok"
                  ? "working"
                  : check.status === "fail"
                    ? `broken — ${check.detail ?? "check logs"}`
                    : "not set up"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">Phase status</h2>
        <p className="mt-2 text-sm text-arjuna-muted">
          Current phase:{" "}
          <span className="font-semibold text-arjuna-text">
            {phase === "v0" ? "V0 locked" : "Alpha unlocked"}
          </span>
        </p>
        {phase === "v0" ? (
          <div className="mt-4 rounded-xl bg-arjuna-primary/10 px-4 py-3 text-sm text-arjuna-text">
            <p className="font-medium">To unlock Alpha:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-arjuna-muted">
              <li>Complete validation steps in the main app.</li>
              <li>
                Set{" "}
                <code className="text-arjuna-primaryDark">
                  NEXT_PUBLIC_ARJUNA_PHASE=alpha
                </code>{" "}
                in <code className="text-arjuna-primaryDark">.env.local</code>
              </li>
              <li>Add Gemini key in app Settings, or set <code className="text-arjuna-primaryDark">GEMINI_API_KEY</code> in env</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Alpha is active. Talk and Photo are unlocked for all invite users.
          </p>
        )}
      </section>

      <section className="mb-6 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">
          Parent feedback (AI analyzed)
        </h2>
        <p className="mt-1 text-sm text-arjuna-muted">
          Session notes from Amma/Nanna in Settings — Gemini digest below.
        </p>
        {feedback.length === 0 ? (
          <p className="mt-3 text-sm text-arjuna-muted">No feedback yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {feedback.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-teal-100 bg-teal-50/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-arjuna-muted">
                  <span className="font-semibold capitalize text-arjuna-text">
                    {row.submitted_by}
                  </span>
                  {row.child_name && <span>· {row.child_name}</span>}
                  <span>· {new Date(row.created_at).toLocaleString()}</span>
                  {row.analysis?.priority && (
                    <span className="rounded-full bg-white px-2 py-0.5 font-semibold uppercase">
                      {row.analysis.priority}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-arjuna-text">
                  {row.analysis?.summary ?? row.raw_text}
                </p>
                {row.analysis?.action_items?.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-arjuna-muted">
                    {row.analysis.action_items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {row.analysis?.tags?.length > 0 && (
                  <p className="mt-2 text-xs text-teal-800">
                    Tags: {row.analysis.tags.join(", ")}
                  </p>
                )}
                <details className="mt-2 text-xs text-arjuna-muted">
                  <summary className="cursor-pointer">Raw note</summary>
                  <p className="mt-1 whitespace-pre-wrap">{row.raw_text}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">
          Session history
        </h2>
        {loading && (
          <p className="mt-3 text-sm text-arjuna-muted">Loading sessions...</p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && sessions.length === 0 && (
          <p className="mt-3 text-sm text-arjuna-muted">
            No sessions saved yet. They appear here after a child taps Done.
          </p>
        )}
        {!loading && sessions.length > 0 && (
          <ul className="mt-4 space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-arjuna-primary/10 bg-arjuna-bg px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-arjuna-text">
                    {session.childName ? `${session.childName} · ` : ""}
                    {new Date(session.date).toLocaleString()}
                  </p>
                  {session.durationMin != null && (
                    <span className="text-xs text-arjuna-muted">
                      {session.durationMin} min
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-arjuna-text">
                  {session.english_summary}
                </p>
                <p className="mt-2 text-xs text-arjuna-muted">
                  WhatsApp: parent 1{" "}
                  {session.whatsappSent.mother ? "sent" : "not sent"} · parent
                  2 {session.whatsappSent.father ? "sent" : "not sent"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/owner/analytics"
            className="rounded-xl bg-arjuna-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Analytics
          </a>
          <a
            href="/roadmap"
            className="rounded-xl border border-arjuna-primary/20 px-4 py-2 text-sm font-medium text-arjuna-text"
          >
            Backlog (after MVP)
          </a>
        </div>
      </section>
    </main>
  );
}
