"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const MAX_PHOTOS = 5;

type HomeworkCaptureTrayProps = {
  files: File[];
  previewUrls: string[];
  diaryNote: string;
  spokenNote: string;
  recording: boolean;
  disabled?: boolean;
  onDiaryNoteChange: (v: string) => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onReadHomework: () => void;
  onToggleMic: () => void;
  onClear: () => void;
};

export function HomeworkCaptureTray({
  files,
  previewUrls,
  diaryNote,
  spokenNote,
  recording,
  disabled,
  onDiaryNoteChange,
  onAddFiles,
  onRemoveFile,
  onReadHomework,
  onToggleMic,
  onClear,
}: HomeworkCaptureTrayProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const canRead =
    files.length > 0 || diaryNote.trim().length > 0 || spokenNote.trim().length > 0;

  return (
    <Card className="space-y-4">
      <p className="font-display text-sm font-bold text-arjuna-text">
        Add homework
      </p>
      <p className="text-xs text-arjuna-muted">
        Type the teacher&apos;s diary note and/or add photos from the diary or
        textbook (up to {MAX_PHOTOS} photos).
      </p>

      <label className="block">
        <span className="text-xs font-semibold text-arjuna-text">
          Teacher diary note
        </span>
        <textarea
          value={diaryNote}
          onChange={(e) => onDiaryNoteChange(e.target.value)}
          placeholder="e.g. Maths page 12 Q1-5, English read paragraph…"
          className="mt-1 w-full rounded-2xl border-2 border-orange-100 p-3 text-sm"
          rows={3}
          disabled={disabled}
        />
      </label>

      {spokenNote && (
        <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
          <p className="text-xs font-semibold">From your voice</p>
          <p className="mt-1">{spokenNote}</p>
        </div>
      )}

      {previewUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previewUrls.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Homework page ${i + 1}`}
                className="h-20 w-20 rounded-xl border-2 border-orange-100 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveFile(i)}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={disabled || files.length >= MAX_PHOTOS}
          onClick={() => fileRef.current?.click()}
        >
          📷 Camera
        </Button>
        <Button
          variant="secondary"
          disabled={disabled || files.length >= MAX_PHOTOS}
          onClick={() => galleryRef.current?.click()}
        >
          🖼 Add photos
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={onToggleMic}
        >
          {recording ? "⏹ Stop" : "🎤 Speak"}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Button
        size="lg"
        className="w-full"
        disabled={disabled || !canRead}
        onClick={onReadHomework}
      >
        Read homework
      </Button>
      {(files.length > 0 || diaryNote || spokenNote) && (
        <button
          type="button"
          onClick={onClear}
          className="w-full text-center text-xs text-arjuna-muted underline"
        >
          Clear and start over
        </button>
      )}
    </Card>
  );
}

export { MAX_PHOTOS };
