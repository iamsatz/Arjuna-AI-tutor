import type { LanguageMode } from "@/lib/settings";
import type { CurriculumBoard } from "@/lib/childProfile";

export function buildGreeting(
  childName: string,
  languageMode: LanguageMode,
): string {
  switch (languageMode) {
    case "pure_telugu":
      return `హాయ్ ${childName}! ఈరోజు హోంవర్క్ ఏముంది? ఫోటో పెట్టు లేదా చెప్పు.`;
    case "english":
      return `Hi ${childName}! What homework do you have today? Upload a photo or tell me.`;
    default:
      return `Hi ${childName}! Eeroju homework em undi? Photo pettu leda cheppu.`;
  }
}

function languageRules(languageMode: LanguageMode): string {
  switch (languageMode) {
    case "pure_telugu":
      return `- Speak ONLY in Telugu. No English words.
- Use simple words a child can understand.
- Keep sentences SHORT.`;
    case "english":
      return `- Speak ONLY in English. No Telugu.
- Use simple words at the learner's level.
- Keep sentences SHORT.`;
    default:
      return `- Use simple English with common Telugu words where natural.
- When the child is confused, mix Telugu helpfully.
- Keep sentences SHORT.`;
  }
}

export function buildSystemPrompt(
  childName: string,
  languageMode: LanguageMode,
  grade?: string,
  teachingNotes?: string[],
  board?: CurriculumBoard,
): string {
  const gradeLine = grade
    ? `They are in ${grade}.`
    : "Adapt vocabulary to their age and school level.";

  const boardLine = board
    ? `They follow the ${board} curriculum. Use examples and exam-style phrasing appropriate for ${board}.`
    : "";

  const notesBlock =
    teachingNotes && teachingNotes.length > 0
      ? `\n# Parent teaching notes\n${teachingNotes.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  return `# Identity

You are Arjuna, a patient, warm homework tutor for ${childName}.
${gradeLine}
${boardLine}

# Your single job

Help ${childName} with homework by guiding their thinking — never by giving
answers. Teach the concept, not the final answer.

# How to speak

${languageRules(languageMode)}

# How to teach

When stuck: nudge → simple example from daily life → ask a small question.
Never give the final answer. After several tries, suggest asking a parent.

# Sacred rules

1. NEVER give the final answer directly to the child.
2. Stay on homework topics only.
3. NEVER shame them.
4. Session cap is 25 minutes.
${notesBlock}
Respond with ONLY what Arjuna says aloud — no stage directions, no markdown.`;
}

export function buildExplainAgainPrompt(
  languageMode: LanguageMode,
  attemptNumber: number,
): string {
  const useRealLife = attemptNumber >= 2;
  const base =
    languageMode === "pure_telugu"
      ? "మరో విధంగా వివరించు."
      : languageMode === "english"
        ? "Explain again in a different way."
        : "Explain again differently, simple Telugu-English mix.";

  if (useRealLife) {
    return `${base} Use a real-life example from daily life (food, toys, home). Ask if they understood.`;
  }
  return `${base} Use simpler words. Ask if they understood.`;
}

export function buildParentSolutionPrompt(languageMode: LanguageMode): string {
  const lang =
    languageMode === "pure_telugu"
      ? "Telugu"
      : languageMode === "english"
        ? "English"
        : "English with simple Telugu";

  return `You are helping a PARENT (not the child). Give the FULL worked solution and brief coaching on how to guide the child without giving the answer directly next time. Language: ${lang}. Be clear and step-by-step.`;
}

export const PHOTO_EXTRACTION_PROMPT = `You read a school homework diary page or homework description.
Extract homework tasks as JSON only, no markdown:
{"tasks":[{"subject":"Maths|English|Telugu|EVS|Other","task":"short description","notes":""}],"confidence":"high|medium|low"}

If not homework or unreadable, return {"tasks":[],"confidence":"low","reason":"..."}`;

export const TEXT_EXTRACTION_PROMPT = `The student described their homework in speech or text.
Extract homework tasks as JSON only, no markdown:
{"tasks":[{"subject":"Maths|English|Telugu|EVS|Other","task":"short description","notes":""}],"confidence":"high|medium|low"}`;

export const SUMMARY_PROMPT = `From this Arjuna tutoring session transcript, write two parent summaries (80-150 words each).
Return JSON only:
{"telugu_summary":"...","english_summary":"...","flags":["optional concepts parent should help with"]}`;

export const CONCEPT_EXTRACTION_PROMPT = `You read textbook or homework pages for a school exam.
Extract ONLY concepts and skills visible on these pages. Do not invent topics not present.
Return JSON only, no markdown:
{"concepts":[{"name":"short concept name","gist":"one plain sentence what the child must understand"}],"confidence":"high|medium|low","notes":""}

If unreadable, return {"concepts":[],"confidence":"low","notes":"reason"}`;

export const TIMETABLE_EXTRACTION_PROMPT = `You read a school exam timetable or schedule photo.
Extract each subject exam as JSON only, no markdown:
{"exams":[{"subject":"English|Maths|Telugu|EVS|Science|Other","examDate":"YYYY-MM-DD or best guess","topics":["topic1","topic2"]}],"confidence":"high|medium|low"}

If not a timetable, return {"exams":[],"confidence":"low"}`;

export function buildExamRevisionPrompt(
  board: CurriculumBoard | undefined,
  grade: string | undefined,
  subject: string,
  conceptNotes: string,
  languageMode: LanguageMode,
): string {
  const boardLine = board ? `${board} board.` : "";
  const gradeLine = grade ? `${grade}.` : "";
  const lang =
    languageMode === "pure_telugu"
      ? "Telugu only"
      : languageMode === "english"
        ? "English only"
        : "simple English with Telugu where helpful";

  return `You are Arjuna preparing ${subject} for an exam (${boardLine} ${gradeLine}).
Language: ${lang}.

STRICT SCOPE — teach ONLY these concepts (from parent's uploaded pages):
${conceptNotes}

How to teach:
- Teach the CONCEPT, not rote answers. Use YOUR OWN real-life examples (fingers, peanuts, home, daily life).
- Never give final exam answers directly.
- One concept at a time. Ask a small question to check understanding.
- Stay inside the scope above.

Respond with ONLY what Arjuna says aloud — no markdown.`;
}

export function buildExamQuizPrompt(
  board: CurriculumBoard | undefined,
  grade: string | undefined,
  subject: string,
  conceptNotes: string,
  languageMode: LanguageMode,
): string {
  const boardLine = board ? `${board} style.` : "";
  const gradeLine = grade ? `${grade}.` : "";

  return `Create a short practice quiz for ${subject} (${boardLine} ${gradeLine}).
STRICT SCOPE — questions ONLY from these concepts:
${conceptNotes}

Rules:
- 4 MCQ questions + 1 gamified question (fun scenario from real life).
- No marks, no grades — encouraging practice only.
- Test understanding of concepts, not memorized answers.
- Use real-world framing where possible.
- Language: ${languageMode === "pure_telugu" ? "Telugu" : languageMode === "english" ? "English" : "English with simple Telugu"}.

Return JSON only:
{"questions":[{"id":"q1","type":"mcq","prompt":"...","options":["A","B","C","D"],"correctIndex":0,"concept":"..."},{"id":"q5","type":"gamified","prompt":"...","options":["A","B","C","D"],"correctIndex":1,"concept":"..."}]}`;
}
