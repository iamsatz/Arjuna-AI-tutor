"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ReviewableTask } from "@/lib/homeworkReview";
import { SUBJECT_OPTIONS } from "@/lib/profileOptions";

type HomeworkTaskReviewProps = {
  tasks: ReviewableTask[];
  extractHint?: string;
  onChange: (tasks: ReviewableTask[]) => void;
  onAddManual: () => void;
  onBack: () => void;
  onStart: () => void;
  starting?: boolean;
};

export function HomeworkTaskReview({
  tasks,
  extractHint,
  onChange,
  onAddManual,
  onBack,
  onStart,
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
          Review homework tasks
        </p>
        <p className="mt-1 text-xs text-arjuna-muted">
          Check each subject and question. Uncheck any you don&apos;t want to do
          now.
        </p>
        {extractHint && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {extractHint}
          </p>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-arjuna-muted">
          Couldn&apos;t read tasks automatically. Add them manually below.
        </p>
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

      <Button variant="secondary" className="w-full" onClick={onAddManual}>
        + Add task manually
      </Button>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={selectedCount === 0 || starting}
          onClick={onStart}
        >
          {starting
            ? "Starting…"
            : `Start selected (${selectedCount})`}
        </Button>
      </div>
    </Card>
  );
}
