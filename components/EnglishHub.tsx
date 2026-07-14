"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppTabNav } from "@/components/AppTabNav";
import { TodayRing } from "@/components/TodayRing";
import { Card } from "@/components/ui/Card";
import { EnglishConceptSession } from "@/components/EnglishConceptSession";
import { DailyWordsCard } from "@/components/DailyWordsCard";
import { JournalSection } from "@/components/JournalSection";
import { buildRecommendedConcepts, conceptIdFromQuery } from "@/lib/englishRecommendations";
import {
  curriculumEnglishChips,
  ENGLISH_CATEGORIES,
  type EnglishConcept,
} from "@/lib/englishConceptMap";
import {
  buildSchoolKey,
  type ChildProfile,
} from "@/lib/childProfile";
import type { StoredCurriculum } from "@/lib/curriculumTypes";
import {
  loadTaskHistory,
  profileHistoryKey,
} from "@/lib/taskHistoryStore";
import { loadSettings } from "@/lib/settings";
import { logDevError } from "@/lib/devLog";

type EnglishHubProps = {
  profile: ChildProfile;
};

type Pill = "learn" | "words" | "journal";

export function EnglishHub({ profile }: EnglishHubProps) {
  const [pill, setPill] = useState<Pill>("learn");
  const [openCategory, setOpenCategory] = useState<string | null>("nouns");
  const [activeConcept, setActiveConcept] = useState<EnglishConcept | null>(null);
  const [askQuery, setAskQuery] = useState("");
  const [curriculum, setCurriculum] = useState<StoredCurriculum | null>(null);
  const [ringKey, setRingKey] = useState(0);
  const settings = loadSettings();
  const profileId = profileHistoryKey(profile);
  const schoolKey = buildSchoolKey(
    profile.schoolName,
    profile.grade,
    profile.board,
  );

  const history = loadTaskHistory(profileId);
  const weakTopics = history
    .filter(
      (h) =>
        h.outcomeNote?.toLowerCase().includes("struggled") ||
        h.outcomeNote?.toLowerCase().includes("doubt"),
    )
    .map((h) => `${h.subject}: ${h.task}`);
  const recommended = buildRecommendedConcepts({
    weakTopics,
    taskHistory: history,
    curriculum,
  });
  const curriculumChips = curriculumEnglishChips(curriculum);

  const loadCurriculum = useCallback(async () => {
    if (!schoolKey) return;
    try {
      const res = await fetch(
        `/api/curriculum?schoolKey=${encodeURIComponent(schoolKey)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { curriculum: StoredCurriculum | null };
      setCurriculum(data.curriculum ?? null);
    } catch (err) {
      logDevError("EnglishHub loadCurriculum", err);
    }
  }, [schoolKey]);

  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  function bumpRing() {
    setRingKey((k) => k + 1);
  }

  function handleAsk() {
    const q = askQuery.trim();
    if (!q) return;
    const match = conceptIdFromQuery(q);
    if (match) {
      setActiveConcept(match);
    } else {
      setActiveConcept({
        id: "N1",
        label: q,
        grade: "C",
        focus: "Answer with explain-back; use Indian school terms",
      });
    }
    setAskQuery("");
  }

  const pills: { id: Pill; label: string; emoji: string; hidden?: boolean }[] = [
    { id: "learn", label: "Learn", emoji: "📖" },
    {
      id: "words",
      label: "Words",
      emoji: "🔤",
      hidden: !settings.dailyWordsEnabled,
    },
    {
      id: "journal",
      label: "Journal",
      emoji: "✍️",
      hidden: settings.journalEnabled === false,
    },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-4 pb-28 pt-4">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-base font-bold text-white shadow-chunky">
            {profile.childName.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <span className="font-display text-sm font-bold text-arjuna-text">
            {profile.childName}
          </span>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-muted" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </header>

      <Card className="mb-4">
        <TodayRing refreshKey={ringKey} />
      </Card>

      <AppTabNav active="english" />

      {/* Tab pills */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {pills
          .filter((p) => !p.hidden)
          .map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPill(p.id);
                setActiveConcept(null);
              }}
              className={`shrink-0 rounded-2xl px-4 py-2 font-display text-sm font-bold transition ${
                pill === p.id
                  ? "bg-emerald-600 text-white shadow-chunky"
                  : "bg-white text-arjuna-text"
              }`}
            >
              {p.label}
            </button>
          ))}
      </div>

      {pill === "learn" && !activeConcept && (
        <div className="mt-4 space-y-5">
          {/* Ask bar */}
          <div className="flex items-center gap-2 rounded-3xl border-2 border-orange-100 bg-white px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-arjuna-muted" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder='Ask: "What is a proper noun?"'
              className="flex-1 bg-transparent text-sm text-arjuna-text placeholder:text-arjuna-muted focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAsk();
              }}
            />
            {askQuery.trim() && (
              <button
                type="button"
                onClick={handleAsk}
                className="rounded-xl bg-arjuna-primary px-3 py-1.5 font-display text-xs font-bold text-white active:scale-95"
              >
                Ask
              </button>
            )}
          </div>

          {/* Recommended for you */}
          {recommended.length > 0 && (
            <section>
              <p className="mb-2.5 font-display text-sm font-bold text-arjuna-text">
                Recommended for you
              </p>
              <div className="flex flex-wrap gap-2">
                {recommended.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConcept(c)}
                    className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-3 py-2 text-left transition active:scale-95"
                  >
                    <p className="font-display text-xs font-bold text-arjuna-text">{c.label}</p>
                    {c.reason && (
                      <p className="mt-0.5 text-[10px] text-arjuna-muted">{c.reason}</p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* From your school plan */}
          {curriculumChips.length > 0 && (
            <section>
              <p className="mb-2.5 font-display text-sm font-bold text-arjuna-text">
                From your school plan
              </p>
              <div className="flex flex-wrap gap-2">
                {curriculumChips.slice(0, 8).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() =>
                      setActiveConcept({
                        id: chip.id,
                        label: chip.label,
                        grade: "C",
                        focus: "From school curriculum",
                      })
                    }
                    className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-3 py-1.5 font-display text-xs font-bold text-emerald-900 active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Category topic tiles */}
          {ENGLISH_CATEGORIES.map((cat) => (
            <section key={cat.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenCategory(openCategory === cat.id ? null : cat.id)
                }
                className="mb-2 flex w-full items-center justify-between"
              >
                <p className="font-display text-sm font-bold text-arjuna-text">
                  {cat.label}
                </p>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-arjuna-muted transition-transform duration-200 ${openCategory === cat.id ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {openCategory === cat.id && (
                <div className="grid grid-cols-2 gap-2">
                  {cat.concepts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveConcept(c)}
                      className="flex flex-col items-start gap-1 rounded-3xl border-2 border-orange-100 bg-white px-4 py-3 text-left transition active:scale-95"
                    >
                      <p className="font-display text-sm font-bold text-arjuna-text leading-snug">
                        {c.label}
                      </p>
                      <p className="text-[10px] text-arjuna-muted line-clamp-2">
                        {c.focus}
                      </p>
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 font-display text-[9px] font-bold uppercase ${
                        c.grade === "B" ? "bg-green-100 text-green-800" : c.grade === "E" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                      }`}>
                        {c.grade === "B" ? "Beginner" : c.grade === "E" ? "Expert" : "Class"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {pill === "learn" && activeConcept && (
        <div className="mt-4">
          <EnglishConceptSession
            profile={profile}
            concept={activeConcept}
            onClose={() => setActiveConcept(null)}
            onComplete={bumpRing}
          />
        </div>
      )}

      {pill === "words" && (
        <div className="mt-4">
          <DailyWordsCard
            profile={profile}
            curriculum={curriculum}
            onReward={bumpRing}
          />
        </div>
      )}

      {pill === "journal" && (
        <div className="mt-4">
          <JournalSection profile={profile} onReward={bumpRing} />
        </div>
      )}
    </main>
  );
}
