import type { MediumOfInstruction, TeachingMethod } from "@/lib/childProfile";

export const METHOD_OPTIONS: { value: TeachingMethod; label: string }[] = [
  { value: "experiential", label: "Experiential / real-life (default)" },
  { value: "nep_ncf", label: "NEP 2020 / NCF competency-based" },
  { value: "activity_based", label: "Activity-Based Learning (ABL)" },
  { value: "montessori", label: "Montessori" },
  { value: "inquiry_ib", label: "Inquiry-based (IB PYP style)" },
  { value: "play_way", label: "Play-Way / Kindergarten" },
  { value: "traditional", label: "Traditional / textbook" },
];

export const MEDIUM_OPTIONS: { value: MediumOfInstruction; label: string }[] = [
  { value: "english_medium", label: "English medium (private school)" },
  { value: "telugu_medium", label: "Telugu medium (government school)" },
];
