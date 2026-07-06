"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ReviewableTask } from "@/lib/homeworkReview";
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
};

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
}: HomeworkTaskReviewProps) {
  const selectedCount = tasks.filter((t) => t.selected && t.task.trim()).length;

  function updateTask(id: string, patch: Partial<ReviewableTask>) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

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
            : "Check each subject and question. Uncheck any you don't want to do now."}
        </p>
        {extractHint && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {extractHint}
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
              className="rounded-2xl border-2 border-orange-100 bg-orange-50/50 p-3"
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
              <select
                value={task.subject}
                onChange={(e) =>
                  updateTask(task.id, { subject: e.target.value })
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
            disabled={selectedCount === 0 || starting}
            onClick={onDone}
          >
            {starting ? "Updating…" : "Done"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            disabled={selectedCount === 0 || starting}
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
