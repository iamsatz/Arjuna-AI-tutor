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
import { logDevError } from "@/lib/devLog";

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
    } catch (err) {
      logDevError("Settings loadCurriculum", err);
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
    } catch (err) {
      logDevError("handleCurriculumUpload", err);
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
    } catch (err) {
      logDevError("confirmCurriculumSave", err);
      setCurriculumError("Could not save curriculum.");
    } finally {
      setCurriculumBusy(false);
    }
  }

  function discardCurriculumPreview() {
    setPendingPreview(null);
    setSelectedFiles([]);
  }

  const sectionCls = "mt-4 rounded-2xl border border-arjuna-border bg-arjuna-surface p-5 shadow-card space-y-4";
  const labelCls = "block text-sm font-semibold text-arjuna-text mb-1.5";
  const inputCls = "input-base";

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-4 py-6 pb-16">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-arjuna-border bg-arjuna-surface text-arjuna-muted shadow-card hover:bg-arjuna-bg transition-colors"
          aria-label="Back"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-arjuna-text">Settings</h1>
          <p className="text-xs text-arjuna-muted">AI key, language, TV, and habits</p>
        </div>
      </div>

      {/* Install shortcut */}
      <Link
        href="/download"
        className="flex items-center gap-3 rounded-2xl border border-arjuna-sky/30 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-100 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-sky-600">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        Install Arjuna (Add to Home Screen or APK)
      </Link>

      {/* General */}
      <section className={sectionCls}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-arjuna-muted">General</h2>
        <div>
          <label className={labelCls}>Language mode</label>
          <select
            value={settings.languageMode}
            onChange={(e) => update({ languageMode: e.target.value as LanguageMode })}
            className={inputCls}
          >
            <option value="english">English only</option>
            <option value="pure_telugu">Pure Telugu</option>
            <option value="mixed">Mixed (English + Telugu)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Device mode</label>
          <select
            value={settings.deviceMode}
            onChange={(e) => update({ deviceMode: e.target.value as DeviceMode })}
            className={inputCls}
          >
            <option value="phone_only">Phone only</option>
            <option value="phone_tv">Phone upload → TV lesson</option>
            <option value="tv_only">TV only (mic + type)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Parent PIN</label>
          <input
            type="password"
            value={settings.parentPin}
            onChange={(e) => update({ parentPin: e.target.value })}
            className={inputCls}
            placeholder="default: 1234"
          />
        </div>

        {saved && (
          <p className="flex items-center gap-1.5 text-sm text-arjuna-green">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Saved
          </p>
        )}
      </section>

      {/* Daily habits */}
      <section className={sectionCls}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-arjuna-muted">Daily habits</h2>
        <p className="text-sm text-arjuna-muted">Optional English practice and daily goal for kids.</p>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-arjuna-text">Daily English words</span>
          <input
            type="checkbox"
            checked={settings.dailyWordsEnabled ?? false}
            onChange={(e) => update({ dailyWordsEnabled: e.target.checked })}
            className="h-5 w-5 accent-arjuna-primary"
          />
        </label>

        {settings.dailyWordsEnabled && (
          <div className="flex gap-2">
            {[5, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ dailyWordsCount: n })}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                  (settings.dailyWordsCount ?? 5) === n
                    ? "bg-arjuna-teal text-white"
                    : "border border-arjuna-border bg-arjuna-surface text-arjuna-text"
                }`}
              >
                {n} words
              </button>
            ))}
          </div>
        )}

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-arjuna-text">Journal prompts</span>
          <input
            type="checkbox"
            checked={settings.journalEnabled !== false}
            onChange={(e) => update({ journalEnabled: e.target.checked })}
            className="h-5 w-5 accent-arjuna-primary"
          />
        </label>

        <div>
          <label className={labelCls}>
            Daily goal — {settings.dailyRewardTarget ?? 3} activities
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={settings.dailyRewardTarget ?? 3}
            onChange={(e) => update({ dailyRewardTarget: Number(e.target.value) })}
            className="mt-2 w-full accent-arjuna-primary"
          />
          <p className="mt-1 text-xs text-arjuna-muted">
            Homework, English lesson, words, or journal each count once per day.
          </p>
        </div>
      </section>

      {/* Teaching style */}
      {profile && (
        <section className={sectionCls}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-arjuna-muted">
            Teaching style · {profile.childName}
          </h2>
          <div>
            <label className={labelCls}>Medium of instruction</label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value as MediumOfInstruction)}
              className={inputCls}
            >
              {MEDIUM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={saveTeachingProfile}
            className="w-full rounded-xl border border-arjuna-border bg-arjuna-surface py-2.5 text-sm font-semibold text-arjuna-text hover:bg-arjuna-bg transition-colors"
          >
            Save medium
          </button>
        </section>
      )}

      <SettingsGeminiAndFeedback
        profile={profile}
        onProfileChange={() => setProfile(loadChildProfile())}
      />

      {/* Syllabus */}
      <section className={sectionCls}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-arjuna-muted">Syllabus</h2>
        <p className="text-sm text-arjuna-muted">
          Upload your school term plan once. Arjuna will teach in your school&apos;s style — no extra setup each day.
        </p>

        {profile && (
          <p className="text-xs text-arjuna-muted">
            {profile.childName}
            {profile.grade ? ` · ${profile.grade}` : " · grade not set"}
            {profile.board ? ` · ${profile.board}` : ""}
          </p>
        )}

        <div>
          <label className={labelCls}>School name</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Silver Oaks, Delhi Public School…"
            className={inputCls}
          />
        </div>
        <button
          type="button"
          onClick={saveSchoolName}
          className="w-full rounded-xl border border-arjuna-border bg-arjuna-surface py-2.5 text-sm font-semibold text-arjuna-text hover:bg-arjuna-bg transition-colors"
        >
          Save school
        </button>

        <button
          type="button"
          disabled={curriculumBusy || !schoolName.trim() || !profile?.grade}
          onClick={() => fileRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-arjuna-primary px-4 py-3 text-sm font-semibold text-white shadow-card transition-all hover:bg-arjuna-primaryDark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {curriculumBusy ? "Reading your syllabus…" : "Upload syllabus (PDF or photos)"}
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
          <p className="text-xs text-arjuna-muted">
            {curriculumBusy ? "Reading: " : "Selected: "}
            {selectedFiles.map((f) => f.name).join(", ")}
          </p>
        )}

        {curriculumMsg && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
            {curriculumMsg}
          </p>
        )}
        {curriculumError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {curriculumError}
          </p>
        )}

        {pendingPreview && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Is this what you uploaded?</p>
            <p className="mt-0.5 text-xs text-amber-700">
              From: {selectedFiles.map((f) => f.name).join(", ")}
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-900">
              {pendingPreview.term ?? "Term plan"}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
              {pendingPreview.subjects.map((s) => (
                <li key={s.subject}>
                  <strong className="text-amber-900">{s.subject}</strong>
                  {" — "}
                  {s.topics.slice(0, 4).map((t) => t.name).join(", ")}
                  {s.topics.length > 4 ? "…" : ""}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={curriculumBusy}
                onClick={() => void confirmCurriculumSave()}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700 transition-colors"
              >
                Yes, save this
              </button>
              <button
                type="button"
                disabled={curriculumBusy}
                onClick={discardCurriculumPreview}
                className="flex-1 rounded-xl border border-amber-200 bg-arjuna-surface py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {curriculum && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Saved: {curriculum.term ?? "Term plan"}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-green-800">
              {curriculum.subjects.map((s) => (
                <li key={s.subject}>
                  <strong className="text-green-900">{s.subject}</strong>
                  {" — "}
                  {s.topics.slice(0, 4).map((t) => t.name).join(", ")}
                  {s.topics.length > 4 ? "…" : ""}
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
              className="mt-3 w-full rounded-xl border border-green-300 bg-arjuna-surface py-2 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              Replace term plan
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
