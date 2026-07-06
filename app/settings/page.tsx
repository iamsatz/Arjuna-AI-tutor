"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  buildSchoolKey,
  loadChildProfile,
  saveChildProfile,
  type ChildProfile,
  type MediumOfInstruction,
} from "@/lib/childProfile";
import { MEDIUM_OPTIONS } from "@/lib/profileOptions";
import type { CurriculumSubject, StoredCurriculum } from "@/lib/curriculumTypes";
import {
  loadSettings,
  saveSettings,
  type DeviceMode,
  type LanguageMode,
} from "@/lib/settings";
import { setDailyRewardTarget } from "@/lib/streak";
import { SettingsGeminiAndFeedback } from "@/components/SettingsGeminiAndFeedback";
import { getGeminiKeyHeader } from "@/lib/apiClient";

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");
  const [curriculum, setCurriculum] = useState<StoredCurriculum | null>(null);
  const [curriculumBusy, setCurriculumBusy] = useState(false);
  const [curriculumMsg, setCurriculumMsg] = useState<string | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pendingPreview, setPendingPreview] = useState<{
    term?: string;
    subjects: CurriculumSubject[];
    rawText?: string;
  } | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef(false);

  useEffect(() => {
    const p = loadChildProfile();
    setProfile(p);
    setSchoolName(p?.schoolName ?? "");
    setMedium(p?.medium ?? "english_medium");
  }, []);

  const schoolKey =
    profile && buildSchoolKey(schoolName, profile.grade, profile.board);

  const loadCurriculum = useCallback(async () => {
    if (!schoolKey) {
      setCurriculum(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/curriculum?schoolKey=${encodeURIComponent(schoolKey)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { curriculum: StoredCurriculum | null };
      setCurriculum(data.curriculum ?? null);
    } catch {
      // ignore
    }
  }, [schoolKey]);

  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  function update(partial: Partial<typeof settings>) {
    const next = saveSettings(partial);
    if (partial.dailyRewardTarget !== undefined) {
      setDailyRewardTarget(partial.dailyRewardTarget);
    }
    setSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function saveSchoolName() {
    if (!profile) return;
    saveChildProfile({ ...profile, schoolName: schoolName.trim() || undefined });
    setProfile(loadChildProfile());
    setCurriculumMsg("School saved.");
    setTimeout(() => setCurriculumMsg(null), 2000);
    void loadCurriculum();
  }

  function saveTeachingProfile() {
    if (!profile) return;
    saveChildProfile({ ...profile, medium });
    setProfile(loadChildProfile());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleCurriculumUpload(files: FileList | null, replace = false) {
    if (!files?.length || !profile) return;
    if (!schoolName.trim() || !profile.grade?.trim()) {
      setCurriculumError("Save school name and set grade on join profile first.");
      return;
    }

    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setIsReplacing(replace);
    setCurriculumBusy(true);
    setCurriculumError(null);
    setCurriculumMsg(null);
    setPendingPreview(null);

    try {
      const form = new FormData();
      form.append("schoolName", schoolName.trim());
      form.append("grade", profile.grade.trim());
      if (profile.board) form.append("board", profile.board);
      form.append("preview", "true");
      for (const file of fileArray) {
        form.append("pages", file);
      }

      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: getGeminiKeyHeader(),
        body: form,
      });
      const data = (await res.json()) as {
        preview?: { term?: string; subjects: CurriculumSubject[]; rawText?: string };
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.preview) {
        setCurriculumError(data.message ?? data.error ?? "Could not read that file");
        return;
      }

      setPendingPreview(data.preview);
    } catch {
      setCurriculumError("Could not upload curriculum.");
    } finally {
      setCurriculumBusy(false);
    }
  }

  async function confirmCurriculumSave() {
    if (!pendingPreview || !profile) return;
    setCurriculumBusy(true);
    setCurriculumError(null);
    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          grade: profile.grade,
          board: profile.board,
          term: pendingPreview.term,
          subjects: pendingPreview.subjects,
          rawText: pendingPreview.rawText,
        }),
      });
      const data = (await res.json()) as {
        curriculum?: StoredCurriculum;
        error?: string;
      };
      if (!res.ok) {
        setCurriculumError(data.error ?? "Could not save");
        return;
      }
      setCurriculum(data.curriculum ?? null);
      setCurriculumMsg(
        isReplacing
          ? "Term plan replaced."
          : "Term plan understood and saved for all kids at this school.",
      );
      setPendingPreview(null);
      setSelectedFiles([]);
      setIsReplacing(false);
    } catch {
      setCurriculumError("Could not save curriculum.");
    } finally {
      setCurriculumBusy(false);
    }
  }

  function discardCurriculumPreview() {
    setPendingPreview(null);
    setSelectedFiles([]);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-arjuna-primaryDark shadow-sm"
      >
        ← Back
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-arjuna-text">
        Settings
      </h1>
      <p className="mt-1 text-sm text-arjuna-muted">
        For parents — AI key, language, TV, and app install
      </p>

      <Link
        href="/download"
        className="mt-4 block rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 text-center text-sm font-semibold text-sky-900 underline"
      >
        Install Arjuna app (Add to Home Screen or APK)
      </Link>

      <section className="mt-6 space-y-4 rounded-2xl bg-white/95 p-5 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium">Language mode</span>
          <select
            value={settings.languageMode}
            onChange={(e) =>
              update({ languageMode: e.target.value as LanguageMode })
            }
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="english">English only</option>
            <option value="pure_telugu">Pure Telugu</option>
            <option value="mixed">Mixed (English + Telugu)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Device mode</span>
          <select
            value={settings.deviceMode}
            onChange={(e) =>
              update({ deviceMode: e.target.value as DeviceMode })
            }
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="phone_only">Phone only</option>
            <option value="phone_tv">Phone upload → TV lesson</option>
            <option value="tv_only">TV only (mic + type)</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Parent PIN (default 1234)</span>
          <input
            type="password"
            value={settings.parentPin}
            onChange={(e) => update({ parentPin: e.target.value })}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>

        {saved && (
          <p className="text-sm text-green-700">Saved. Reload lesson to apply.</p>
        )}
      </section>

      <section className="mt-6 space-y-4 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">Daily habits</h2>
        <p className="text-sm text-arjuna-muted">
          Optional English habits and daily reward target for kids.
        </p>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Daily English words</span>
          <input
            type="checkbox"
            checked={settings.dailyWordsEnabled ?? false}
            onChange={(e) => update({ dailyWordsEnabled: e.target.checked })}
            className="h-5 w-5"
          />
        </label>

        {settings.dailyWordsEnabled && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update({ dailyWordsCount: 5 })}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                (settings.dailyWordsCount ?? 5) === 5
                  ? "bg-emerald-500 text-white"
                  : "border bg-white"
              }`}
            >
              5 words
            </button>
            <button
              type="button"
              onClick={() => update({ dailyWordsCount: 10 })}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                settings.dailyWordsCount === 10
                  ? "bg-emerald-500 text-white"
                  : "border bg-white"
              }`}
            >
              10 words
            </button>
          </div>
        )}

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Journal prompts</span>
          <input
            type="checkbox"
            checked={settings.journalEnabled !== false}
            onChange={(e) => update({ journalEnabled: e.target.checked })}
            className="h-5 w-5"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Daily reward target ({settings.dailyRewardTarget ?? 3} activities)
          </span>
          <input
            type="range"
            min={1}
            max={5}
            value={settings.dailyRewardTarget ?? 3}
            onChange={(e) =>
              update({ dailyRewardTarget: Number(e.target.value) })
            }
            className="mt-2 w-full"
          />
          <p className="mt-1 text-xs text-arjuna-muted">
            Homework, English lesson, words, or journal each count once per day.
          </p>
        </label>
      </section>

      {profile && (
        <section className="mt-6 space-y-4 rounded-2xl bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-arjuna-text">
            Teaching style · {profile.childName}
          </h2>
          <label className="block">
            <span className="text-sm font-medium">Medium of instruction</span>
            <select
              value={medium}
              onChange={(e) =>
                setMedium(e.target.value as MediumOfInstruction)
              }
              className="mt-2 w-full rounded-xl border p-3"
            >
              {MEDIUM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={saveTeachingProfile}
            className="w-full rounded-xl border border-arjuna-primary/30 bg-white py-2.5 text-sm font-semibold"
          >
            Save medium
          </button>
        </section>
      )}

      <SettingsGeminiAndFeedback
        profile={profile}
        onProfileChange={() => setProfile(loadChildProfile())}
      />

      <section className="mt-6 space-y-4 rounded-3xl border-2 border-purple-200 bg-purple-50/50 p-5 shadow-chunky">
        <h2 className="font-display text-lg font-bold text-arjuna-text">
          Diary term plan (optional fallback)
        </h2>
        <p className="text-sm text-arjuna-muted">
          Primary: photo diary term pages during homework. Fallback: upload diary term pages or PDF here if unreadable.
        </p>

        {profile && (
          <p className="text-xs text-arjuna-muted">
            {profile.childName}
            {profile.grade ? ` · ${profile.grade}` : " · grade not set"}
            {profile.board ? ` · ${profile.board}` : ""}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium">School name</span>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Silver Oaks, Delhi Public School…"
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <button
          type="button"
          onClick={saveSchoolName}
          className="w-full rounded-xl border border-arjuna-primary/30 bg-white py-2.5 text-sm font-semibold"
        >
          Save school
        </button>

        <button
          type="button"
          disabled={curriculumBusy || !schoolName.trim() || !profile?.grade}
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl bg-arjuna-primary py-3.5 font-display font-bold text-white shadow-chunky disabled:opacity-50"
        >
          {curriculumBusy
            ? "Reading your syllabus…"
            : "Upload syllabus (PDF or photos)"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleCurriculumUpload(e.target.files, replaceRef.current);
            replaceRef.current = false;
            e.target.value = "";
          }}
        />

        {selectedFiles.length > 0 && !pendingPreview && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-arjuna-muted">
            {curriculumBusy ? "Reading: " : "Selected: "}
            {selectedFiles.map((f) => f.name).join(", ")}
          </div>
        )}

        {curriculumMsg && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {curriculumMsg}
          </p>
        )}
        {curriculumError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {curriculumError}
          </p>
        )}

        {pendingPreview && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Is this what you uploaded?
            </p>
            <p className="mt-1 text-xs text-amber-800">
              From: {selectedFiles.map((f) => f.name).join(", ")}
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-900">
              {pendingPreview.term ?? "Term plan"}
            </p>
            <ul className="mt-2 space-y-2 text-sm text-amber-900">
              {pendingPreview.subjects.map((s) => (
                <li key={s.subject}>
                  <strong>{s.subject}</strong>
                  <span className="text-amber-800">
                    {" "}
                    — {s.topics.slice(0, 4).map((t) => t.name).join(", ")}
                    {s.topics.length > 4 ? "…" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={curriculumBusy}
                onClick={() => void confirmCurriculumSave()}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                ✅ Yes, save this
              </button>
              <button
                type="button"
                disabled={curriculumBusy}
                onClick={discardCurriculumPreview}
                className="flex-1 rounded-xl border border-amber-300 bg-white py-2.5 text-sm font-semibold text-amber-900"
              >
                ✕ Not right, discard
              </button>
            </div>
          </div>
        )}

        {curriculum && (
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
            <p className="text-sm font-semibold text-green-900">
              What Arjuna knows: {curriculum.term ?? "Term plan"}
            </p>
            <ul className="mt-2 space-y-2 text-sm text-green-900">
              {curriculum.subjects.map((s) => (
                <li key={s.subject}>
                  <strong>{s.subject}</strong>
                  <span className="text-green-800">
                    {" "}
                    — {s.topics.slice(0, 4).map((t) => t.name).join(", ")}
                    {s.topics.length > 4 ? "…" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={curriculumBusy || !schoolName.trim() || !profile?.grade}
              onClick={() => {
                replaceRef.current = true;
                fileRef.current?.click();
              }}
              className="mt-3 w-full rounded-xl border border-green-300 bg-white py-2 text-sm font-semibold text-green-900"
            >
              Replace term plan
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
