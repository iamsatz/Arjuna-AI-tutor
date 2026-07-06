import type { StoredCurriculum } from "@/lib/curriculumTypes";
import {
  ALL_ENGLISH_CONCEPTS,
  curriculumEnglishChips,
  getConceptById,
  type EnglishConcept,
} from "@/lib/englishConceptMap";
import type { TaskHistoryEntry } from "@/lib/taskHistoryStore";

export type RecommendedConcept = EnglishConcept & {
  reason: string;
  priority: number;
};

const CONCEPT_KEYWORDS: Record<string, string[]> = {
  N3: ["proper noun", "proper nouns", "capital letter name"],
  N2: ["common noun", "noun"],
  N1: ["noun", "naming word"],
  V10: ["present tense", "simple present"],
  V11: ["past tense", "simple past"],
  V13: ["continuous", "ing form"],
  V16: ["perfect tense", "has have"],
  V19: ["modal", "can must should"],
  C1: ["proper noun"],
  P1: ["pronoun"],
  A1: ["adjective", "describing word"],
  D1: ["adverb"],
  S8: ["direct speech", "indirect speech"],
  W3: ["homophone"],
};

function textMatchesConcept(text: string, conceptId: string): boolean {
  const keywords = CONCEPT_KEYWORDS[conceptId];
  if (!keywords) return false;
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function findConceptsInText(text: string): EnglishConcept[] {
  const hits: EnglishConcept[] = [];
  for (const concept of ALL_ENGLISH_CONCEPTS) {
    if (textMatchesConcept(text, concept.id)) {
      hits.push(concept);
    }
    if (
      text.toLowerCase().includes(concept.label.toLowerCase()) ||
      text.toLowerCase().includes(concept.focus.toLowerCase().slice(0, 12))
    ) {
      hits.push(concept);
    }
  }
  const seen = new Set<string>();
  return hits.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export function buildRecommendedConcepts(input: {
  weakTopics?: string[];
  taskHistory?: TaskHistoryEntry[];
  curriculum?: StoredCurriculum | null;
  limit?: number;
}): RecommendedConcept[] {
  const limit = input.limit ?? 6;
  const scored = new Map<string, RecommendedConcept>();

  function add(concept: EnglishConcept | undefined, reason: string, priority: number) {
    if (!concept) return;
    const existing = scored.get(concept.id);
    if (!existing || priority > existing.priority) {
      scored.set(concept.id, { ...concept, reason, priority });
    } else if (existing && priority === existing.priority) {
      existing.reason = `${existing.reason}; ${reason}`;
    }
  }

  for (const topic of input.weakTopics ?? []) {
    for (const c of findConceptsInText(topic)) {
      add(c, `Tricky before: ${topic}`, 3);
    }
  }

  for (const entry of input.taskHistory ?? []) {
    if (entry.subject.trim().toLowerCase() !== "english") continue;
    const blob = `${entry.task} ${entry.notes ?? ""} ${entry.outcomeNote ?? ""}`;
    const struggled =
      entry.outcomeNote?.toLowerCase().includes("struggled") ||
      entry.outcomeNote?.toLowerCase().includes("doubt");
    for (const c of findConceptsInText(blob)) {
      add(
        c,
        struggled
          ? `Homework was hard: ${entry.task.slice(0, 40)}`
          : `From homework: ${entry.task.slice(0, 40)}`,
        struggled ? 4 : 2,
      );
    }
  }

  for (const chip of curriculumEnglishChips(input.curriculum ?? null)) {
    for (const c of findConceptsInText(chip.label)) {
      add(c, `School plan: ${chip.label}`, 2);
    }
  }

  return Array.from(scored.values())
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

export function conceptIdFromQuery(query: string): EnglishConcept | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const direct = ALL_ENGLISH_CONCEPTS.find(
    (c) =>
      c.label.toLowerCase() === q ||
      c.label.toLowerCase().includes(q) ||
      q.includes(c.label.toLowerCase()),
  );
  if (direct) return direct;
  const matches = findConceptsInText(query);
  return matches[0];
}

export function resolveConceptRef(ref: string): EnglishConcept | undefined {
  return getConceptById(ref) ?? conceptIdFromQuery(ref);
}
