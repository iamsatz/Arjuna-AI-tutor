"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  buildSchoolKey,
  loadChildProfile,
  saveChildProfile,
  type ChildProfile,
  type MediumOfInstruction,
  type TeachingMethod,
} from "@/lib/childProfile";
import { MEDIUM_OPTIONS, METHOD_OPTIONS } from "@/lib/profileOptions";
import type { StoredCurriculum } from "@/lib/curriculumTypes";
import {
  loadSettings,
  saveSettings,
  type DeviceMode,
  type LanguageMode,
} from "@/lib/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [medium, setMedium] = useState<MediumOfInstruction>("english_medium");
  const [method, setMethod] = useState<TeachingMethod>("experiential");
  const [curriculum, setCurriculum] = useState<StoredCurriculum | null>(null);
  const [curriculumBusy, setCurriculumBusy] = useState(false);
  const [curriculumMsg, setCurriculumMsg] = useState<string | null>(null);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = loadChildProfile();
    setProfile(p);
    setSchoolName(p?.schoolName ?? "");
    setMedium(p?.medium ?? "english_medium");
    setMethod(p?.method ?? "experiential");
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
    saveChildProfile({ ...profile, medium, method });
    setProfile(loadChildProfile());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleCurriculumUpload(files: FileList | null) {
    if (!files?.length || !profile) return;
    if (!schoolName.trim() || !profile.grade?.trim()) {
      setCurriculumError("Save school name and set grade on join profile first.");
      return;
    }

    setCurriculumBusy(true);
    setCurriculumError(null);
    setCurriculumMsg(null);

    try {
      const form = new FormData();
      form.append("schoolName", schoolName.trim());
      form.append("grade", profile.grade.trim());
      if (profile.board) form.append("board", profile.board);
      for (const file of Array.from(files)) {
        form.append("pages", file);
      }

      const res = await fetch("/api/curriculum", { method: "POST", body: form });
      const data = (await res.json()) as {
        curriculum?: StoredCurriculum;
        reused?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setCurriculumError(data.message ?? data.error ?? "Upload failed");
        return;
      }

      setCurriculum(data.curriculum ?? null);
      setCurriculumMsg(
        data.reused
          ? "Reused existing plan for this school + grade (no AI needed)."
          : "Term plan understood and saved for all kids at this school.",
      );
    } catch {
      setCurriculumError("Could not upload curriculum.");
    } finally {
      setCurriculumBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-6 py-10">
      <Link href="/" className="text-sm text-arjuna-primaryDark underline">
        ← Homework
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-arjuna-text">Settings</h1>
      <p className="mt-1 text-sm text-arjuna-muted">Parent area</p>

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
          <label className="block">
            <span className="text-sm font-medium">How their school teaches</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as TeachingMethod)}
              className="mt-2 w-full rounded-xl border p-3"
            >
              {METHOD_OPTIONS.map((opt) => (
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
            Save teaching style
          </button>
        </section>
      )}

      <section className="mt-6 space-y-4 rounded-2xl bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-arjuna-text">School &amp; curriculum</h2>
        <p className="text-sm text-arjuna-muted">
          Upload the term plan once. All kids at the same school + grade share this memory.
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
          className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white disabled:opacity-50"
        >
          {curriculumBusy ? "Understanding plan…" : "Upload term plan (PDF or photos)"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleCurriculumUpload(e.target.files);
            e.target.value = "";
          }}
        />

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

        {curriculum && (
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Loaded: {curriculum.term ?? "Term plan"}
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
          </div>
        )}
      </section>

      <Link
        href="/roadmap"
        className="mt-6 block text-center text-sm text-arjuna-muted underline"
      >
        See roadmap & backlog (after MVP)
      </Link>
    </main>
  );
}
