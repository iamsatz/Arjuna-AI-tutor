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
import { logDevError } from "@/lib/devLog";

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
      } catch (err) {
        logDevError("JournalSection speak", err);
      }
    } catch (err) {
      logDevError("JournalSection handleSubmit", err);
      setReply("Arjuna could not reply right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Prompt */}
      <div className="rounded-2xl border border-arjuna-border bg-arjuna-surface p-4 shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-arjuna-muted">
          Today&apos;s prompt
        </p>
        <p className="mt-1 text-base font-semibold text-arjuna-text">{prompt}</p>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-arjuna-border bg-arjuna-surface p-1.5 shadow-card focus-within:border-arjuna-primary focus-within:ring-2 focus-within:ring-arjuna-primary/20 transition-all">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Write your ideas here…"
          className="w-full resize-none bg-transparent px-2.5 py-2 text-sm text-arjuna-text placeholder-arjuna-muted/60 focus:outline-none leading-relaxed"
        />
        <div className="flex justify-end px-1 pb-1">
          <Button
            size="sm"
            disabled={busy || !text.trim()}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Listening…" : "Share with Arjuna"}
          </Button>
        </div>
      </div>

      {reply && (
        <div className="rounded-2xl border border-arjuna-teal/30 bg-teal-50 p-4">
          <p className="text-xs font-semibold text-arjuna-teal">Arjuna says</p>
          <p className="mt-1 text-sm leading-relaxed text-teal-900">
            {stripSpeechMarkers(reply)}
          </p>
          {submittedToday && (
            <p className="mt-2 text-xs font-semibold text-arjuna-teal">
              +1 toward today&apos;s goal
            </p>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-arjuna-muted">
            Recent entries
          </p>
          <ul className="space-y-1.5">
            {entries.slice(0, 5).map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-arjuna-border bg-arjuna-surface p-3"
              >
                <p className="text-xs font-semibold text-arjuna-text">{e.prompt}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-arjuna-muted">{e.kidText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
