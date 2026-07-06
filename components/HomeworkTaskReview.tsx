"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ReviewableTask } from "@/lib/homeworkReview";
import { allSubjectsConfirmed, markSubjectConfirmed } from "@/lib/homeworkReview";
import { formatCompletedAt } from "@/lib/duplicateTasks";
import { SUBJECT_OPTIONS } from "@/lib/profileOptions";

type HomeworkTaskReviewProps = {
  tasks: ReviewableTask[];
  extractHint?: string;
  editMode?: boolean;
  onChange: (tasks: ReviewableTask[]) => void;
  onAddManual: () => void;
  onAddPage: () => void;
  onBack: () => void;
  onStart: () => void;
  onDone?: () => void;
  starting?: boolean;
  onSpeakSubjectQuestion?: (task: ReviewableTask, index: number) => void;
  onSpeakDuplicate?: (task: ReviewableTask, index: number) => void;
  onDismissDuplicate?: (id: string) => void;
  onSkipDuplicate?: (id: string) => void;
};

const QUICK_SUBJECTS = SUBJECT_OPTIONS.filter((s) => s !== "Other");

export function HomeworkTaskReview({
  tasks,
  extractHint,
  editMode,
  onChange,
  onAddManual,
  onAddPage,
  onBack,
  onStart,
  onDone,
  starting,
  onSpeakSubjectQuestion,
  onSpeakDuplicate,
  onDismissDuplicate,
  onSkipDuplicate,
}: HomeworkTaskReviewProps) {
  const selectedCount = tasks.filter((t) => t.selected && t.task.trim()).length;
  const canStart = selectedCount > 0 && allSubjectsConfirmed(tasks);

  function updateTask(id: string, patch: Partial<ReviewableTask>) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function confirmSubject(id: string, subject: string) {
    onChange(markSubjectConfirmed(tasks, id, subject));
  }

  const duplicateCount = tasks.filter((t) => t.duplicateOf).length;

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-display text-lg font-bold text-arjuna-text">
          {editMode
            ? "Edit homework tasks"
            : "Here's what I read — fix anything that's wrong"}
        </p>
        <p className="mt-1 text-xs text-arjuna-muted">
          {editMode
            ? "Change subjects, add pages, or fix anything Arjuna got wrong."
            : "Check each subject and question. Tap a subject chip if Arjuna isn't sure."}
        </p>
        {extractHint && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {extractHint}
          </p>
        )}
        {duplicateCount > 0 && (
          <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
            {duplicateCount} task{duplicateCount > 1 ? "s" : ""} look like homework
            you already did — skipped by default. Tap &quot;Do again anyway&quot; to
            include.
          </p>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-arjuna-muted">
            Type each homework item below, then tap Start teaching.
          </p>
          <Button variant="secondary" className="w-full" onClick={onAddManual}>
            + Add your first task
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={`rounded-2xl border-2 p-3 ${
                task.duplicateOf
                  ? "border-sky-200 bg-sky-50/60"
                  : task.subjectUncertain && !task.subjectConfirmed
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-orange-100 bg-orange-50/50"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-sm font-bold text-white">
                  {index + 1}
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={task.selected}
                    onChange={(e) =>
                      updateTask(task.id, { selected: e.target.checked })
                    }
                  />
                  Do now
                </label>
              </div>

              {task.duplicateOf && (
                <div className="mb-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-sky-900">
                  <p className="font-semibold">
                    Already worked on ·{" "}
                    {formatCompletedAt(task.duplicateOf.completedAt)}
                  </p>
                  {task.duplicateOf.notes && (
                    <p className="mt-1">Note: {task.duplicateOf.notes}</p>
                  )}
                  {task.duplicateOf.outcomeNote && (
                    <p className="mt-0.5 text-arjuna-muted">
                      Last time: {task.duplicateOf.outcomeNote}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-sky-200 bg-white px-2 py-1 font-semibold"
                      onClick={() => onSkipDuplicate?.(task.id)}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-arjuna-primary px-2 py-1 font-semibold text-white"
                      onClick={() => onDismissDuplicate?.(task.id)}
                    >
                      Do again anyway
                    </button>
                    {onSpeakDuplicate && (
                      <button
                        type="button"
                        className="rounded-lg border border-sky-200 bg-white px-2 py-1"
                        aria-label="Read duplicate notice aloud"
                        onClick={() => onSpeakDuplicate(task, index)}
                      >
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              )}

              {task.subjectUncertain && !task.subjectConfirmed && (
                <div className="mb-2 rounded-xl bg-white/80 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-900">
                    Which subject is this?
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_SUBJECTS.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-arjuna-text hover:bg-amber-100"
                        onClick={() => confirmSubject(task.id, subject)}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                  {onSpeakSubjectQuestion && (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-arjuna-primaryDark underline"
                      onClick={() => onSpeakSubjectQuestion(task, index)}
                    >
                      🔊 Hear the question
                    </button>
                  )}
                </div>
              )}

              <select
                value={task.subject}
                onChange={(e) =>
                  updateTask(task.id, {
                    subject: e.target.value,
                    subjectUncertain: false,
                    subjectConfirmed: true,
                  })
                }
                className="mb-2 w-full rounded-xl border-2 border-orange-100 bg-white p-2 text-sm"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <textarea
                value={task.task}
                onChange={(e) => updateTask(task.id, { task: e.target.value })}
                placeholder="What is the homework?"
                className="mb-2 w-full rounded-xl border-2 border-orange-100 bg-white p-2 text-sm"
                rows={2}
              />
              <input
                type="text"
                value={task.notes ?? ""}
                onChange={(e) =>
                  updateTask(task.id, { notes: e.target.value })
                }
                placeholder="Note (optional): what is this? why?"
                className="w-full rounded-xl border-2 border-orange-100 bg-white p-2 text-xs"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="flex-1" onClick={onAddPage}>
          📷 Add another page
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onAddManual}>
          + Add task manually
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onBack}>
          {editMode ? "Cancel" : "Back"}
        </Button>
        {editMode ? (
          <Button
            size="lg"
            className="flex-1"
            disabled={!canStart || starting}
            onClick={onDone}
          >
            {starting ? "Updating…" : "Done"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            disabled={!canStart || starting}
            onClick={onStart}
          >
            {starting
              ? "Starting…"
              : `Start teaching (${selectedCount})`}
          </Button>
        )}
      </div>
    </Card>
  );
}
