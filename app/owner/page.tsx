"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppPhase } from "@/lib/phase";
import type { StoredSession } from "@/lib/sessionsStore";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const phase = getAppPhase();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const response = await fetch("/api/owner/sessions");
        if (!response.ok) {
          throw new Error("Could not load sessions");
        }
        const data = (await response.json()) as { sessions: StoredSession[] };
        setSessions(data.sessions ?? []);
      } catch {
        setError("Could not load session history.");
      } finally {
        setLoading(false);
      }
    }

    void loadSessions();
  }, []);

  async function handleLogout() {
    await fetch("/api/owner/logout", { method: "POST" });
    router.push("/owner/login");
    router.refresh();
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
              <li>Complete the V0 gate checklist on the main app.</li>
              <li>
                Set{" "}
                <code className="text-arjuna-primaryDark">
                  NEXT_PUBLIC_ARJUNA_PHASE=alpha
                </code>{" "}
                in <code className="text-arjuna-primaryDark">.env.local</code>
              </li>
              <li>Add <code className="text-arjuna-primaryDark">GEMINI_API_KEY</code></li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Alpha is active. Talk and Photo are unlocked for Aadya.
          </p>
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
            No sessions saved yet. They appear here after Aadya taps Done.
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
                  WhatsApp: mother{" "}
                  {session.whatsappSent.mother ? "sent" : "not sent"} · father{" "}
                  {session.whatsappSent.father ? "sent" : "not sent"}
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
            href="/"
            className="rounded-xl bg-arjuna-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Open Arjuna app
          </a>
          <a
            href="/owner/login"
            className="rounded-xl border border-arjuna-primary/20 px-4 py-2 text-sm font-medium text-arjuna-text"
          >
            Login link
          </a>
        </div>
      </section>
    </main>
  );
}
