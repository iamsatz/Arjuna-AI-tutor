import type { StoredCurriculum } from "@/lib/curriculumTypes";

export type ConceptGrade = "B" | "C" | "E";

export type EnglishConcept = {
  id: string;
  label: string;
  grade: ConceptGrade;
  focus: string;
};

export type EnglishCategory = {
  id: string;
  label: string;
  emoji: string;
  concepts: EnglishConcept[];
};

function c(
  id: string,
  label: string,
  grade: ConceptGrade,
  focus: string,
): EnglishConcept {
  return { id, label, grade, focus };
}

export const ENGLISH_CATEGORIES: EnglishCategory[] = [
  {
    id: "foundations",
    label: "Foundations",
    emoji: "🔤",
    concepts: [
      c("F1", "Letters A–Z", "B", "Recognition + sound"),
      c("F2", "Phonics — short vowels", "B", "a, e, i, o, u"),
      c("F3", "Phonics — blends", "B", "bl, st, ch, sh"),
      c("F4", "Rhyming words", "B", "cat–hat, sun–fun"),
      c("F5", "Opposites", "B", "big–small, hot–cold"),
      c("F6", "Picture talk", "B", "Describe what you see"),
    ],
  },
  {
    id: "nouns",
    label: "Nouns",
    emoji: "📦",
    concepts: [
      c("N1", "What is a noun?", "B", "Person, place, thing, idea"),
      c("N2", "Common noun", "C", "dog, city, book"),
      c("N3", "Proper noun", "C", "Rahul, Hyderabad, Monday"),
      c("N4", "Collective noun", "C", "flock, team, bunch"),
      c("N5", "Abstract noun", "C", "happiness, courage, honesty"),
      c("N6", "Material noun", "C", "gold, water, wood"),
      c("N7", "Singular & plural", "C", "-s, -es, -ies, irregular"),
      c("N8", "Countable vs uncountable", "C", "apple/apples vs water"),
      c("N9", "Gender of nouns", "C", "boy–girl, king–queen"),
      c("N10", "Possessive nouns", "C", "Rahul's bag, the dog's tail"),
      c("N11", "Compound nouns", "E", "classroom, toothbrush"),
      c("N12", "Noun as subject & object", "E", "Who did what to whom"),
    ],
  },
  {
    id: "verbs",
    label: "Verbs",
    emoji: "🏃",
    concepts: [
      c("V1", "What is a verb?", "B", "Action or state"),
      c("V2", "Action verbs", "B", "run, eat, write, think"),
      c("V3", "State / linking verbs", "C", "is, am, are, seem, feel, become"),
      c("V4", "Helping (auxiliary) verbs", "C", "have, has, had, do, does, did, will"),
      c("V5", "Main verb + helping verb", "C", "She is playing, They have finished"),
      c("V6", "Regular verbs & -ed", "C", "walk → walked, play → played"),
      c("V7", "Irregular verbs", "C", "go–went–gone, eat–ate–eaten"),
      c("V8", "Verb forms (3 forms)", "C", "base · past · past participle"),
      c("V9", "Transitive vs intransitive", "E", "I read a book vs Birds fly"),
      c("V10", "Simple present tense", "C", "I play / she plays"),
      c("V11", "Simple past tense", "C", "I played / she played"),
      c("V12", "Simple future tense", "C", "I will play / going to play"),
      c("V13", "Present continuous", "C", "am/is/are + -ing"),
      c("V14", "Past continuous", "E", "was/were + -ing"),
      c("V15", "Future continuous", "E", "will be + -ing"),
      c("V16", "Present perfect", "E", "have/has + past participle"),
      c("V17", "Past perfect", "E", "had + past participle"),
      c("V18", "Present perfect continuous", "E", "have/has been + -ing"),
      c("V19", "Modal verbs", "E", "can, could, may, might, must, should"),
      c("V20", "Imperatives (commands)", "C", "Sit down! Don't run!"),
      c("V21", "Gerunds & infinitives", "E", "Swimming is fun · I want to go"),
      c("V22", "Phrasal verbs (basic)", "E", "look after, give up, turn on"),
      c("V23", "Subject–verb agreement", "C", "One boy plays · Two boys play"),
      c("V24", "Active voice", "E", "Ram wrote the letter"),
      c("V25", "Passive voice", "E", "The letter was written by Ram"),
    ],
  },
  {
    id: "adjectives",
    label: "Adjectives",
    emoji: "🎨",
    concepts: [
      c("A1", "What is an adjective?", "B", "Describing words"),
      c("A2", "Adjectives of quality", "C", "red, tall, happy"),
      c("A3", "Adjectives of quantity", "C", "some, many, few, several"),
      c("A4", "Demonstrative adjectives", "C", "this, that, these, those"),
      c("A5", "Possessive adjectives", "C", "my, your, his, her, our, their"),
      c("A6", "Interrogative adjectives", "C", "which, what"),
      c("A7", "Degrees of comparison", "C", "tall · taller · tallest"),
      c("A8", "Order of adjectives", "E", "a beautiful small red bag"),
    ],
  },
  {
    id: "adverbs",
    label: "Adverbs",
    emoji: "⚡",
    concepts: [
      c("D1", "What is an adverb?", "C", "How, when, where"),
      c("D2", "Adverbs of manner", "C", "quickly, slowly, happily"),
      c("D3", "Adverbs of time", "C", "today, yesterday, always, never"),
      c("D4", "Adverbs of place", "C", "here, there, everywhere"),
      c("D5", "Adverbs of frequency", "C", "often, sometimes, rarely"),
      c("D6", "Adverbs of degree", "E", "very, too, almost, enough"),
      c("D7", "Comparison of adverbs", "E", "fast · faster · fastest"),
    ],
  },
  {
    id: "pronouns",
    label: "Pronouns",
    emoji: "👤",
    concepts: [
      c("P1", "Personal pronouns", "C", "I, you, he, she, it, we, they"),
      c("P2", "Possessive pronouns", "C", "mine, yours, hers, theirs"),
      c("P3", "Reflexive pronouns", "E", "myself, yourself, themselves"),
      c("P4", "Demonstrative pronouns", "C", "this, that, these, those"),
      c("P5", "Interrogative pronouns", "C", "who, whom, whose, which, what"),
      c("P6", "Relative pronouns", "E", "who, which, that, whose"),
      c("P7", "Indefinite pronouns", "E", "someone, everyone, nothing"),
      c("P8", "Pronoun–antecedent agreement", "E", "Each student has his/her book"),
      c("P9", "Replacing nouns in sentences", "C", "Avoid repetition"),
    ],
  },
  {
    id: "articles",
    label: "Articles & connectors",
    emoji: "🔗",
    concepts: [
      c("X1", "a / an / the", "B", "When to use each"),
      c("X2", "Determiners", "C", "some, any, each, every, all"),
      c("X3", "Prepositions of place", "C", "in, on, under, behind, between"),
      c("X4", "Prepositions of time", "C", "at, on, in (time)"),
      c("X5", "Prepositional phrases", "E", "in the morning, on the table"),
      c("X6", "Coordinating conjunctions", "C", "and, but, or, so, yet"),
      c("X7", "Subordinating conjunctions", "E", "because, although, unless, while"),
      c("X8", "Correlative conjunctions", "E", "either…or, neither…nor"),
    ],
  },
  {
    id: "sentences",
    label: "Sentences",
    emoji: "📝",
    concepts: [
      c("S1", "Subject & predicate", "C", "Who + what they do"),
      c("S2", "Types of sentences", "C", "statement, question, command, exclamation"),
      c("S3", "Simple sentence", "C", "One subject + one verb"),
      c("S4", "Compound sentence", "E", "Two ideas joined (and, but)"),
      c("S5", "Complex sentence", "E", "Main clause + subordinate clause"),
      c("S6", "Question formation", "C", "Do/Does/Did + subject"),
      c("S7", "Negative sentences", "C", "don't, doesn't, didn't, not"),
      c("S8", "Direct & indirect speech", "E", "He said → He told that"),
      c("S9", "Reported speech — tense shift", "E", "said → had said"),
      c("S10", "Clauses — noun, adjective, adverb", "E", "CBSE exam pattern"),
    ],
  },
  {
    id: "punctuation",
    label: "Punctuation",
    emoji: "✏️",
    concepts: [
      c("U1", "Full stop, comma, question mark", "C", ". , ?"),
      c("U2", "Exclamation & quotation marks", "C", '! " "'),
      c("U3", "Apostrophe", "C", "possessive + contractions (don't)"),
      c("U4", "Capital letters", "B", "Names, sentence start, I"),
      c("U5", "Colon & semicolon", "E", "lists, linked ideas"),
      c("U6", "Hyphen & dash", "E", "well-known, break in thought"),
    ],
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    emoji: "📖",
    concepts: [
      c("W1", "Synonyms", "C", "same meaning"),
      c("W2", "Antonyms", "C", "opposite meaning"),
      c("W3", "Homophones", "C", "hear / here"),
      c("W4", "Homonyms & homographs", "E", "bank (river/money)"),
      c("W5", "Prefixes", "E", "un-, re-, dis-, pre-"),
      c("W6", "Suffixes", "E", "-ful, -less, -ly, -ness"),
      c("W7", "Root words", "E", "struct, port, graph"),
      c("W8", "Idioms & phrases", "E", "break the ice, piece of cake"),
    ],
  },
  {
    id: "reading_writing",
    label: "Reading & writing",
    emoji: "📚",
    concepts: [
      c("R1", "Reading aloud & fluency", "B", "Pace + clarity"),
      c("R2", "Comprehension — factual", "C", "Who, what, where from passage"),
      c("R3", "Comprehension — inference", "E", "Read between the lines"),
      c("R4", "Paragraph writing", "C", "One topic, 3–4 sentences"),
      c("R5", "Story writing", "C", "Beginning, middle, end"),
      c("R6", "Formal letter", "E", "School format"),
      c("R7", "Informal letter & email", "E", "Friend format"),
      c("R8", "Essay structure", "E", "Intro, body, conclusion"),
    ],
  },
  {
    id: "figures",
    label: "Figures of speech",
    emoji: "✨",
    concepts: [
      c("G1", "Simile", "E", "as brave as a lion"),
      c("G2", "Metaphor", "E", "time is money"),
      c("G3", "Personification", "E", "the wind whispered"),
      c("G4", "Alliteration", "E", "Peter Piper"),
    ],
  },
];

export const ALL_ENGLISH_CONCEPTS: EnglishConcept[] = ENGLISH_CATEGORIES.flatMap(
  (cat) => cat.concepts,
);

export function getConceptById(id: string): EnglishConcept | undefined {
  return ALL_ENGLISH_CONCEPTS.find((c) => c.id === id);
}

export function getCategoryForConcept(conceptId: string): EnglishCategory | undefined {
  return ENGLISH_CATEGORIES.find((cat) =>
    cat.concepts.some((c) => c.id === conceptId),
  );
}

export type CurriculumConceptChip = {
  id: string;
  label: string;
  source: "curriculum";
};

/** Merge school term-plan English topics as extra chips. */
export function curriculumEnglishChips(
  curriculum: StoredCurriculum | null,
): CurriculumConceptChip[] {
  if (!curriculum) return [];
  const english = curriculum.subjects.find(
    (s) => s.subject.trim().toLowerCase() === "english",
  );
  if (!english) return [];
  return english.topics.map((t, i) => ({
    id: `cur-${i}-${t.name.slice(0, 20)}`,
    label: t.name,
    source: "curriculum" as const,
  }));
}

export const ENGLISH_SESSION_STEPS = [
  "explain",
  "examples",
  "try",
  "explain_back",
  "mini_check",
] as const;

export type EnglishSessionStep = (typeof ENGLISH_SESSION_STEPS)[number];

export function stepLabel(step: EnglishSessionStep): string {
  switch (step) {
    case "explain":
      return "Learn";
    case "examples":
      return "Examples";
    case "try":
      return "You try";
    case "explain_back":
      return "Explain back";
    case "mini_check":
      return "Mini check";
  }
}
