import type { LanguageMode } from "@/lib/settings";
import type { CurriculumBoard, MediumOfInstruction, TeachingMethod } from "@/lib/childProfile";
import {
  buildExamQuizPrompt,
  buildExamRevisionPrompt,
  buildParentSolutionPrompt,
  buildSystemPrompt,
  buildTeachingPlanPrompt,
  CONCEPT_EXTRACTION_PROMPT,
  PHOTO_EXTRACTION_PROMPT,
  SUMMARY_PROMPT,
  TEXT_EXTRACTION_PROMPT,
  TIMETABLE_EXTRACTION_PROMPT,
  CURRICULUM_EXTRACTION_PROMPT,
} from "./prompts";
import type { CurriculumSubject } from "./curriculumTypes";
import type { ExamQuizQuestion } from "./examTypes";
import type { ChatMessage, HomeworkTask } from "./types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type GeminiPart = {
  text?: string;
  inline_data?: { mime_type: string; data: string };
};

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

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
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
    buildSystemPrompt(childName, languageMode, grade, teachingNotes, board, bridgeRules),
  );
}

export async function extractHomeworkFromPhoto(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<{ tasks: HomeworkTask[]; confidence: string; reason?: string }> {
  const raw = await geminiGenerate(
    apiKey,
    [
      { text: PHOTO_EXTRACTION_PROMPT },
      { inline_data: { mime_type: mimeType, data: imageBase64 } },
    ],
    undefined,
    1024,
  );

  return parseJson(raw);
}

export async function extractHomeworkFromText(
  apiKey: string,
  text: string,
): Promise<{ tasks: HomeworkTask[]; confidence: string; reason?: string }> {
  const raw = await geminiGenerate(
    apiKey,
    [{ text: `${TEXT_EXTRACTION_PROMPT}\n\nStudent input:\n${text}` }],
    undefined,
    1024,
  );

  return parseJson(raw);
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
