export function detectModeFromTask(
  task: string,
): "dictation" | "readalong" | "general" {
  const lower = task.toLowerCase();
  if (/number name|spell|write|dictation|1 to \d+|1-\d+/.test(lower)) {
    return "dictation";
  }
  if (/read|chad|page|chapter|passage/.test(lower)) {
    return "readalong";
  }
  return "general";
}
