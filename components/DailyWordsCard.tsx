"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { arjunaFetch } from "@/lib/apiClient";
import { playSpeech } from "@/lib/clientSpeech";
import {
  collectHomeworkText,
  isDailyWordsComplete,
  loadDailyWords,
  markWordKnown,
  saveDailyWords,
  type DailyWordsPack,
} from "@/lib/englishDailyWordsStore";
import type { ChildProfile } from "@/lib/childProfile";
import { loadSettings } from "@/lib/settings";
import { recordDailyActivity } from "@/lib/streak";
import {
  loadTaskHistory,
  profileHistoryKey,
} from "@/lib/taskHistoryStore";
import type { StoredCurriculum } from "@/lib/curriculumTypes";

type DailyWordsCardProps = {
  profile: ChildProfile;
  curriculum: StoredCurriculum | null;
  onReward?: () => void;
};

export function DailyWordsCard({
  profile,
  curriculum,
  onReward,
}: DailyWordsCardProps) {
  const settings = loadSettings();
  const profileId = profileHistoryKey(profile);
  const [pack, setPack] = useState<DailyWordsPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = settings.dailyWordsCount === 10 ? 10 : 5;

  const loadOrGenerate = useCallback(async () => {
    const existing = loadDailyWords(profileId);
    if (existing) {
      setPack(existing);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const history = loadTaskHistory(profileId);
      const homeworkText = collectHomeworkText(history);
      const englishSubject = curriculum?.subjects.find(
        (s) => s.subject.trim().toLowerCase() === "english",
      );
      const curriculumTopics = englishSubject?.topics.map((t) => t.name) ?? [];

      const res = await arjunaFetch("/api/english/daily-words", {
        method: "POST",
        json: {
          count,
          grade: profile.grade,
          medium: profile.medium,
          languageMode: settings.languageMode,
          homeworkText,
          curriculumTopics,
        },
      });
      const data = (await res.json()) as {
        words?: DailyWordsPack["words"];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Could not load words");

      const today = new Date().toISOString().slice(0, 10);
      const next: DailyWordsPack = {
        date: today,
        words: data.words ?? [],
        known: [],
      };
      saveDailyWords(profileId, next);
      setPack(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load words");
    } finally {
      setLoading(false);
    }
  }, [
    count,
    curriculum,
    profile.grade,
    profile.medium,
    profileId,
    settings.languageMode,
  ]);

  useEffect(() => {
    if (settings.dailyWordsEnabled) void loadOrGenerate();
  }, [settings.dailyWordsEnabled, loadOrGenerate]);

  if (!settings.dailyWordsEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
        <p className="text-sm text-arjuna-muted">
          Daily words are off. Parent can turn them on in Settings.
        </p>
      </div>
    );
  }

  async function speakWord(word: string) {
    try {
      await playSpeech(word, { languageMode: settings.languageMode });
    } catch {
      // ignore
    }
  }

  function handleKnown(word: string) {
    const updated = markWordKnown(profileId, word);
    setPack(updated);
    if (updated && isDailyWordsComplete(updated)) {
      recordDailyActivity("words");
      onReward?.();
    }
  }

  function handleDoneAll() {
    if (!pack) return;
    for (const w of pack.words) {
      markWordKnown(profileId, w.word);
    }
    const updated = loadDailyWords(profileId);
    setPack(updated);
    recordDailyActivity("words");
    onReward?.();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-arjuna-text">
          Today&apos;s {count} words
        </h2>
        <button
          type="button"
          onClick={() => void loadOrGenerate()}
          disabled={loading}
          className="text-xs font-semibold text-arjuna-primary"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-sm text-arjuna-muted">Arjuna is picking words for you…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {pack?.words.map((w, i) => {
        const known = pack.known.some(
          (k) => k.toLowerCase() === w.word.toLowerCase(),
        );
        return (
          <div
            key={`${w.word}-${i}`}
            className={`rounded-2xl border p-4 ${known ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold text-arjuna-text">
                  {i + 1}. {w.word}
                </p>
                {w.ipa && (
                  <p className="text-xs text-arjuna-muted">{w.ipa}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void speakWord(w.word)}
                className="rounded-full bg-orange-100 px-2 py-1 text-sm"
              >
                🔊
              </button>
            </div>
            <p className="mt-2 text-sm text-arjuna-text">{w.meaning}</p>
            {w.meaningTelugu && (
              <p className="text-sm text-arjuna-muted">{w.meaningTelugu}</p>
            )}
            <p className="mt-1 text-xs italic text-arjuna-muted">
              e.g. {w.example}
            </p>
            {w.source && (
              <p className="mt-1 text-[10px] text-arjuna-muted">From: {w.source}</p>
            )}
            {!known && (
              <button
                type="button"
                onClick={() => handleKnown(w.word)}
                className="mt-3 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800"
              >
                I know this ✓
              </button>
            )}
          </div>
        );
      })}

      {pack && pack.words.length > 0 && !isDailyWordsComplete(pack) && (
        <Button variant="success" className="w-full" onClick={handleDoneAll}>
          Done for today → +1 reward
        </Button>
      )}

      {pack && isDailyWordsComplete(pack) && (
        <p className="rounded-xl bg-green-100 px-3 py-2 text-center text-sm font-semibold text-green-800">
          All words done today! 🏹
        </p>
      )}
    </div>
  );
}
