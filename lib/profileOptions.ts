import type { CurriculumBoard, MediumOfInstruction } from "@/lib/childProfile";

export const GRADE_OPTIONS = [
  "Nursery",
  "LKG",
  "UKG",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
] as const;

export type GradeOption = (typeof GRADE_OPTIONS)[number];

export const BOARD_OPTIONS: { value: CurriculumBoard; label: string }[] = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "IB", label: "IB" },
  { value: "State", label: "State Board" },
];

export const MEDIUM_OPTIONS: { value: MediumOfInstruction; label: string }[] = [
  { value: "english_medium", label: "English medium (private school)" },
  { value: "telugu_medium", label: "Telugu medium (government school)" },
];

export const SUBJECT_OPTIONS = [
  "Maths",
  "English",
  "Telugu",
  "Hindi",
  "EVS",
  "Science",
  "Social Studies",
  "Computer",
  "Other",
] as const;

export type SubjectOption = (typeof SUBJECT_OPTIONS)[number];

/** Kid avatar bubble colors */
export const KID_COLORS = [
  "bg-sky-400",
  "bg-purple-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-amber-400",
] as const;

export function kidColor(index: number): string {
  return KID_COLORS[index % KID_COLORS.length];
}

export function kidInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
