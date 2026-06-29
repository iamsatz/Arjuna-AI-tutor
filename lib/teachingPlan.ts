import { getOrCreate } from "@/lib/memory";
import { normalizeTopicKey, type CurriculumBoard, type MediumOfInstruction, type TeachingMethod } from "@/lib/childProfile";
import { generateTeachingPlan, type TeachingPlan } from "@/lib/gemini";

export type { TeachingPlan } from "@/lib/gemini";

type GetTeachingPlanParams = {
  apiKey: string;
  scopeKey: string;
  subject: string;
  topic: string;
  board?: CurriculumBoard;
  method?: TeachingMethod;
  grade?: string;
  medium?: MediumOfInstruction;
};

/**
 * Research-once-reuse-forever teaching plan.
 * First call for a (scope, subject, topic) hits AI; every later call (any kid
 * in the same scope) is served free from arjuna_memory.
 */
export async function getTeachingPlan(
  params: GetTeachingPlanParams,
): Promise<{ plan: TeachingPlan; cached: boolean }> {
  const topicKey = normalizeTopicKey([params.subject, params.topic]);

  const { value, cached } = await getOrCreate<TeachingPlan>({
    schoolKey: params.scopeKey,
    kind: "plan",
    topicKey,
    generate: () =>
      generateTeachingPlan(params.apiKey, {
        board: params.board,
        method: params.method,
        grade: params.grade,
        subject: params.subject,
        topic: params.topic,
        medium: params.medium,
      }),
  });

  return { plan: value, cached };
}

/** Compact text form of a plan for injecting into a tutor prompt. */
export function teachingPlanToNotes(plan: TeachingPlan): string {
  const lines: string[] = [];
  if (plan.summary) lines.push(`Goal: ${plan.summary}`);
  if (plan.realLifeHooks.length)
    lines.push(`Real-life hooks: ${plan.realLifeHooks.join("; ")}`);
  if (plan.steps.length) lines.push(`Teaching steps: ${plan.steps.join(" -> ")}`);
  if (plan.commonMistakes.length)
    lines.push(`Watch for mistakes: ${plan.commonMistakes.join("; ")}`);
  return lines.join("\n");
}
