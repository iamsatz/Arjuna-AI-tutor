"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppTabNav } from "@/components/AppTabNav";
import { TodayRing } from "@/components/TodayRing";
import { Card } from "@/components/ui/Card";
import { ArjunaAvatar } from "./ArjunaAvatar";
import {
  buildSchoolKey,
  buildStudentKey,
  type ChildProfile,
} from "@/lib/childProfile";
import type { StoredExam } from "@/lib/examTypes";
import { arjunaFetch, getGeminiKeyHeader } from "@/lib/apiClient";
import { prepareUploadFiles } from "@/lib/compressImage";
import { topicsToConceptNotes, type StoredCurriculum } from "@/lib/curriculumTypes";
import { loadSettings, verifyParentPin } from "@/lib/settings";
import { track } from "@/lib/analytics";
import { playSpeech } from "@/lib/clientSpeech";
import { stripSpeechMarkers } from "@/lib/bridgeSubject";
import type { ChatMessage } from "@/lib/types";
import type { ExamQuizQuestion } from "@/lib/examTypes";
import { logDevError } from "@/lib/devLog";
import { loadTaskHistory, profileHistoryKey } from "@/lib/taskHistoryStore";
import {
  dueRevisions,
  markWeeklyTestDone,
  weeklyPlan,
  weeklyTestDoneSubjects,
  type DueRevision,
  type WeeklyPlan,
} from "@/lib/revisionPlan";
import type { CurriculumTopic } from "@/lib/curriculumTypes";

type ExamHubProps = {
  profile: ChildProfile;
};

type PrepMode = "list" | "create" | "curriculum" | "timetable" | "upload" | "revise" | "quiz";
type MicTarget = string;

type SubjectRow = { id: string; subject: string; examDate: string; topicsText: string };

function newSubjectRow(seed?: Partial<SubjectRow>): SubjectRow {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    subject: seed?.subject ?? "",
    examDate: seed?.examDate ?? "",
    topicsText: seed?.topicsText ?? "",
  };
}

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

  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([
    newSubjectRow({ subject: "English" }),
  ]);
  const [examDate, setExamDate] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const pageRef = useRef<HTMLInputElement>(null);
  const pageGalleryRef = useRef<HTMLInputElement>(null);
  const timetableRef = useRef<HTMLInputElement>(null);
  const timetableGalleryRef = useRef<HTMLInputElement>(null);
  const [timetableText, setTimetableText] = useState("");

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micTarget, setMicTarget] = useState<MicTarget | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastReply, setLastReply] = useState("");
  const [avatarState, setAvatarState] = useState<"idle" | "loading" | "speaking">("idle");

  const [questions, setQuestions] = useState<
    Omit<ExamQuizQuestion, "correctIndex">[]
  >([]);
  const [missionTitle, setMissionTitle] = useState<string | null>(null);
  const [fullQuestions, setFullQuestions] = useState<ExamQuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [pinInput, setPinInput] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  const [curriculum, setCurriculum] = useState<StoredCurriculum | null>(null);
  const [curriculumSubject, setCurriculumSubject] = useState("");
  const [selectedTopicNames, setSelectedTopicNames] = useState<string[]>([]);
  const prefilledRef = useRef(false);

  // Revision scheduler: computed at app-open (SSR-safe defaults, real values
  // load in effects — localStorage reads during render cause hydration flashes)
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [revisions, setRevisions] = useState<DueRevision[]>([]);
  const [weeklyDone, setWeeklyDone] = useState<string[]>([]);

  useEffect(() => {
    if (!curriculum) {
      setPlan(null);
      setWeeklyDone([]);
      return;
    }
    const p = weeklyPlan(curriculum);
    setPlan(p);
    setWeeklyDone(weeklyTestDoneSubjects(profileHistoryKey(profile), p.weekIndex));
  }, [curriculum, profile]);

  useEffect(() => {
    setRevisions(dueRevisions(loadTaskHistory(profileHistoryKey(profile))));
  }, [profile]);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        inviteCode: profile.inviteCode,
      });
      if (profile.id) {
        params.set("profileId", profile.id);
      } else {
        params.set("childName", profile.childName);
      }
      const res = await fetch(`/api/exam?${params.toString()}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { exams: StoredExam[] };
      setExams(data.exams ?? []);
    } catch (err) {
      logDevError("loadExams", err);
      setError("Could not load exams. Run Supabase migration for arjuna_exams.");
    } finally {
      setLoading(false);
    }
  }, [profile.inviteCode, profile.id, profile.childName]);

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
    } catch (err) {
      logDevError("loadCurriculum", err);
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
    setSubjectRows([newSubjectRow({ subject: subjectParam, topicsText: topicParam ?? "" })]);
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
    } catch (err) {
      logDevError("ExamHub speak", err);
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
          profileId: profile.id,
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
    } catch (err) {
      logDevError("handleCreateFromCurriculum", err);
      setError("Could not start from curriculum.");
    } finally {
      setBusy(false);
    }
  }

  function updateSubjectRow(id: string, patch: Partial<SubjectRow>) {
    setSubjectRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addSubjectRow() {
    setSubjectRows((prev) => [...prev, newSubjectRow()]);
  }

  function removeSubjectRow(id: string) {
    setSubjectRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function handleCreateMultipleExams() {
    const rows = subjectRows.filter((r) => r.subject.trim());
    if (!rows.length) return;
    setBusy(true);
    setError(null);
    try {
      let createdCount = 0;
      for (const row of rows) {
        const res = await fetch("/api/exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviteCode: profile.inviteCode,
            childName: profile.childName,
            profileId: profile.id,
            subject: row.subject.trim(),
            board: profile.board,
            grade: profile.grade,
            examDate: row.examDate || undefined,
            topics: row.topicsText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { exam: StoredExam };
          createdCount += 1;
          void track("exam_created", { subject: row.subject.trim(), examId: data.exam.id });
        }
      }
      if (!createdCount) {
        setError("Could not create exam(s).");
        return;
      }
      setSubjectRows([newSubjectRow()]);
      await loadExams();
      setMode("list");
    } catch (err) {
      logDevError("handleCreateMultipleExams", err);
      setError("Could not create exam(s).");
    } finally {
      setBusy(false);
    }
  }

  async function saveTimetableResult(res: Response) {
    if (!res.ok) throw new Error("timetable failed");
    const data = (await res.json()) as { exams: StoredExam[] };
    for (const exam of data.exams) {
      void track("exam_created", { subject: exam.subject, examId: exam.id, source: "timetable" });
    }
    await loadExams();
    setMode("list");
    setTimetableText("");
  }

  async function handleTimetableFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareUploadFiles(files);
      const form = new FormData();
      for (const file of prepared) form.append("photo", file);
      form.append("inviteCode", profile.inviteCode);
      form.append("childName", profile.childName);
      if (profile.board) form.append("board", profile.board);
      if (profile.grade) form.append("grade", profile.grade);

      const res = await fetch("/api/exam/timetable", {
        method: "POST",
        headers: getGeminiKeyHeader(),
        body: form,
      });
      await saveTimetableResult(res);
    } catch (err) {
      logDevError("handleTimetableFiles", err);
      setError("Could not read timetable. Try a clearer photo, or type it instead.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTimetableTextSubmit() {
    const text = timetableText.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await arjunaFetch("/api/exam/timetable", {
        method: "POST",
        json: {
          text,
          inviteCode: profile.inviteCode,
          childName: profile.childName,
          board: profile.board,
          grade: profile.grade,
        },
      });
      await saveTimetableResult(res);
    } catch (err) {
      logDevError("handleTimetableTextSubmit", err);
      setError("Could not understand that schedule. Try adding subject + date clearly.");
    } finally {
      setBusy(false);
    }
  }

  function stopMicStream() {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  }

  async function toggleMic(target: MicTarget, applyText: (text: string) => void) {
    if (recording && micTarget === target) {
      const recorder = recorderRef.current;
      if (!recorder) return;
      setTranscribing(true);
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      setRecording(false);
      stopMicStream();
      recorderRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];

      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json()) as { transcript?: string; error?: string };
        const text = data.transcript?.trim();
        if (res.ok && text) {
          applyText(text);
        } else {
          setError("Could not hear you. Try again or type instead.");
        }
      } catch (err) {
        logDevError("toggleMic/transcribe", err);
        setError("Could not hear you. Try again or type instead.");
      } finally {
        setTranscribing(false);
        setMicTarget(null);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setMicTarget(target);
      setRecording(true);
    } catch {
      stopMicStream();
      setError("Microphone blocked. Allow mic in browser settings, or type instead.");
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

      const res = await fetch("/api/exam/material", {
        method: "POST",
        headers: getGeminiKeyHeader(),
        body: form,
      });
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
    } catch (err) {
      logDevError("handleUploadPages", err);
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
      const res = await arjunaFetch("/api/exam/revise", {
        method: "POST",
        json: {
          examId: exam.id,
          childName: profile.childName,
          messages: [],
          languageMode: settings.languageMode,
          schoolKey: schoolKey ?? undefined,
        },
      });
      if (!res.ok) throw new Error("revise failed");
      const data = (await res.json()) as { reply: string };
      const reply = data.reply;
      setMessages([{ role: "assistant", content: reply }]);
      await speak(reply);
    } catch (err) {
      logDevError("startRevision", err);
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
      const res = await arjunaFetch("/api/exam/revise", {
        method: "POST",
        json: {
          examId: selectedExam.id,
          childName: profile.childName,
          messages: nextMessages,
          contextNote: note,
          languageMode: settings.languageMode,
          schoolKey: schoolKey ?? undefined,
          studentKey,
        },
      });
      if (!res.ok) throw new Error("revise failed");
      const data = (await res.json()) as { reply: string };
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      await speak(data.reply);
    } catch (err) {
      logDevError("continueRevision", err);
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
    setMissionTitle(null);
    setFullQuestions([]);
    setSelectedAnswers({});
    setShowAnswers(false);
    void track("exam_quiz_started", { examId: exam.id, subject: exam.subject });
    setBusy(true);
    try {
      const res = await arjunaFetch("/api/exam/quiz", {
        method: "POST",
        json: {
          examId: exam.id,
          languageMode: settings.languageMode,
          schoolKey: schoolKey ?? undefined,
        },
      });
      if (!res.ok) throw new Error("quiz failed");
      const data = (await res.json()) as {
        questions: Omit<ExamQuizQuestion, "correctIndex">[];
        missionTitle?: string;
      };
      setQuestions(data.questions ?? []);
      setMissionTitle(data.missionTitle ?? null);
    } catch (err) {
      logDevError("startQuiz", err);
      setError("Could not create quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function startWeeklyTest(subject: string, topics: CurriculumTopic[]) {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: profile.inviteCode,
          childName: profile.childName,
          profileId: profile.id,
          subject,
          board: profile.board,
          grade: profile.grade,
          topics: topics.map((t) => t.name),
          conceptNotes: topicsToConceptNotes(subject, topics),
          status: "ready",
        }),
      });
      if (!res.ok) throw new Error("weekly test create failed");
      const data = (await res.json()) as { exam: StoredExam };
      void track("weekly_test_started", { subject, week: plan.weekIndex });
      markWeeklyTestDone(profileHistoryKey(profile), plan.weekIndex, subject);
      setWeeklyDone((prev) =>
        prev.includes(subject) ? prev : [...prev, subject],
      );
      await loadExams();
      await startQuiz(data.exam);
    } catch (err) {
      logDevError("startWeeklyTest", err);
      setError("Could not start this week's test.");
    } finally {
      setBusy(false);
    }
  }

  async function startRevisionNow(due: DueRevision) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: profile.inviteCode,
          childName: profile.childName,
          profileId: profile.id,
          subject: due.subject,
          board: profile.board,
          grade: profile.grade,
          topics: [due.task],
          conceptNotes: `- ${due.task}: homework completed ${due.daysAgo} days ago — revise the concept and check it stuck`,
          status: "ready",
        }),
      });
      if (!res.ok) throw new Error("revision create failed");
      const data = (await res.json()) as { exam: StoredExam };
      void track("spaced_revision_started", {
        subject: due.subject,
        daysAgo: due.daysAgo,
      });
      await loadExams();
      await startRevision(data.exam);
    } catch (err) {
      logDevError("startRevisionNow", err);
      setError("Could not start revision.");
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
      const res = await arjunaFetch("/api/exam/quiz", {
        method: "POST",
        json: {
          examId: selectedExam.id,
          languageMode: settings.languageMode,
          revealAnswers: true,
          pin: pinInput,
          schoolKey: schoolKey ?? undefined,
        },
      });
      if (!res.ok) throw new Error("reveal failed");
      const data = (await res.json()) as { questions: ExamQuizQuestion[] };
      setFullQuestions(data.questions ?? []);
      setShowAnswers(true);
    } catch (err) {
      logDevError("revealQuizAnswers", err);
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
      {mode === "list" && (
        <>
          <Card className="mb-4">
            <TodayRing />
          </Card>
          <AppTabNav active="exam" />
        </>
      )}

      {mode !== "list" && (
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="text-sm text-arjuna-primaryDark underline"
          >
            ← Back
          </button>
          <Link href="/" className="text-sm text-arjuna-primaryDark underline">
            Homework
          </Link>
        </div>
      )}

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
        <div className="mt-4 space-y-4">
          <h1 className="text-xl font-semibold text-arjuna-text">
            {profile.childName}&apos;s learning
          </h1>
          {profile.board && (
            <p className="text-sm text-arjuna-muted">
              {profile.board} · {profile.grade ?? "Grade not set"}
            </p>
          )}

          {plan && plan.subjects.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
              <p className="font-semibold text-indigo-900">
                📅 Week {plan.weekIndex + 1} — this week&apos;s plan
              </p>
              <p className="mt-0.5 text-xs text-indigo-800">
                From your school term plan. One tap for this week&apos;s test.
              </p>
              <ul className="mt-3 space-y-2">
                {plan.subjects.map((s) => {
                  const done = weeklyDone.includes(s.subject);
                  return (
                    <li
                      key={s.subject}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-arjuna-text">
                          {s.subject}
                        </p>
                        <p className="truncate text-xs text-arjuna-muted">
                          {s.topics.map((t) => t.name).join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void startWeeklyTest(s.subject, s.topics)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          done
                            ? "border border-green-300 bg-green-50 text-green-800"
                            : "bg-indigo-600 text-white"
                        }`}
                      >
                        {done ? "✅ Done — retake" : "Weekly test"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {revisions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="font-semibold text-amber-900">🔁 Time to revise</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Done 3–5 weeks ago — a quick check that it stuck.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {revisions.map((r) => (
                  <button
                    key={`${r.subject}-${r.task}`}
                    type="button"
                    disabled={busy}
                    onClick={() => void startRevisionNow(r)}
                    className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-left text-xs font-semibold text-amber-900 disabled:opacity-50"
                  >
                    {r.subject}: {r.task.slice(0, 32)}
                    {r.task.length > 32 ? "…" : ""}
                  </button>
                ))}
              </div>
            </div>
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
              onClick={() => {
                setMode("timetable");
                setError(null);
              }}
              disabled={busy}
              className="flex-1 rounded-xl border border-arjuna-primary/30 bg-white py-3 text-sm font-semibold"
            >
              📅 Timetable
            </button>
          </div>

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

      {mode === "timetable" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Add timetable</h2>
          <p className="text-sm text-arjuna-muted">
            Scan a photo or PDF of the timetable, or type / speak the exam dates.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => timetableRef.current?.click()}
              disabled={busy}
              className="flex-1 rounded-xl border border-arjuna-primary/30 bg-white py-3 text-sm font-semibold"
            >
              📷 Scan
            </button>
            <button
              type="button"
              onClick={() => timetableGalleryRef.current?.click()}
              disabled={busy}
              className="flex-1 rounded-xl border border-arjuna-primary/30 bg-white py-3 text-sm font-semibold"
            >
              🖼️ Choose file
            </button>
          </div>
          <input
            ref={timetableRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void handleTimetableFiles(files);
              e.target.value = "";
            }}
          />
          <input
            ref={timetableGalleryRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void handleTimetableFiles(files);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-arjuna-muted">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <label className="block text-sm">
            Type the schedule (subject + date)
            <div className="mt-1 flex gap-2">
              <textarea
                value={timetableText}
                onChange={(e) => setTimetableText(e.target.value)}
                placeholder="Maths - 12 July, English - 15 July…"
                className="flex-1 rounded-xl border p-3 text-sm"
                rows={3}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() =>
                  void toggleMic("timetable", (text) =>
                    setTimetableText((prev) => (prev ? `${prev} ${text}` : text)),
                  )
                }
                disabled={transcribing || busy}
                className={`rounded-xl border px-3 text-sm font-semibold ${
                  recording && micTarget === "timetable"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-arjuna-primary/30"
                }`}
              >
                {recording && micTarget === "timetable" ? "⏹" : "🎤"}
              </button>
            </div>
          </label>
          <button
            type="button"
            disabled={busy || !timetableText.trim()}
            onClick={() => void handleTimetableTextSubmit()}
            className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            Add from typed schedule
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setTimetableText("");
              setError(null);
            }}
            className="w-full text-sm underline"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Create exam(s)</h2>
          <p className="text-sm text-arjuna-muted">
            Add one subject at a time. Type or speak the topics — no need to
            format anything.
          </p>

          {subjectRows.map((row, idx) => (
            <div
              key={row.id}
              className="space-y-2 rounded-xl border border-arjuna-primary/20 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-arjuna-muted">
                  Subject {idx + 1}
                </p>
                {subjectRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubjectRow(row.id)}
                    className="text-xs font-semibold text-red-600 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                value={row.subject}
                onChange={(e) => updateSubjectRow(row.id, { subject: e.target.value })}
                placeholder="e.g. English"
                className="w-full rounded-xl border p-3 text-sm"
              />
              <input
                type="date"
                value={row.examDate}
                onChange={(e) => updateSubjectRow(row.id, { examDate: e.target.value })}
                className="w-full rounded-xl border p-3 text-sm"
              />
              <div className="flex gap-2">
                <textarea
                  value={row.topicsText}
                  onChange={(e) => updateSubjectRow(row.id, { topicsText: e.target.value })}
                  placeholder="Topics — type or speak (e.g. Nouns, Verbs, Reading)"
                  className="flex-1 rounded-xl border p-3 text-sm"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() =>
                    void toggleMic(row.id, (text) =>
                      updateSubjectRow(row.id, {
                        topicsText: row.topicsText ? `${row.topicsText}, ${text}` : text,
                      }),
                    )
                  }
                  disabled={transcribing}
                  className={`rounded-xl border px-3 text-sm font-semibold ${
                    recording && micTarget === row.id
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-arjuna-primary/30"
                  }`}
                >
                  {recording && micTarget === row.id ? "⏹" : "🎤"}
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSubjectRow}
            className="w-full rounded-xl border border-dashed border-arjuna-primary/40 py-2.5 text-sm font-semibold text-arjuna-primaryDark"
          >
            + Add another subject
          </button>
          <button
            type="button"
            disabled={busy || !subjectRows.some((r) => r.subject.trim())}
            onClick={() => void handleCreateMultipleExams()}
            className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white disabled:opacity-50"
          >
            {subjectRows.filter((r) => r.subject.trim()).length > 1
              ? "Create these exams"
              : "Create exam"}{" "}
            — add pages next
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
            Extra topics (optional) — type, or speak
            <div className="mt-1 flex gap-2">
              <input
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                className="flex-1 rounded-xl border p-3"
              />
              <button
                type="button"
                onClick={() =>
                  void toggleMic("topics", (text) =>
                    setTopicsText((prev) => (prev ? `${prev}, ${text}` : text)),
                  )
                }
                disabled={transcribing}
                className={`rounded-xl border px-3 text-sm font-semibold ${
                  recording && micTarget === "topics"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-arjuna-primary/30"
                }`}
              >
                {recording && micTarget === "topics" ? "⏹" : "🎤"}
              </button>
            </div>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => pageRef.current?.click()}
              className="flex-1 rounded-xl border border-arjuna-primary/30 bg-white py-3 font-semibold"
            >
              📷 Scan page ({pageFiles.length} selected)
            </button>
            <button
              type="button"
              onClick={() => pageGalleryRef.current?.click()}
              className="flex-1 rounded-xl border border-arjuna-primary/30 bg-white py-3 font-semibold"
            >
              🖼️ Choose file
            </button>
          </div>
          <input
            ref={pageRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) {
                void prepareUploadFiles(files).then((prepared) =>
                  setPageFiles((prev) => [...prev, ...prepared]),
                );
              }
              e.target.value = "";
            }}
          />
          <input
            ref={pageGalleryRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) {
                void prepareUploadFiles(files).then((prepared) =>
                  setPageFiles((prev) => [...prev, ...prepared]),
                );
              }
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
          {missionTitle && (
            <p className="rounded-xl bg-arjuna-primary/10 px-3 py-2 text-sm font-semibold text-arjuna-primaryDark">
              🎯 {missionTitle}
            </p>
          )}
          <p className="text-xs text-arjuna-muted">No marks — just practice</p>
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl bg-white/95 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-arjuna-muted">
                Checkpoint {idx + 1}
              </p>
              <p className="mt-1 text-sm font-medium">{q.prompt}</p>
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
