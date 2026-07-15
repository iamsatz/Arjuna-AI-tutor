"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAppPhase } from "@/lib/phase";

type EventRow = {
  id: string;
  created_at: string;
  event_type: string;
  device: string | null;
  device_mode: string | null;
  child_name: string | null;
  invite_code: string | null;
  payload: Record<string, unknown>;
};

export default function OwnerAnalyticsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as { events: EventRow[] };
        setEvents(data.events ?? []);
      } catch {
        setError("Could not load analytics. Check Supabase tables exist.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const opens = events.filter((e) => e.event_type === "app_open").length;
  const sessions = events.filter((e) => e.event_type === "session_start").length;
  const unlocks = events.filter((e) => e.event_type === "parent_unlock").length;
  const doubts = events.filter((e) => e.event_type === "doubt_submitted").length;
  const examsCreated = events.filter((e) => e.event_type === "exam_created").length;
  const examUploads = events.filter(
    (e) => e.event_type === "exam_material_uploaded",
  ).length;
  const examRevisions = events.filter(
    (e) => e.event_type === "exam_revision_started",
  ).length;
  const examQuizzes = events.filter((e) => e.event_type === "exam_quiz_started").length;

  const sessionEnds = events.filter((e) => e.event_type === "session_end");
  const avgDuration =
    sessionEnds.length > 0
      ? Math.round(
          sessionEnds.reduce(
            (sum, e) => sum + Number(e.payload?.durationMin ?? 0),
            0,
          ) / sessionEnds.length,
        )
      : 0;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-white px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-arjuna-muted">
            Owner · Analytics
          </p>
          <h1 className="text-2xl font-semibold text-arjuna-text">Research</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetch("/api/owner/logout", { method: "POST" });
            router.push("/owner/login");
          }}
          className="rounded-xl border px-4 py-2 text-sm"
        >
          Log out
        </button>
      </div>

      <p className="mb-4 text-sm text-arjuna-muted">
        Phase: {getAppPhase()} · Raw events also in Supabase →{" "}
        <code>arjuna_events</code>
      </p>

      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "App opens", value: opens },
              { label: "Sessions", value: sessions },
              { label: "Doubts", value: doubts },
              { label: "Parent unlocks", value: unlocks },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/95 p-4 shadow-sm"
              >
                <p className="text-2xl font-bold text-arjuna-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-arjuna-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Exams created", value: examsCreated },
              { label: "Page uploads", value: examUploads },
              { label: "Exam revisions", value: examRevisions },
              { label: "Practice tests", value: examQuizzes },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/95 p-4 shadow-sm"
              >
                <p className="text-2xl font-bold text-arjuna-primary">
                  {stat.value}
                </p>
                <p className="text-xs text-arjuna-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-arjuna-muted">
            Avg session length: {avgDuration} min
          </p>

          <section className="mt-6 rounded-2xl bg-white/95 p-5 shadow-sm">
            <h2 className="font-semibold">Recent events</h2>
            <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
              {events.slice(0, 50).map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-arjuna-primary/10 px-3 py-2"
                >
                  <span className="font-medium">{e.event_type}</span>
                  {e.child_name && ` · ${e.child_name}`}
                  <span className="block text-xs text-arjuna-muted">
                    {new Date(e.created_at).toLocaleString()} · {e.device}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <Link href="/owner" className="mt-6 block text-sm underline">
        ← Owner dashboard
      </Link>
    </main>
  );
}
