"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppPhase } from "@/lib/phase";
import type { StoredInvite } from "@/lib/invitesStore";
import type { StoredSession } from "@/lib/sessionsStore";

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

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionsRes, invitesRes] = await Promise.all([
          fetch("/api/owner/sessions"),
          fetch("/api/owner/invites"),
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

        setSessions(sessionsData.sessions ?? []);
        setInvites(invitesData.invites ?? []);
      } catch {
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
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
        throw new Error("Create failed");
      }

      const data = (await response.json()) as { invite: StoredInvite };
      setInvites((current) => [data.invite, ...current]);
      setInviteLabel("");
    } catch {
      setError("Could not create invite link.");
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
            placeholder="Optional label (e.g. Sharma family)"
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
                  <button
                    type="button"
                    onClick={() => void copyInviteLink(invite.code)}
                    className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-arjuna-primaryDark"
                  >
                    {copiedCode === invite.code ? "Copied!" : "Copy link"}
                  </button>
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
              <li>Add <code className="text-arjuna-primaryDark">GEMINI_API_KEY</code></li>
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
