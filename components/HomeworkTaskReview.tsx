"use client";

import { useState } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(editMode ?? false);

  const selectedCount = tasks.filter((t) => t.selected && t.task.trim()).length;
  const canStart = selectedCount > 0 && allSubjectsConfirmed(tasks);

  function updateTask(id: string, patch: Partial<ReviewableTask>) {
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function confirmSubject(id: string, subject: string) {
    onChange(markSubjectConfirmed(tasks, id, subject));
    // Auto-advance after subject is confirmed
    if (currentIndex < tasks.length - 1) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 350);
    }
  }

  const visibleTasks = tasks.filter((t) => t.task.trim());
  const currentTask = visibleTasks[currentIndex];
  const isLastCard = currentIndex >= visibleTasks.length - 1;

  // ── Edit / show-all mode ──────────────────────────────────────────────────
  if (editMode || showAll) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-bold text-arjuna-text">
            {editMode ? "Edit tasks" : "All tasks"}
          </p>
          {!editMode && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-xs font-semibold text-arjuna-primaryDark underline"
            >
              Card view
            </button>
          )}
        </div>

        {extractHint && (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {extractHint}
          </p>
        )}

        <ul className="space-y-3">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={`rounded-2xl border-2 p-3 ${
                task.duplicateOf
                  ? "border-sky-200 bg-sky-50/60"
                  : task.subjectUncertain && !task.subjectConfirmed
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-arjuna-border bg-white"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-xs font-bold text-white">
                  {index + 1}
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-arjuna-text">
                  <input
                    type="checkbox"
                    checked={task.selected}
                    onChange={(e) =>
                      updateTask(task.id, { selected: e.target.checked })
                    }
                  />
                  Include
                </label>
              </div>

              {/* Subject chips */}
              {task.subjectUncertain && !task.subjectConfirmed && (
                <div className="mb-2">
                  <p className="mb-1.5 text-xs font-semibold text-arjuna-primaryDark">Which subject?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SUBJECTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => confirmSubject(task.id, s)}
                        className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-arjuna-text active:bg-arjuna-primaryLight"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
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
                className="mb-2 w-full rounded-xl border border-arjuna-border bg-white p-2 text-sm"
              >
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <textarea
                value={task.task}
                onChange={(e) => updateTask(task.id, { task: e.target.value })}
                placeholder="What is the homework?"
                className="mb-2 w-full rounded-xl border border-arjuna-border bg-white p-2 text-sm"
                rows={2}
              />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="flex-1" onClick={onAddPage}>
            Add another page
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onAddManual}>
            + Add task
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onBack}>
            {editMode ? "Cancel" : "Back"}
          </Button>
          {editMode ? (
            <Button size="lg" className="flex-1" disabled={!canStart || starting} onClick={onDone}>
              {starting ? "Updating..." : "Done"}
            </Button>
          ) : (
            <Button size="lg" className="flex-1" disabled={!canStart || starting} onClick={onStart}>
              {starting ? "Starting..." : `Start (${selectedCount})`}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (visibleTasks.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-arjuna-primaryLight">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primary" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <p className="font-display text-lg font-bold text-arjuna-text">
            No tasks found
          </p>
          <p className="text-sm text-arjuna-muted">
            Add tasks manually or scan another page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onAddPage}>
            Scan a page
          </Button>
          <Button className="flex-1" onClick={onAddManual}>
            + Add task
          </Button>
        </div>
        <button type="button" onClick={onBack} className="w-full text-sm text-arjuna-muted underline">
          Back
        </button>
      </Card>
    );
  }

  // ── One-at-a-time card flow ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-arjuna-primaryDark"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-semibold text-arjuna-muted underline"
        >
          See all
        </button>
      </div>

      {/* Arjuna found X tasks banner */}
      <div className="rounded-3xl bg-arjuna-primary px-5 py-4 shadow-chunky">
        <p className="font-display text-lg font-bold text-white">
          {visibleTasks.length === 1
            ? "I found 1 task!"
            : `I found ${visibleTasks.length} tasks!`}
        </p>
        <p className="mt-1 text-sm text-white/80">
          Let me confirm each one with you.
        </p>
        {extractHint && (
          <p className="mt-2 rounded-2xl bg-white/20 px-3 py-2 text-xs text-white/90">
            {extractHint}
          </p>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2" aria-label={`Task ${currentIndex + 1} of ${visibleTasks.length}`}>
        {visibleTasks.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            aria-label={`Go to task ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-6 bg-arjuna-primary"
                : i < currentIndex
                  ? "w-2.5 bg-arjuna-primary/40"
                  : "w-2.5 bg-arjuna-border"
            }`}
          />
        ))}
      </div>

      {/* Current task card */}
      {currentTask && (
        <Card
          key={currentTask.id}
          className={`space-y-4 transition-all duration-200 ${
            currentTask.duplicateOf
              ? "border-sky-300 bg-sky-50/40"
              : currentTask.subjectUncertain && !currentTask.subjectConfirmed
                ? "border-amber-300"
                : "border-arjuna-border"
          }`}
        >
          {/* Task number + text */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-sm font-bold text-white">
              {currentIndex + 1}
            </span>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-arjuna-muted">
                Task {currentIndex + 1} of {visibleTasks.length}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-arjuna-text">
                {currentTask.task}
              </p>
            </div>
          </div>

          {/* Duplicate notice */}
          {currentTask.duplicateOf && (
            <div className="rounded-2xl bg-sky-100 px-3 py-3">
              <p className="text-xs font-semibold text-sky-900">
                Already done · {formatCompletedAt(currentTask.duplicateOf.completedAt)}
              </p>
              {currentTask.duplicateOf.outcomeNote && (
                <p className="mt-1 text-xs text-sky-700">
                  Last time: {currentTask.duplicateOf.outcomeNote}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onSkipDuplicate?.(currentTask.id)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 active:scale-95"
                >
                  Skip it
                </button>
                <button
                  type="button"
                  onClick={() => onDismissDuplicate?.(currentTask.id)}
                  className="rounded-xl bg-arjuna-primary px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
                >
                  Do again
                </button>
              </div>
            </div>
          )}

          {/* Subject — chips first, then fine-tune dropdown */}
          <div>
            <p className="mb-2 text-sm font-semibold text-arjuna-text">
              {currentTask.subjectUncertain && !currentTask.subjectConfirmed
                ? "Which subject is this?"
                : "Subject"}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUBJECTS.map((s) => {
                const isActive = currentTask.subject === s && currentTask.subjectConfirmed;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => confirmSubject(currentTask.id, s)}
                    className={`rounded-2xl border-2 px-3 py-1.5 font-display text-sm font-bold transition active:scale-95 ${
                      isActive
                        ? "border-arjuna-primary bg-arjuna-primary text-white shadow-chunky"
                        : "border-arjuna-border bg-white text-arjuna-text hover:border-arjuna-primary/40"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => confirmSubject(currentTask.id, "Other")}
                className={`rounded-2xl border-2 px-3 py-1.5 font-display text-sm font-bold transition active:scale-95 ${
                  currentTask.subject === "Other" && currentTask.subjectConfirmed
                    ? "border-arjuna-primary bg-arjuna-primary text-white"
                    : "border-arjuna-border bg-white text-arjuna-text"
                }`}
              >
                Other
              </button>
            </div>

            {onSpeakSubjectQuestion && currentTask.subjectUncertain && !currentTask.subjectConfirmed && (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-arjuna-primaryDark underline"
                onClick={() => onSpeakSubjectQuestion(currentTask, currentIndex)}
              >
                Hear the question
              </button>
            )}
          </div>

          {/* Include toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-arjuna-text">
            <input
              type="checkbox"
              checked={currentTask.selected}
              onChange={(e) => updateTask(currentTask.id, { selected: e.target.checked })}
              className="h-4 w-4 accent-arjuna-primary"
            />
            Include this task
          </label>

          {/* Nav buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex-1 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-sm font-bold text-arjuna-text disabled:opacity-30 active:scale-95"
            >
              Previous
            </button>
            {isLastCard ? (
              <button
                type="button"
                disabled={!canStart || starting}
                onClick={onStart}
                className="flex-1 rounded-2xl bg-arjuna-primary py-3 font-display text-sm font-bold text-white shadow-chunky disabled:opacity-40 active:scale-95"
              >
                {starting ? "Starting..." : `Start (${selectedCount})`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="flex-1 rounded-2xl bg-arjuna-primary py-3 font-display text-sm font-bold text-white shadow-chunky active:scale-95"
              >
                Next
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Footer actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddPage}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-sm font-bold text-arjuna-text active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Add page
        </button>
        <button
          type="button"
          onClick={onAddManual}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-sm font-bold text-arjuna-text active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add task
        </button>
      </div>
    </div>
  );
}
