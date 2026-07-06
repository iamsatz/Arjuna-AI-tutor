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
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/settings"
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm"
        >
          ⚙️
        </Link>
        <p className="font-display text-lg font-bold text-arjuna-text">
          English · {profile.childName}
        </p>
        <div className="w-10" />
      </div>

      <Card className="mb-4">
        <TodayRing refreshKey={ringKey} />
      </Card>

      <AppTabNav active="english" />

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
              className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-bold ${
                pill === p.id
                  ? "bg-emerald-500 text-white shadow-chunky"
                  : "bg-white text-arjuna-text"
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
      </div>

      {pill === "learn" && !activeConcept && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <input
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder='Ask: "What is a proper noun?"'
              className="flex-1 rounded-xl border p-3 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
            />
            <button
              type="button"
              onClick={handleAsk}
              className="rounded-xl bg-arjuna-primary px-4 py-2 text-sm font-bold text-white"
            >
              Go
            </button>
          </div>

          {recommended.length > 0 && (
            <section>
              <p className="mb-2 text-sm font-bold text-arjuna-text">
                Recommended for you
              </p>
              <div className="flex flex-wrap gap-2">
                {recommended.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConcept(c)}
                    className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-left text-xs font-semibold text-orange-900"
                  >
                    {c.label}
                    <span className="mt-0.5 block font-normal text-orange-700">
                      {c.reason}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {curriculumChips.length > 0 && (
            <section>
              <p className="mb-2 text-sm font-bold text-arjuna-text">
                From your school plan
              </p>
              <div className="flex flex-wrap gap-2">
                {curriculumChips.slice(0, 8).map((chip) => (
                  <span
                    key={chip.id}
                    className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-900"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {ENGLISH_CATEGORIES.map((cat) => (
            <section key={cat.id} className="rounded-2xl border bg-white">
              <button
                type="button"
                onClick={() =>
                  setOpenCategory(openCategory === cat.id ? null : cat.id)
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-display font-bold text-arjuna-text">
                  {cat.emoji} {cat.label}
                </span>
                <span className="text-arjuna-muted">
                  {openCategory === cat.id ? "▲" : "▼"}
                </span>
              </button>
              {openCategory === cat.id && (
                <ul className="border-t px-2 pb-2">
                  {cat.concepts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveConcept(c)}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-emerald-50"
                      >
                        <span className="font-semibold text-arjuna-text">
                          {c.label}
                        </span>
                        <span className="ml-2 text-[10px] text-arjuna-muted">
                          {c.grade}
                        </span>
                        <p className="text-xs text-arjuna-muted">{c.focus}</p>
                      </button>
                    </li>
                  ))}
                </ul>
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
