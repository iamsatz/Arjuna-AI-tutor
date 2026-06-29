import { getCurriculumBySchoolKey } from "@/lib/curriculumStore";
import { getOrCreate } from "@/lib/memory";
import { getTeachingPlan, teachingPlanToNotes } from "@/lib/teachingPlan";
import type { CurriculumSubject } from "@/lib/curriculumTypes";

/**
 * School Agent: the shared knowledge boundary for a scope (school+grade or a
 * grade+board default). Wraps curriculum lookup, the research-once teaching
 * plan, and the cache-on-miss helper so routes talk to one named agent.
 */

export { getTeachingPlan, teachingPlanToNotes };
export { getOrCreate } from "@/lib/memory";

/** Topics the school teaches for a subject (empty if no curriculum uploaded). */
export async function getScope(
  scopeKey: string,
  subject?: string,
): Promise<{ subjects: CurriculumSubject[]; topics: string[] }> {
  const curriculum = await getCurriculumBySchoolKey(scopeKey);
  if (!curriculum) return { subjects: [], topics: [] };

  if (!subject) {
    return { subjects: curriculum.subjects, topics: [] };
  }

  const match = curriculum.subjects.find(
    (s) => s.subject.toLowerCase() === subject.toLowerCase(),
  );
  return {
    subjects: curriculum.subjects,
    topics: match ? match.topics.map((t) => t.name) : [],
  };
}
