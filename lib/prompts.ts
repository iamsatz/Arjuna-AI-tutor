import type { LanguageMode } from "@/lib/settings";
import type {
  CurriculumBoard,
  MediumOfInstruction,
  TeachingMethod,
} from "@/lib/childProfile";
import { bridgeSubjectFor } from "@/lib/childProfile";
import { bridgeSpeechLanguage } from "@/lib/bridgeSubject";

const METHOD_GUIDANCE: Record<TeachingMethod, string> = {
  nep_ncf:
    "NEP 2020 / NCF competency-based: focus on understanding and real-life competencies, not rote.",
  activity_based:
    "Activity-Based Learning: teach through small hands-on activities the child can do.",
  montessori:
    "Montessori: self-paced, concrete materials first, let the child discover the rule.",
  inquiry_ib:
    "IB inquiry-based: start with a question, let the child explore and conclude.",
  play_way: "Play-Way: teach through play, games and stories.",
  experiential:
    "Experiential / real-life: use everyday objects (fingers, peanuts, toys, home items).",
  traditional:
    "Traditional/textbook: clear step-by-step explanation in the school's standard way.",
};

export function methodGuidance(method?: TeachingMethod): string {
  return METHOD_GUIDANCE[method ?? "experiential"];
}

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

export function buildBridgeSubjectRules(
  subject: string | undefined,
  medium: MediumOfInstruction | undefined,
): string {
  if (!subject?.trim()) return "";
  const bridge = bridgeSubjectFor(medium);
  if (subject.trim().toLowerCase() !== bridge.toLowerCase()) return "";

  const bridgeLang = bridgeSpeechLanguage(medium);
  const scriptHint =
    bridgeLang === "hi-IN"
      ? "Devanagari script for Hindi words"
      : "English spelling for English words";

  return `
# Bridge subject: ${bridge}
- Explain in simple Telugu + English (Telugu-medium kids at home cannot pronounce ${bridge} correctly).
- Wrap EVERY ${bridge} word or short phrase in speech markers: [[${bridgeLang}]]${scriptHint}[[/]]
- Right after each marked word, add Telugu transliteration in parentheses and a short Telugu meaning.
- Example: [[hi-IN]]नमस्ते[[/]] (namaste) ante hello.
- Keep explanations concept-first; the marked part is what must be spoken in correct ${bridge} pronunciation.`;
}

export function buildSystemPrompt(
  childName: string,
  languageMode: LanguageMode,
  grade?: string,
  teachingNotes?: string[],
  board?: CurriculumBoard,
  bridgeRules?: string,
  method?: TeachingMethod,
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

  const methodBlock =
    method === "experiential" || !method
      ? `
# Interactive diary tutor (Method 1)
- One micro-task at a time. Confirm the task before teaching.
- Ask questions back — never lecture. Check: "Tell me in your words what we did."
- When stuck: nudge → worked example with different numbers → tiny story with ${childName} as hero → suggest asking a parent.
- Use diary/term context when available. Focus on understanding the concept, not finishing fast.`
      : `\n# Teaching method\n${methodGuidance(method)}`;

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
${methodBlock}

# Sacred rules

1. NEVER give the final answer directly to the child.
2. Stay on homework topics only.
3. NEVER shame them.
4. Session cap is 25 minutes.
${bridgeRules ?? ""}
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

export const PHOTO_EXTRACTION_PROMPT = `You read a student's school DIARY or homework pages (photos or PDF pages).
Extract BOTH:
1) termPlan — subjects/topics listed for the term (if visible on these pages; else null)
2) todayTasks — tonight's homework items

Return JSON only, no markdown:
{
  "termPlan": {
    "term": "Term 1 or similar",
    "subjects": [{"subject":"Maths|English|Telugu|Hindi|EVS|Science|Other","topics":["topic1","topic2"]}]
  } | null,
  "todayTasks": [{"subject":"Maths|English|Telugu|Hindi|EVS|Science|Other","task":"short description","notes":"","subjectUncertain":false}],
  "teacherNote": "optional note from teacher",
  "confidence": "high|medium|low"
}

Set subjectUncertain true when the subject label is missing, the page mixes subjects, or you are guessing the subject.
If only daily homework is visible, set termPlan to null and fill todayTasks.
If partially readable, return what you can with confidence medium/low.`;

export const TEXT_EXTRACTION_PROMPT = `The student or parent described homework in text (diary note, spoken transcript, or typed list).
Extract EVERY separate homework item as its own task with the correct subject.
Return JSON only, no markdown:
{"tasks":[{"subject":"Maths|English|Telugu|Hindi|EVS|Science|Social Studies|Computer|Other","task":"short description","notes":"","subjectUncertain":false}],"confidence":"high|medium|low"}

Set subjectUncertain true when the subject is missing or you are guessing.`;

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

export const CURRICULUM_EXTRACTION_PROMPT = `You read a school term plan, syllabus, or curriculum document (PDF pages or photos).
Extract the structured syllabus for ONE term. Do not invent subjects or topics not present in the document.
Return JSON only, no markdown:
{"term":"Term 1 or First Term or similar","subjects":[{"subject":"English|Maths|Telugu|EVS|Science|Hindi|Social|Other","topics":[{"name":"topic name","resources":"optional pages/chapters/notes from doc"}]}],"confidence":"high|medium|low","notes":""}

If unreadable or not a curriculum document, return {"term":"","subjects":[],"confidence":"low","notes":"reason"}`;

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

export function buildTeachingPlanPrompt(
  board: CurriculumBoard | undefined,
  method: TeachingMethod | undefined,
  grade: string | undefined,
  subject: string,
  topic: string,
  medium?: MediumOfInstruction,
): string {
  const boardLine = board ? `${board} board` : "the school's board";
  const gradeLine = grade ? grade : "the appropriate grade";
  const bridge = bridgeSubjectFor(medium);
  const isBridge = subject.trim().toLowerCase() === bridge.toLowerCase();

  const bridgeBlock = isBridge
    ? `
This is a BRIDGE subject (${bridge}): parents at home often cannot pronounce it.
Include in the plan:
- "bridgeWords": [{"script":"word in ${bridge === "Hindi" ? "Devanagari" : "English"}","teluguTranslit":"...","meaningTe":"..."}]
- Teach concept-first; explain in Telugu+English; mark words for ${bridgeSpeechLanguage(medium)} voice.`
    : "";

  return `You are an expert teacher researching how to teach ONE topic, ONCE, so any tutor can reuse it.

Topic: "${topic}" (subject: ${subject})
Audience: a ${gradeLine} child following ${boardLine}.
Teaching method to follow: ${methodGuidance(method)}
${bridgeBlock}

Write a compact, reusable teaching plan that teaches the CONCEPT (never just the answer), in the style above, using real-life framing kids relate to.

Return JSON only, no markdown:
{
  "topic": "${topic}",
  "summary": "one plain sentence: what the child must understand",
  "realLifeHooks": ["2-3 everyday examples/analogies"],
  "steps": ["3-5 short teaching steps, concept-first"],
  "commonMistakes": ["2-3 typical errors kids make"],
  "checkQuestions": ["2-3 simple questions to check understanding (no answers)"]${isBridge ? ',\n  "bridgeWords": [{"script":"...","teluguTranslit":"...","meaningTe":"..."}]' : ""}
}`;
}

export function buildVerifyAnswerPrompt(
  subject: string,
  task: string,
  grade: string | undefined,
  languageMode: LanguageMode,
): string {
  const lang =
    languageMode === "pure_telugu"
      ? "Telugu"
      : languageMode === "english"
        ? "English"
        : "English with simple Telugu";

  return `You are Arjuna, a homework tutor checking a child's written work.

Homework question (${subject}${grade ? `, ${grade}` : ""}):
${task}

Read the student's handwritten/typed answer in the image. Decide if their work is CORRECT for this question (allow minor notation differences; focus on the right method and final answer).

Rules:
- Do NOT reveal the full correct solution in feedback.
- If wrong, give a SHORT hint pointing to the mistake — not the final answer.
- Be encouraging. Language: ${lang}.

Return JSON only:
{"correct":true|false,"feedback":"2-3 sentences to the child","hint":"only if wrong — one small nudge"}`;
}

export function buildHintOnlyPrompt(languageMode: LanguageMode): string {
  return languageMode === "pure_telugu"
    ? "Give ONLY a very short hint in Telugu+English. Do NOT give the final answer or full solution."
    : languageMode === "english"
      ? "Give ONLY a very short hint. Do NOT give the final answer or full solution."
      : "Give ONLY a chinna hint in Telugu+English. Final answer ivvakandi.";
}
