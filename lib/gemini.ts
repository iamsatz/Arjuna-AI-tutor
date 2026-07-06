import type { LanguageMode } from "@/lib/settings";
import type { CurriculumBoard, MediumOfInstruction, TeachingMethod } from "@/lib/childProfile";
import {
  buildExamQuizPrompt,
  buildExamRevisionPrompt,
  buildParentSolutionPrompt,
  buildSystemPrompt,
  buildTeachingPlanPrompt,
  buildVerifyAnswerPrompt,
  CONCEPT_EXTRACTION_PROMPT,
  PHOTO_EXTRACTION_PROMPT,
  SUMMARY_PROMPT,
  TEXT_EXTRACTION_PROMPT,
  TIMETABLE_EXTRACTION_PROMPT,
  CURRICULUM_EXTRACTION_PROMPT,
  buildEnglishConceptCompletionCheck,
  buildEnglishConceptPrompt,
  buildJournalListenPrompt,
  DAILY_WORDS_PROMPT,
} from "./prompts";
import type { CurriculumSubject } from "./curriculumTypes";
import type { ExamQuizQuestion } from "./examTypes";
import type { ChatMessage, HomeworkTask } from "./types";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash"] as const;

type GeminiPart = {
  text?: string;
  inline_data?: { mime_type: string; data: string };
};

function normalizeExtractedTasks(tasks: HomeworkTask[]): HomeworkTask[] {
  return tasks.map((t) => ({
    ...t,
    subject: t.subject?.trim() || "Other",
    task: t.task?.trim() || "",
    notes: t.notes?.trim() || undefined,
    subjectUncertain:
      t.subjectUncertain ??
      (!t.subject?.trim() || t.subject.trim() === "Other"),
  }));
}

async function geminiGenerate(
  apiKey: string,
  parts: GeminiPart[],
  systemInstruction?: string,
  maxTokens = 512,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let lastError = "";
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Gemini returned empty response");
      return text;
    }

    const detail = await response.text();
    lastError = `Gemini failed (${response.status}): ${detail}`;
    if (response.status === 404 || response.status === 503) continue;
    throw new Error(lastError);
  }

  throw new Error(lastError || "Gemini failed");
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function chatWithArjuna(
  apiKey: string,
  messages: ChatMessage[],
  contextNote: string | undefined,
  childName: string,
  languageMode: LanguageMode,
  grade?: string,
  board?: CurriculumBoard,
  teachingNotes?: string[],
  bridgeRules?: string,
  method?: TeachingMethod,
): Promise<string> {
  const history = messages
    .map((m) => `${m.role === "user" ? childName : "Arjuna"}: ${m.content}`)
    .join("\n");

  const prompt = contextNote
    ? `${contextNote}\n\nConversation so far:\n${history}\n\nArjuna's next reply (short):`
    : `Conversation so far:\n${history}\n\nArjuna's next reply (short):`;

  return geminiGenerate(
    apiKey,
    [{ text: prompt }],
    buildSystemPrompt(
      childName,
      languageMode,
      grade,
      teachingNotes,
      board,
      bridgeRules,
      method,
    ),
  );
}

export type DiaryTermPlan = {
  term?: string;
  subjects: { subject: string; topics: string[] }[];
};

export type DiaryExtractionResult = {
  tasks: HomeworkTask[];
  confidence: string;
  reason?: string;
  termPlan?: DiaryTermPlan | null;
  teacherNote?: string;
};

export async function extractHomeworkFromPhoto(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<{ tasks: HomeworkTask[]; confidence: string; reason?: string }> {
  return extractHomeworkFromPhotos(apiKey, [
    { data: imageBase64, mimeType },
  ]);
}

export type HomeworkImageInput = { data: string; mimeType: string };

export async function extractHomeworkFromPhotos(
  apiKey: string,
  images: HomeworkImageInput[],
  options?: { diaryNote?: string; extraText?: string },
): Promise<DiaryExtractionResult> {
  const parts: GeminiPart[] = [{ text: PHOTO_EXTRACTION_PROMPT }];

  if (options?.diaryNote?.trim()) {
    parts.push({
      text: `Teacher diary note (use with the images):\n${options.diaryNote.trim()}`,
    });
  }
  if (options?.extraText?.trim()) {
    parts.push({ text: `Additional context:\n${options.extraText.trim()}` });
  }

  for (const img of images) {
    parts.push({
      inline_data: { mime_type: img.mimeType, data: img.data },
    });
  }

  const raw = await geminiGenerate(apiKey, parts, undefined, 2048);
  const parsed = parseJson<{
    termPlan?: DiaryTermPlan | null;
    todayTasks?: HomeworkTask[];
    tasks?: HomeworkTask[];
    teacherNote?: string;
    confidence?: string;
    reason?: string;
  }>(raw);

  const tasks = normalizeExtractedTasks(parsed.todayTasks ?? parsed.tasks ?? []);
  return {
    tasks,
    confidence: parsed.confidence ?? (tasks.length ? "medium" : "low"),
    reason: parsed.reason,
    termPlan: parsed.termPlan ?? null,
    teacherNote: parsed.teacherNote,
  };
}

export type VerifyAnswerResult = {
  correct: boolean;
  feedback: string;
  hint?: string;
};

export async function verifyAnswerFromPhoto(
  apiKey: string,
  image: HomeworkImageInput,
  subject: string,
  task: string,
  languageMode: LanguageMode,
  grade?: string,
): Promise<VerifyAnswerResult> {
  const prompt = buildVerifyAnswerPrompt(subject, task, grade, languageMode);
  const raw = await geminiGenerate(
    apiKey,
    [
      { text: prompt },
      { inline_data: { mime_type: image.mimeType, data: image.data } },
    ],
    undefined,
    512,
  );
  const parsed = parseJson<VerifyAnswerResult>(raw);
  return {
    correct: Boolean(parsed.correct),
    feedback: parsed.feedback?.trim() || "Let me look again.",
    hint: parsed.hint?.trim(),
  };
}

export async function extractHomeworkFromText(
  apiKey: string,
  text: string,
  diaryNote?: string,
): Promise<{ tasks: HomeworkTask[]; confidence: string; reason?: string }> {
  let prompt = `${TEXT_EXTRACTION_PROMPT}\n\nStudent input:\n${text}`;
  if (diaryNote?.trim()) {
    prompt = `${TEXT_EXTRACTION_PROMPT}\n\nTeacher diary note:\n${diaryNote.trim()}\n\nAdditional:\n${text}`;
  }

  const raw = await geminiGenerate(
    apiKey,
    [{ text: prompt }],
    undefined,
    1024,
  );

  const parsed = parseJson<{
    tasks?: HomeworkTask[];
    confidence?: string;
    reason?: string;
  }>(raw);

  const tasks = normalizeExtractedTasks(parsed.tasks ?? []);
  return {
    tasks,
    confidence: parsed.confidence ?? (tasks.length ? "medium" : "low"),
    reason: parsed.reason,
  };
}

export async function generateParentSolution(
  apiKey: string,
  taskSubject: string,
  taskText: string,
  languageMode: LanguageMode,
  context?: string,
): Promise<string> {
  const prompt = `Subject: ${taskSubject}\nTask: ${taskText}\n${context ? `Context: ${context}` : ""}\n\nGive the full worked solution for the parent.`;

  return geminiGenerate(
    apiKey,
    [{ text: prompt }],
    buildParentSolutionPrompt(languageMode),
    1024,
  );
}

export async function generateSessionSummary(
  apiKey: string,
  transcript: string,
): Promise<{
  telugu_summary: string;
  english_summary: string;
  flags: string[];
}> {
  const raw = await geminiGenerate(
    apiKey,
    [{ text: `${SUMMARY_PROMPT}\n\nTranscript:\n${transcript}` }],
    undefined,
    1024,
  );

  const parsed = parseJson<{
    telugu_summary: string;
    english_summary: string;
    flags?: string[];
  }>(raw);

  return {
    telugu_summary: parsed.telugu_summary,
    english_summary: parsed.english_summary,
    flags: parsed.flags ?? [],
  };
}

export type ExtractedConcept = {
  name: string;
  gist: string;
};

function formatConceptNotes(concepts: ExtractedConcept[]): string {
  return concepts.map((c) => `- ${c.name}: ${c.gist}`).join("\n");
}

export async function extractConceptNotesFromImages(
  apiKey: string,
  images: { base64: string; mimeType: string }[],
  typedTopics?: string[],
): Promise<{ concepts: ExtractedConcept[]; conceptNotes: string; confidence: string }> {
  const BATCH_SIZE = 4;
  const allConcepts: ExtractedConcept[] = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const parts: GeminiPart[] = [
      {
        text: `${CONCEPT_EXTRACTION_PROMPT}\n\nPages ${i + 1}-${i + batch.length} of ${images.length}.`,
      },
      ...batch.map((img) => ({
        inline_data: { mime_type: img.mimeType, data: img.base64 },
      })),
    ];

    const raw = await geminiGenerate(apiKey, parts, undefined, 2048);
    const parsed = parseJson<{
      concepts: ExtractedConcept[];
      confidence: string;
    }>(raw);
    allConcepts.push(...(parsed.concepts ?? []));
  }

  if (typedTopics?.length) {
    for (const topic of typedTopics) {
      const trimmed = topic.trim();
      if (trimmed && !allConcepts.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        allConcepts.push({ name: trimmed, gist: `Topic from parent timetable: ${trimmed}` });
      }
    }
  }

  const deduped = allConcepts.filter(
    (c, idx, arr) =>
      arr.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === idx,
  );

  return {
    concepts: deduped,
    conceptNotes: formatConceptNotes(deduped),
    confidence: deduped.length ? "high" : "low",
  };
}

export async function extractExamTimetable(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<{
  exams: { subject: string; examDate?: string; topics: string[] }[];
  confidence: string;
}> {
  const raw = await geminiGenerate(
    apiKey,
    [
      { text: TIMETABLE_EXTRACTION_PROMPT },
      { inline_data: { mime_type: mimeType, data: imageBase64 } },
    ],
    undefined,
    2048,
  );

  const parsed = parseJson<{
    exams: { subject: string; examDate?: string; topics?: string[] }[];
    confidence: string;
  }>(raw);

  return {
    exams: (parsed.exams ?? []).map((e) => ({
      subject: e.subject,
      examDate: e.examDate,
      topics: e.topics ?? [],
    })),
    confidence: parsed.confidence ?? "low",
  };
}

export async function generateExamRevision(
  apiKey: string,
  board: CurriculumBoard | undefined,
  grade: string | undefined,
  subject: string,
  conceptNotes: string,
  languageMode: LanguageMode,
  messages: ChatMessage[],
  childName: string,
  contextNote?: string,
): Promise<string> {
  const history = messages
    .map((m) => `${m.role === "user" ? childName : "Arjuna"}: ${m.content}`)
    .join("\n");

  const prompt = contextNote
    ? `${contextNote}\n\nConversation:\n${history}\n\nArjuna's next revision reply (short):`
    : `Start revising ${subject} for the exam.\n\nConversation:\n${history}\n\nArjuna's next revision reply (short):`;

  return geminiGenerate(
    apiKey,
    [{ text: prompt }],
    buildExamRevisionPrompt(board, grade, subject, conceptNotes, languageMode),
    768,
  );
}

export async function generateExamQuiz(
  apiKey: string,
  board: CurriculumBoard | undefined,
  grade: string | undefined,
  subject: string,
  conceptNotes: string,
  languageMode: LanguageMode,
): Promise<{ questions: ExamQuizQuestion[] }> {
  const raw = await geminiGenerate(
    apiKey,
    [{ text: buildExamQuizPrompt(board, grade, subject, conceptNotes, languageMode) }],
    undefined,
    2048,
  );

  const parsed = parseJson<{ questions: ExamQuizQuestion[] }>(raw);
  return { questions: parsed.questions ?? [] };
}

export type TeachingPlan = {
  topic: string;
  summary: string;
  realLifeHooks: string[];
  steps: string[];
  commonMistakes: string[];
  checkQuestions: string[];
};

export async function generateTeachingPlan(
  apiKey: string,
  params: {
    board?: CurriculumBoard;
    method?: TeachingMethod;
    grade?: string;
    subject: string;
    topic: string;
    medium?: MediumOfInstruction;
  },
): Promise<TeachingPlan> {
  const raw = await geminiGenerate(
    apiKey,
    [
      {
        text: buildTeachingPlanPrompt(
          params.board,
          params.method,
          params.grade,
          params.subject,
          params.topic,
          params.medium,
        ),
      },
    ],
    undefined,
    1536,
  );

  const parsed = parseJson<Partial<TeachingPlan>>(raw);
  return {
    topic: parsed.topic ?? params.topic,
    summary: parsed.summary ?? "",
    realLifeHooks: parsed.realLifeHooks ?? [],
    steps: parsed.steps ?? [],
    commonMistakes: parsed.commonMistakes ?? [],
    checkQuestions: parsed.checkQuestions ?? [],
  };
}

export async function extractCurriculum(
  apiKey: string,
  files: { base64: string; mimeType: string }[],
): Promise<{
  term: string;
  subjects: CurriculumSubject[];
  confidence: string;
  notes: string;
  rawText: string;
}> {
  const BATCH_SIZE = 4;
  const subjectMap = new Map<string, CurriculumSubject>();
  let term = "";
  let confidence = "low";
  let notes = "";
  const rawParts: string[] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const parts: GeminiPart[] = [
      {
        text: `${CURRICULUM_EXTRACTION_PROMPT}\n\nPages ${i + 1}-${i + batch.length} of ${files.length}.`,
      },
      ...batch.map((img) => ({
        inline_data: { mime_type: img.mimeType, data: img.base64 },
      })),
    ];

    const raw = await geminiGenerate(apiKey, parts, undefined, 4096);
    rawParts.push(raw);

    const parsed = parseJson<{
      term?: string;
      subjects?: CurriculumSubject[];
      confidence?: string;
      notes?: string;
    }>(raw);

    if (parsed.term && !term) term = parsed.term;
    if (parsed.confidence) confidence = parsed.confidence;
    if (parsed.notes) notes = parsed.notes;

    for (const subj of parsed.subjects ?? []) {
      const key = subj.subject.toLowerCase().trim();
      const existing = subjectMap.get(key);
      if (!existing) {
        subjectMap.set(key, {
          subject: subj.subject,
          topics: [...(subj.topics ?? [])],
        });
        continue;
      }
      for (const topic of subj.topics ?? []) {
        const dup = existing.topics.some(
          (t) => t.name.toLowerCase() === topic.name.toLowerCase(),
        );
        if (!dup) existing.topics.push(topic);
      }
    }
  }

  return {
    term,
    subjects: Array.from(subjectMap.values()),
    confidence,
    notes,
    rawText: rawParts.join("\n---\n"),
  };
}

export async function englishConceptTurn(
  apiKey: string,
  input: {
    childName: string;
    languageMode: LanguageMode;
    grade?: string;
    board?: CurriculumBoard;
    method?: TeachingMethod;
    conceptLabel: string;
    conceptFocus: string;
    step: string;
    messages: ChatMessage[];
  },
): Promise<string> {
  const history = input.messages
    .map((m) => `${m.role === "user" ? input.childName : "Arjuna"}: ${m.content}`)
    .join("\n");

  const system = buildEnglishConceptPrompt({
    childName: input.childName,
    languageMode: input.languageMode,
    grade: input.grade,
    board: input.board,
    method: input.method,
    conceptLabel: input.conceptLabel,
    conceptFocus: input.conceptFocus,
    step: input.step,
  });

  const prompt = history
    ? `Conversation:\n${history}\n\nArjuna's next reply (stay on current step):`
    : `Start the lesson. Arjuna's first reply:`;

  return geminiGenerate(apiKey, [{ text: prompt }], system, 512);
}

export async function checkEnglishConceptPass(
  apiKey: string,
  conceptLabel: string,
  languageMode: LanguageMode,
  messages: ChatMessage[],
): Promise<{ passed: boolean; reason: string }> {
  const history = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const prompt = `${buildEnglishConceptCompletionCheck(conceptLabel, languageMode)}\n\nTranscript:\n${history}`;
  const raw = await geminiGenerate(apiKey, [{ text: prompt }], undefined, 256);
  try {
    return parseJson<{ passed: boolean; reason: string }>(raw);
  } catch {
    return { passed: messages.some((m) => m.role === "user"), reason: "completed" };
  }
}

export async function generateDailyWords(
  apiKey: string,
  input: {
    count: number;
    grade?: string;
    medium?: MediumOfInstruction;
    languageMode: LanguageMode;
    homeworkText?: string;
    curriculumTopics?: string[];
  },
): Promise<
  {
    word: string;
    meaning: string;
    meaningTelugu?: string;
    ipa?: string;
    example: string;
    source?: string;
  }[]
> {
  const context = [
    input.grade ? `Grade: ${input.grade}` : "",
    input.medium ? `Medium: ${input.medium}` : "",
    input.homeworkText ? `Recent English homework:\n${input.homeworkText.slice(0, 1500)}` : "",
    input.curriculumTopics?.length
      ? `School topics: ${input.curriculumTopics.join(", ")}`
      : "",
    `Pick exactly ${input.count} words.`,
    input.languageMode === "pure_telugu" || input.languageMode === "mixed"
      ? "Include meaningTelugu for each word."
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await geminiGenerate(
    apiKey,
    [{ text: `${DAILY_WORDS_PROMPT}\n\n${context}` }],
    undefined,
    2048,
  );
  const parsed = parseJson<{
    words: {
      word: string;
      meaning: string;
      meaningTelugu?: string;
      ipa?: string;
      example: string;
      source?: string;
    }[];
  }>(raw);
  return (parsed.words ?? []).slice(0, input.count);
}

export async function journalListenReply(
  apiKey: string,
  input: {
    childName: string;
    languageMode: LanguageMode;
    prompt: string;
    kidText: string;
  },
): Promise<string> {
  return geminiGenerate(
    apiKey,
    [
      {
        text: buildJournalListenPrompt({
          childName: input.childName,
          languageMode: input.languageMode,
          prompt: input.prompt,
          kidText: input.kidText,
        }),
      },
    ],
    undefined,
    512,
  );
}
