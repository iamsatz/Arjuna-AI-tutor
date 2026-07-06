"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { arjunaFetch } from "@/lib/apiClient";
import { playSpeech } from "@/lib/clientSpeech";
import { stripSpeechMarkers } from "@/lib/bridgeSubject";
import {
  appendJournal,
  hasJournalToday,
  journalPromptForDay,
  loadJournal,
  type JournalEntry,
} from "@/lib/englishJournalStore";
import { profileHistoryKey } from "@/lib/taskHistoryStore";
import type { ChildProfile } from "@/lib/childProfile";
import { loadSettings } from "@/lib/settings";
import { recordDailyActivity } from "@/lib/streak";

type JournalSectionProps = {
  profile: ChildProfile;
  onReward?: () => void;
};

export function JournalSection({ profile, onReward }: JournalSectionProps) {
  const settings = loadSettings();
  const profileId = profileHistoryKey(profile);
  const prompt = journalPromptForDay();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    loadJournal(profileId),
  );
  const [submittedToday, setSubmittedToday] = useState(() =>
    hasJournalToday(profileId),
  );

  if (!settings.journalEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
        <p className="text-sm text-arjuna-muted">
          Journal is off. Parent can turn it on in Settings.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    const kidText = text.trim();
    if (!kidText || busy) return;
    setBusy(true);
    try {
      const res = await arjunaFetch("/api/english/journal", {
        method: "POST",
        json: {
          childName: profile.childName,
          languageMode: settings.languageMode,
          prompt,
          kidText,
        },
      });
      const data = (await res.json()) as { reply?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed");
      const arjunaReply = data.reply ?? "Thank you for sharing!";
      setReply(arjunaReply);
      appendJournal(profileId, { prompt, kidText, arjunaReply });
      setEntries(loadJournal(profileId));
      setText("");
      setSubmittedToday(true);
      recordDailyActivity("journal");
      onReward?.();
      try {
        await playSpeech(arjunaReply, { languageMode: settings.languageMode });
      } catch {
        // ignore
      }
    } catch {
      setReply("Arjuna could not reply right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <p className="text-xs font-semibold uppercase text-purple-700">
          Today&apos;s prompt
        </p>
        <p className="mt-1 font-display text-lg font-bold text-purple-900">
          {prompt}
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Write your ideas here…"
        className="w-full rounded-2xl border p-3 text-sm"
      />

      <Button
        className="w-full"
        disabled={busy || !text.trim()}
        onClick={() => void handleSubmit()}
      >
        {busy ? "Arjuna is listening…" : "Share with Arjuna"}
      </Button>

      {reply && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-800">Arjuna says</p>
          <p className="mt-1 text-sm text-emerald-900">
            {stripSpeechMarkers(reply)}
          </p>
          {submittedToday && (
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              +1 toward today! 🏹
            </p>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-arjuna-muted">
            Recent entries
          </p>
          <ul className="space-y-2">
            {entries.slice(0, 5).map((e) => (
              <li
                key={e.id}
                className="rounded-xl border bg-white p-3 text-xs text-arjuna-muted"
              >
                <p className="font-semibold text-arjuna-text">{e.prompt}</p>
                <p className="mt-1 line-clamp-2">{e.kidText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
