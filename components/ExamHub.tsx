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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-white px-6 pb-28 pt-8">
      {/* Consistent header across all modes */}
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {mode !== "list" ? (
            <button
              type="button"
              onClick={() => setMode("list")}
              aria-label="Back to exam list"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-text" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-base font-bold text-white shadow-chunky">
              {profile.childName.trim().charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <span className="font-display text-sm font-bold text-arjuna-text">
            {mode === "list" ? profile.childName : mode === "create" ? "New exam" : mode === "quiz" ? "Practice test" : mode === "revise" ? "Revision" : mode === "timetable" ? "Timetable" : "Exam"}
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

      {mode === "list" && (
        <>
          <div
            className="mb-4 overflow-hidden rounded-3xl px-5 py-4 shadow-hero"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #1E40AF 100%)" }}
          >
            <p className="font-display text-xl font-bold text-white">Exam Prep</p>
            <p className="mt-0.5 text-xs font-medium text-white/80 leading-snug">
              Add your upcoming exams, revise topics with Arjuna, and take practice tests to check how ready you are.
            </p>
            <div className="mt-3">
              <TodayRing />
            </div>
          </div>
        </>
      )}

      <AppTabNav active="exam" />

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
        <div className="space-y-5">
          {/* Intent cards — what do you want to do? */}
          <div className="space-y-3">
            <p className="font-display text-lg font-bold text-arjuna-text">
              What do you want to do?
            </p>

            {/* Primary: Practice test */}
            <button
              type="button"
              disabled={busy || exams.filter((e) => e.concept_notes).length === 0}
              onClick={() => {
                const ready = exams.find((e) => e.concept_notes);
                if (ready) void startQuiz(ready);
              }}
              className="flex w-full items-center gap-4 rounded-3xl bg-arjuna-primary px-5 py-4 text-left shadow-chunky transition active:scale-95 disabled:opacity-40"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-white">Practice test</p>
                <p className="text-xs text-white/75">Quiz yourself before the exam</p>
              </div>
            </button>

            {/* Secondary: Revise a topic */}
            <button
              type="button"
              disabled={busy || exams.filter((e) => e.concept_notes).length === 0}
              onClick={() => {
                const ready = exams.find((e) => e.concept_notes);
                if (ready) void startRevision(ready);
              }}
              className="flex w-full items-center gap-4 rounded-3xl border border-arjuna-border bg-white px-5 py-4 text-left transition active:scale-95 disabled:opacity-40"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-arjuna-primaryLight">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primary" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-arjuna-text">Revise a topic</p>
                <p className="text-xs text-arjuna-muted">Go through concepts with Arjuna</p>
              </div>
            </button>

            {/* Add new exam */}
            <button
              type="button"
              onClick={() => { setMode("create"); setError(null); }}
              className="flex w-full items-center gap-4 rounded-3xl border border-arjuna-border bg-white px-5 py-4 text-left transition active:scale-95"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-arjuna-primaryLight">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primary" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div>
                <p className="font-display text-base font-bold text-arjuna-text">Add new exam</p>
                <p className="text-xs text-arjuna-muted">Set subject, date and upload pages</p>
              </div>
            </button>
          </div>

          {/* Revision nudge */}
          {revisions.length > 0 && (
            <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/60 px-4 py-3">
              <p className="font-display text-sm font-bold text-amber-900">
                Time to revise
              </p>
              <p className="mt-0.5 text-xs text-arjuna-primaryDark">
                These topics are due for a quick check.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {revisions.map((r) => (
                  <button
                    key={`${r.subject}-${r.task}`}
                    type="button"
                    disabled={busy}
                    onClick={() => void startRevisionNow(r)}
                    className="rounded-2xl border border-amber-300 bg-white px-3 py-1.5 text-left text-xs font-semibold text-amber-900 disabled:opacity-50 active:scale-95"
                  >
                    {r.subject}: {r.task.slice(0, 28)}{r.task.length > 28 ? "..." : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weekly plan nudge */}
          {plan && plan.subjects.length > 0 && (
            <div className="rounded-3xl border-2 border-arjuna-border bg-arjuna-primaryLight/60 px-4 py-3">
              <p className="font-display text-sm font-bold text-arjuna-text">
                Week {plan.weekIndex + 1} plan
              </p>
              <ul className="mt-2 space-y-2">
                {plan.subjects.map((s) => {
                  const done = weeklyDone.includes(s.subject);
                  return (
                    <li key={s.subject} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-arjuna-text">{s.subject}</p>
                        <p className="truncate text-xs text-arjuna-muted">
                          {s.topics.map((t) => t.name).join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void startWeeklyTest(s.subject, s.topics)}
                        className={`shrink-0 rounded-2xl px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                          done
                            ? "border border-green-300 bg-green-50 text-green-800"
                            : "bg-arjuna-primary text-white"
                        }`}
                      >
                        {done ? "Done — retake" : "Weekly test"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Upcoming exams horizontal scroll */}
          {loading && (
            <p className="text-sm text-arjuna-muted">Loading exams...</p>
          )}

          {!loading && exams.length > 0 && (
            <div>
              <p className="mb-3 font-display text-sm font-bold text-arjuna-text">
                Upcoming exams
              </p>
              <div className="grid grid-cols-2 gap-3">
                {exams.map((exam) => {
                  const daysLeft = exam.exam_date
                    ? Math.ceil((new Date(exam.exam_date).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <div
                      key={exam.id}
                      className="flex min-w-0 flex-col gap-2 rounded-3xl border border-arjuna-border bg-white p-4"
                    >
                      <p className="font-display text-sm font-bold text-arjuna-text leading-tight">
                        {exam.subject}
                      </p>
                      {daysLeft !== null && (
                        <p className={`text-xs font-semibold ${daysLeft <= 3 ? "text-red-600" : "text-arjuna-muted"}`}>
                          {daysLeft <= 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days away`}
                        </p>
                      )}
                      <p className="text-xs text-arjuna-muted">
                        {exam.status === "ready"
                          ? `${exam.page_count} pages ready`
                          : "Add book pages"}
                      </p>
                      <div className="mt-auto flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={!exam.concept_notes || busy}
                          onClick={() => void startQuiz(exam)}
                          className="w-full rounded-2xl bg-arjuna-primary py-2 font-display text-xs font-bold text-white disabled:opacity-40 active:scale-95"
                        >
                          Practice test
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExam(exam);
                            setTopicsText(exam.topics.join(", "));
                            setMode("upload");
                            setError(null);
                          }}
                          className="w-full rounded-2xl border border-arjuna-border bg-white py-2 font-display text-xs font-bold text-arjuna-text active:scale-95"
                        >
                          Add pages
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && exams.length === 0 && (
            <p className="rounded-3xl bg-white/90 px-4 py-4 text-sm text-arjuna-muted">
              No exams yet. Tap &quot;Add new exam&quot; to get started.
            </p>
          )}

          {/* Secondary actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode("timetable"); setError(null); }}
              disabled={busy}
              className="flex-1 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-xs font-bold text-arjuna-text active:scale-95"
            >
              Add timetable
            </button>
            {curriculum && (
              <button
                type="button"
                onClick={() => {
                  setMode("curriculum");
                  setCurriculumSubject(curriculum.subjects[0]?.subject ?? "");
                  setSelectedTopicNames([]);
                  setError(null);
                }}
                disabled={busy}
                className="flex-1 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-xs font-bold text-arjuna-text active:scale-95"
              >
                From curriculum
              </button>
            )}
          </div>
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
          <div className="rounded-3xl bg-arjuna-primary px-5 py-4 shadow-chunky">
            <p className="font-display text-base font-bold text-white">
              New exam
            </p>
            <p className="mt-1 text-xs text-white/75">
              Type the subject, date and topics — Arjuna will ask you to add pages next.
            </p>
          </div>

          {subjectRows.map((row, idx) => (
            <div
              key={row.id}
              className="space-y-3 rounded-3xl border border-arjuna-border bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-xs font-bold uppercase text-arjuna-muted">
                  Subject {idx + 1}
                </p>
                {subjectRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubjectRow(row.id)}
                    className="text-xs font-semibold text-red-500 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                value={row.subject}
                onChange={(e) => updateSubjectRow(row.id, { subject: e.target.value })}
                placeholder="e.g. Maths"
                className="w-full rounded-2xl border border-arjuna-border bg-white p-3 font-display text-sm font-semibold text-arjuna-text placeholder:font-normal placeholder:text-arjuna-muted focus:border-arjuna-primary focus:outline-none"
              />
              <div>
                <label className="mb-1 block text-xs font-semibold text-arjuna-muted">
                  Exam date (optional)
                </label>
                <input
                  type="date"
                  value={row.examDate}
                  onChange={(e) => updateSubjectRow(row.id, { examDate: e.target.value })}
                  className="w-full rounded-2xl border border-arjuna-border bg-white p-3 text-sm text-arjuna-text focus:border-arjuna-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-arjuna-muted">
                  Topics — type or speak
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={row.topicsText}
                    onChange={(e) => updateSubjectRow(row.id, { topicsText: e.target.value })}
                    placeholder="e.g. Nouns, Verbs, Reading comprehension"
                    className="flex-1 rounded-2xl border border-arjuna-border bg-white p-3 text-sm text-arjuna-text focus:border-arjuna-primary focus:outline-none"
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
                    aria-label={recording && micTarget === row.id ? "Stop recording" : "Start recording"}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl border-2 transition active:scale-95 ${
                      recording && micTarget === row.id
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-arjuna-border bg-white text-arjuna-primary"
                    }`}
                  >
                    {recording && micTarget === row.id ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSubjectRow}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-arjuna-primary/40 py-3 font-display text-sm font-bold text-arjuna-primaryDark active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add another subject
          </button>

          <button
            type="button"
            disabled={busy || !subjectRows.some((r) => r.subject.trim())}
            onClick={() => void handleCreateMultipleExams()}
            className="w-full rounded-3xl bg-arjuna-primary py-4 font-display text-sm font-bold text-white shadow-chunky disabled:opacity-50 active:scale-95"
          >
            {busy
              ? "Creating..."
              : subjectRows.filter((r) => r.subject.trim()).length > 1
                ? `Create ${subjectRows.filter((r) => r.subject.trim()).length} exams`
                : "Create exam — add pages next"}
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            className="w-full py-2 text-sm font-semibold text-arjuna-muted underline"
          >
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
          {/* Quiz header */}
          <div className="rounded-3xl bg-arjuna-primary px-5 py-4 shadow-chunky">
            <p className="font-display text-base font-bold text-white">
              {selectedExam.subject} practice
            </p>
            {missionTitle && (
              <p className="mt-1 text-xs text-white/80">{missionTitle}</p>
            )}
            <p className="mt-1 text-xs text-white/60">No marks — just practice</p>
          </div>

          {questions.map((q, idx) => {
            const answered = selectedAnswers[q.id] !== undefined;
            const chosenIdx = selectedAnswers[q.id];
            const fullQ = fullQuestions.find((fq) => fq.id === q.id);
            return (
              <div key={q.id} className="rounded-3xl border border-arjuna-border bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-arjuna-text leading-snug">
                    {q.prompt}
                  </p>
                </div>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosenIdx === optIdx;
                    const isCorrect = showAnswers && fullQ?.correctIndex === optIdx;
                    const isWrong = showAnswers && isSelected && !isCorrect;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleQuizAnswer(q.id, optIdx)}
                        className={`w-full rounded-2xl border-2 px-4 py-3 text-left font-display text-sm font-semibold transition active:scale-95 ${
                          isCorrect
                            ? "border-green-400 bg-green-50 text-green-900"
                            : isWrong
                              ? "border-red-300 bg-red-50 text-red-900"
                              : isSelected
                                ? "border-arjuna-primary bg-arjuna-primary/10 text-arjuna-text"
                                : "border-arjuna-border text-arjuna-text"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {answered && !showAnswers && (
                  <p className="mt-2 text-xs text-arjuna-muted">Answer locked in</p>
                )}
              </div>
            );
          })}

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
