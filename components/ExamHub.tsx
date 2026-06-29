"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArjunaAvatar } from "./ArjunaAvatar";
import {
  buildSchoolKey,
  buildStudentKey,
  type ChildProfile,
} from "@/lib/childProfile";
import type { StoredExam } from "@/lib/examTypes";
import { topicsToConceptNotes, type StoredCurriculum } from "@/lib/curriculumTypes";
import { loadSettings, verifyParentPin } from "@/lib/settings";
import { track } from "@/lib/analytics";
import { playSpeech } from "@/lib/clientSpeech";
import { stripSpeechMarkers } from "@/lib/bridgeSubject";
import type { ChatMessage } from "@/lib/types";
import type { ExamQuizQuestion } from "@/lib/examTypes";

type ExamHubProps = {
  profile: ChildProfile;
};

type PrepMode = "list" | "create" | "curriculum" | "upload" | "revise" | "quiz";

export function ExamHub({ profile }: ExamHubProps) {
  const searchParams = useSearchParams();
  const settings = loadSettings();
  const schoolKey = buildSchoolKey(profile.schoolName, profile.grade, profile.board);
  const studentKey = profile.id
    ? buildStudentKey(profile.inviteCode, profile.id)
    : undefined;
  const [exams, setExams] = useState<StoredExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<PrepMode>("list");
  const [selectedExam, setSelectedExam] = useState<StoredExam | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState("English");
  const [examDate, setExamDate] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const pageRef = useRef<HTMLInputElement>(null);
  const timetableRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastReply, setLastReply] = useState("");
  const [avatarState, setAvatarState] = useState<"idle" | "loading" | "speaking">("idle");

  const [questions, setQuestions] = useState<
    Omit<ExamQuizQuestion, "correctIndex">[]
  >([]);
  const [fullQuestions, setFullQuestions] = useState<ExamQuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [pinInput, setPinInput] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  const [curriculum, setCurriculum] = useState<StoredCurriculum | null>(null);
  const [curriculumSubject, setCurriculumSubject] = useState("");
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  const prefilledRef = useRef(false);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/exam?inviteCode=${encodeURIComponent(profile.inviteCode)}&childName=${encodeURIComponent(profile.childName)}`,
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { exams: StoredExam[] };
      setExams(data.exams ?? []);
    } catch {
      setError("Could not load exams. Run Supabase migration for arjuna_exams.");
    } finally {
      setLoading(false);
    }
  }, [profile.inviteCode]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const loadCurriculum = useCallback(async () => {
    if (!schoolKey) return;
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

  useEffect(() => {
    if (prefilledRef.current) return;
    const subjectParam = searchParams.get("subject");
    const topicParam = searchParams.get("topic");
    if (!subjectParam) return;
    prefilledRef.current = true;
    setSubject(subjectParam);
    if (topicParam) {
      setTopicsText(topicParam);
      setSelectedTopicNames([topicParam]);
    }
    setCurriculumSubject(subjectParam);
    if (curriculum) {
      setMode("curriculum");
    } else {
      setMode("create");
    }
  }, [searchParams, curriculum]);

  async function speak(text: string) {
    setLastReply(stripSpeechMarkers(text));
    setAvatarState("loading");
    try {
      setAvatarState("speaking");
      await playSpeech(text, {
        speaker: "shubh",
        languageMode: settings.languageMode,
      });
    } catch {
      // ignore
    } finally {
      setAvatarState("idle");
    }
  }

  async function handleCreateFromCurriculum() {
    if (!curriculum || !curriculumSubject) return;
    const subj = curriculum.subjects.find(
      (s) => s.subject.toLowerCase() === curriculumSubject.toLowerCase(),
    );
    if (!subj) {
      setError("Subject not found in curriculum.");
      return;
    }

    const pickedTopics = subj.topics.filter((t) =>
      selectedTopicNames.includes(t.name),
    );
    const topics =
      pickedTopics.length > 0 ? pickedTopics : subj.topics.slice(0, 5);
    const topicNames = topics.map((t) => t.name);
    const conceptNotes = topicsToConceptNotes(subj.subject, topics);

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: profile.inviteCode,
          childName: profile.childName,
          subject: subj.subject,
          board: profile.board,
          grade: profile.grade,
          examDate: examDate || undefined,
          topics: topicNames,
          conceptNotes,
          status: "ready",
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { exam: StoredExam };
      void track("exam_created", {
        subject: subj.subject,
        examId: data.exam.id,
        source: "curriculum",
      });
      setSelectedExam(data.exam);
      await loadExams();
      void startRevision(data.exam);
    } catch {
      setError("Could not start from curriculum.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateExam() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: profile.inviteCode,
          childName: profile.childName,
          subject,
          board: profile.board,
          grade: profile.grade,
          examDate: examDate || undefined,
          topics: topicsText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { exam: StoredExam };
      void track("exam_created", { subject, examId: data.exam.id });
      setSelectedExam(data.exam);
      setMode("upload");
      await loadExams();
    } catch {
      setError("Could not create exam.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTimetableUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("inviteCode", profile.inviteCode);
      form.append("childName", profile.childName);
      if (profile.board) form.append("board", profile.board);
      if (profile.grade) form.append("grade", profile.grade);

      const res = await fetch("/api/exam/timetable", { method: "POST", body: form });
      if (!res.ok) throw new Error("timetable failed");
      const data = (await res.json()) as { exams: StoredExam[] };
      for (const exam of data.exams) {
        void track("exam_created", { subject: exam.subject, examId: exam.id, source: "timetable" });
      }
      await loadExams();
      setMode("list");
    } catch {
      setError("Could not read timetable. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadPages() {
    if (!selectedExam || !pageFiles.length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("examId", selectedExam.id);
      if (topicsText.trim()) form.append("topics", topicsText);
      for (const file of pageFiles) {
        form.append("pages", file);
      }

      const res = await fetch("/api/exam/material", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as {
        exam: StoredExam;
        warning?: string;
      };
      void track("exam_material_uploaded", {
        examId: selectedExam.id,
        pageCount: pageFiles.length,
        subject: selectedExam.subject,
      });
      setSelectedExam(data.exam);
      setPageFiles([]);
      if (data.warning) setError(data.warning);
      await loadExams();
      setMode("list");
    } catch {
      setError("Could not understand pages. Try clearer photos.");
    } finally {
      setBusy(false);
    }
  }

  async function startRevision(exam: StoredExam) {
    if (!exam.concept_notes) {
      setSelectedExam(exam);
      setMode("upload");
      return;
    }
    setSelectedExam(exam);
    setMode("revise");
    setMessages([]);
    void track("exam_revision_started", { examId: exam.id, subject: exam.subject });
    setBusy(true);
    try {
      const res = await fetch("/api/exam/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          childName: profile.childName,
          messages: [],
          languageMode: settings.languageMode,
          schoolKey: schoolKey ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("revise failed");
      const data = (await res.json()) as { reply: string };
      const reply = data.reply;
      setMessages([{ role: "assistant", content: reply }]);
      await speak(reply);
    } catch {
      setError("Could not start revision.");
    } finally {
      setBusy(false);
    }
  }

  async function continueRevision(note: string) {
    if (!selectedExam) return;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: note },
    ];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const res = await fetch("/api/exam/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          childName: profile.childName,
          messages: nextMessages,
          contextNote: note,
          languageMode: settings.languageMode,
          schoolKey: schoolKey ?? undefined,
          studentKey,
        }),
      });
      if (!res.ok) throw new Error("revise failed");
      const data = (await res.json()) as { reply: string };
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      await speak(data.reply);
    } catch {
      setError("Revision failed.");
    } finally {
      setBusy(false);
    }
  }

  async function startQuiz(exam: StoredExam) {
    if (!exam.concept_notes) {
      setSelectedExam(exam);
      setMode("upload");
      return;
    }
    setSelectedExam(exam);
    setMode("quiz");
    setQuestions([]);
    setFullQuestions([]);
    setSelectedAnswers({});
    setShowAnswers(false);
    void track("exam_quiz_started", { examId: exam.id, subject: exam.subject });
    setBusy(true);
    try {
      const res = await fetch("/api/exam/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          languageMode: settings.languageMode,
          schoolKey: schoolKey ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("quiz failed");
      const data = (await res.json()) as {
        questions: Omit<ExamQuizQuestion, "correctIndex">[];
      };
      setQuestions(data.questions ?? []);
    } catch {
      setError("Could not create quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function revealQuizAnswers() {
    if (!selectedExam) return;
    if (!verifyParentPin(pinInput)) {
      setError("Wrong PIN");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/exam/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          languageMode: settings.languageMode,
          revealAnswers: true,
          pin: pinInput,
          schoolKey: schoolKey ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("reveal failed");
      const data = (await res.json()) as { questions: ExamQuizQuestion[] };
      setFullQuestions(data.questions ?? []);
      setShowAnswers(true);
    } catch {
      setError("Could not reveal answers.");
    } finally {
      setBusy(false);
    }
  }

  function handleQuizAnswer(questionId: string, optionIndex: number) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    void track("exam_quiz_answer", { questionId, optionIndex });
  }

  const upcoming = exams.filter((e) => e.status === "ready" || e.topics.length);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-arjuna-bg px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
          Arjuna · Learn &amp; Exam Prep
        </p>
        <Link href="/" className="text-sm text-arjuna-primaryDark underline">
          Homework
        </Link>
      </div>

      {(mode === "revise" || mode === "quiz") && (
        <div className="mb-4 flex flex-col items-center gap-3">
          <ArjunaAvatar state={avatarState} />
          {lastReply && (
            <p className="rounded-xl bg-white/90 p-3 text-sm text-arjuna-text">{lastReply}</p>
          )}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>
      )}

      {mode === "list" && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold text-arjuna-text">
            {profile.childName}&apos;s learning
          </h1>
          {profile.board && (
            <p className="text-sm text-arjuna-muted">
              {profile.board} · {profile.grade ?? "Grade not set"}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setError(null);
              }}
              className="flex-1 rounded-xl bg-arjuna-primary py-3 text-sm font-semibold text-white"
            >
              + New exam
            </button>
            <button
              type="button"
              onClick={() => {
                if (!curriculum) {
                  setError(
                    "No curriculum loaded. Ask parent to upload term plan in Settings.",
                  );
                  return;
                }
                setMode("curriculum");
                setCurriculumSubject(curriculum.subjects[0]?.subject ?? "");
                setSelectedTopicNames([]);
                setError(null);
              }}
              disabled={busy}
              className="flex-1 rounded-xl border border-green-600/40 bg-white py-3 text-sm font-semibold text-green-800"
            >
              📚 From curriculum
            </button>
            <button
              type="button"
              onClick={() => timetableRef.current?.click()}
              disabled={busy}
              className="flex-1 rounded-xl border border-arjuna-primary/30 bg-white py-3 text-sm font-semibold"
            >
              📅 Timetable
            </button>
          </div>
          <input
            ref={timetableRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleTimetableUpload(file);
              e.target.value = "";
            }}
          />

          {loading && <p className="text-sm text-arjuna-muted">Loading…</p>}

          {!loading && upcoming.length === 0 && (
            <p className="rounded-xl bg-white/90 p-4 text-sm text-arjuna-muted">
              No exams yet. Upload a timetable or create one, then add book pages.
            </p>
          )}

          <ul className="space-y-3">
            {exams.map((exam) => (
              <li key={exam.id} className="rounded-xl bg-white/95 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-arjuna-text">{exam.subject}</p>
                    {exam.exam_date && (
                      <p className="text-xs text-arjuna-muted">
                        {new Date(exam.exam_date).toLocaleDateString()}
                      </p>
                    )}
                    {exam.topics.length > 0 && (
                      <p className="mt-1 text-xs text-arjuna-muted">
                        {exam.topics.slice(0, 3).join(", ")}
                        {exam.topics.length > 3 ? "…" : ""}
                      </p>
                    )}
                    <p className="mt-1 text-xs">
                      {exam.status === "ready"
                        ? `✅ ${exam.page_count} pages understood`
                        : "📄 Add book pages"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExam(exam);
                      setTopicsText(exam.topics.join(", "));
                      setMode("upload");
                      setError(null);
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                  >
                    Upload pages
                  </button>
                  <button
                    type="button"
                    disabled={!exam.concept_notes}
                    onClick={() => void startRevision(exam)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Revise
                  </button>
                  <button
                    type="button"
                    disabled={!exam.concept_notes}
                    onClick={() => void startQuiz(exam)}
                    className="rounded-lg bg-arjuna-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Practice test
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "curriculum" && curriculum && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Prepare from curriculum</h2>
          {curriculum.term && (
            <p className="text-sm text-arjuna-muted">{curriculum.term}</p>
          )}
          <label className="block text-sm">
            Subject
            <select
              value={curriculumSubject}
              onChange={(e) => {
                setCurriculumSubject(e.target.value);
                setSelectedTopicNames([]);
              }}
              className="mt-1 w-full rounded-xl border p-3"
            >
              {curriculum.subjects.map((s) => (
                <option key={s.subject} value={s.subject}>
                  {s.subject}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium">Topics (tap to pick, or use all)</p>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {curriculum.subjects
                .find((s) => s.subject === curriculumSubject)
                ?.topics.map((t) => {
                  const checked = selectedTopicNames.includes(t.name);
                  return (
                    <li key={t.name}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTopicNames((prev) =>
                            checked
                              ? prev.filter((n) => n !== t.name)
                              : [...prev, t.name],
                          )
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          checked
                            ? "border-green-600 bg-green-50"
                            : "border-arjuna-primary/20 bg-white"
                        }`}
                      >
                        {t.name}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
          <label className="block text-sm">
            Exam date (optional — turns on exam mode)
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-3"
            />
          </label>
          <button
            type="button"
            disabled={busy || !curriculumSubject}
            onClick={() => void handleCreateFromCurriculum()}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            Start learning these concepts
          </button>
          <button type="button" onClick={() => setMode("list")} className="w-full text-sm underline">
            Cancel
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Create exam</h2>
          <label className="block text-sm">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-xl border p-3"
            />
          </label>
          <label className="block text-sm">
            Exam date (optional)
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-1 w-full rounded-xl border p-3"
            />
          </label>
          <label className="block text-sm">
            Topics (comma separated)
            <input
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder="Nouns, Verbs, Reading"
              className="mt-1 w-full rounded-xl border p-3"
            />
          </label>
          <button
            type="button"
            disabled={busy || !subject.trim()}
            onClick={() => void handleCreateExam()}
            className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            Next: upload pages
          </button>
          <button type="button" onClick={() => setMode("list")} className="w-full text-sm underline">
            Cancel
          </button>
        </div>
      )}

      {mode === "upload" && selectedExam && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Upload pages · {selectedExam.subject}
          </h2>
          <p className="text-sm text-arjuna-muted">
            Add book or homework pages (1 to many). Arjuna will understand concepts
            only from what you upload.
          </p>
          <label className="block text-sm">
            Extra topics (optional)
            <input
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              className="mt-1 w-full rounded-xl border p-3"
            />
          </label>
          <button
            type="button"
            onClick={() => pageRef.current?.click()}
            className="w-full rounded-xl border border-arjuna-primary/30 bg-white py-3 font-semibold"
          >
            📷 Add page ({pageFiles.length} selected)
          </button>
          <input
            ref={pageRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) setPageFiles((prev) => [...prev, ...files]);
              e.target.value = "";
            }}
          />
          {pageFiles.length > 0 && (
            <ul className="text-xs text-arjuna-muted">
              {pageFiles.map((f, i) => (
                <li key={`${f.name}-${i}`}>{f.name}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={busy || !pageFiles.length}
            onClick={() => void handleUploadPages()}
            className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            Understand these pages
          </button>
          <button type="button" onClick={() => setMode("list")} className="w-full text-sm underline">
            Back
          </button>
        </div>
      )}

      {mode === "revise" && selectedExam && (
        <div className="mt-auto space-y-3 pb-4">
          <p className="text-sm font-medium">{selectedExam.subject} revision</p>
          <div className="max-h-40 overflow-y-auto rounded-xl bg-white/90 p-3 text-sm">
            {messages.map((m, i) => (
              <p key={i} className="mb-2">
                <strong>{m.role === "user" ? profile.childName : "Arjuna"}:</strong>{" "}
                {m.content}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void continueRevision("Explain with a real-life example")}
              className="flex-1 rounded-xl bg-arjuna-primary py-3 text-sm font-semibold text-white"
            >
              Real-life example
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void continueRevision("Next concept please")}
              className="flex-1 rounded-xl border py-3 text-sm font-semibold"
            >
              Next concept
            </button>
          </div>
          <button
            type="button"
            onClick={() => void startQuiz(selectedExam)}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white"
          >
            Start practice test
          </button>
          <button type="button" onClick={() => setMode("list")} className="w-full text-sm underline">
            Back to exams
          </button>
        </div>
      )}

      {mode === "quiz" && selectedExam && (
        <div className="space-y-4 pb-4">
          <h2 className="text-lg font-semibold">{selectedExam.subject} practice</h2>
          <p className="text-xs text-arjuna-muted">No marks — just practice</p>
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl bg-white/95 p-4 shadow-sm">
              <p className="text-sm font-medium">
                {q.type === "gamified" ? "🎮 " : ""}
                {q.prompt}
              </p>
              <div className="mt-2 space-y-2">
                {q.options.map((opt, idx) => {
                  const selected = selectedAnswers[q.id] === idx;
                  const correct =
                    showAnswers &&
                    fullQuestions.find((fq) => fq.id === q.id)?.correctIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuizAnswer(q.id, idx)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        correct
                          ? "border-green-500 bg-green-50"
                          : selected
                            ? "border-arjuna-primary bg-arjuna-primary/10"
                            : ""
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!showAnswers && questions.length > 0 && (
            <div className="rounded-xl border border-dashed p-4">
              <p className="text-sm text-arjuna-muted">Parent: enter PIN to see answers</p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="mt-2 w-full rounded-xl border p-3"
                placeholder="PIN"
              />
              <button
                type="button"
                disabled={busy || pinInput.length < 4}
                onClick={() => void revealQuizAnswers()}
                className="mt-2 w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white disabled:opacity-50"
              >
                Show answers
              </button>
            </div>
          )}

          <button type="button" onClick={() => setMode("list")} className="w-full text-sm underline">
            Back to exams
          </button>
        </div>
      )}
    </main>
  );
}
