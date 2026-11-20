import { getTeachingPlan, teachingPlanToNotes } from "@/lib/teachingPlan";

/**
 * School Agent: the shared knowledge boundary for a scope (school+grade or a
 * grade+board default). Wraps curriculum lookup, the research-once teaching
 * plan, and the cache-on-miss helper so routes talk to one named agent.
 */

export { getTeachingPlan, teachingPlanToNotes };
