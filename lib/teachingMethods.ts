import type { TeachingMethod } from "@/lib/childProfile";

export type TeachingMethodOption = {
  id: TeachingMethod;
  label: string;
  description: string;
  available: boolean;
};

/** Method 1 live; 2–4 visible but disabled until WoZ validation. */
export const TEACHING_METHOD_OPTIONS: TeachingMethodOption[] = [
  {
    id: "experiential",
    label: "Interactive diary tutor",
    description:
      "Reads diary, one micro-task at a time, questions back, never gives answers.",
    available: true,
  },
  {
    id: "play_way",
    label: "Story-first",
    description: "Starts every concept as a short story with the child's name.",
    available: false,
  },
  {
    id: "activity_based",
    label: "Play warm-up",
    description: "Quick game before written work to help the child settle in.",
    available: false,
  },
  {
    id: "inquiry_ib",
    label: "Inquiry questions",
    description: "Scaffolded ask-back questions; child discovers the idea.",
    available: false,
  },
];

export const DEFAULT_TEACHING_METHOD: TeachingMethod = "experiential";

export function normalizeTeachingMethod(
  method?: TeachingMethod | null,
): TeachingMethod {
  const opt = TEACHING_METHOD_OPTIONS.find((o) => o.id === method);
  if (opt?.available) return opt.id;
  return DEFAULT_TEACHING_METHOD;
}
