"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const MAX_PHOTOS = 5;

type HomeworkCaptureTrayProps = {
  disabled?: boolean;
  recording?: boolean;
  onCapture: (files: File[]) => void;
  onReadText?: (text: string) => void;
  onToggleMic?: () => void;
  mode?: "homework" | "answer";
};

export function HomeworkCaptureTray({
  disabled,
  recording,
  onCapture,
  onReadText,
  onToggleMic,
  mode = "homework",
}: HomeworkCaptureTrayProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [typedNote, setTypedNote] = useState("");
  const isAnswer = mode === "answer";

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;
    const files = Array.from(fileList).slice(0, isAnswer ? 1 : MAX_PHOTOS);
    onCapture(files);
  }

  function handleTypedSubmit() {
    const text = typedNote.trim();
    if (!text || disabled || !onReadText) return;
    onReadText(text);
    setTypedNote("");
    setShowTypeInput(false);
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full !py-5 text-lg"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
      >
        {isAnswer ? "📷 Photo of my answer" : "📷 Scan homework"}
      </Button>
      <p className="text-center text-xs text-arjuna-muted">
        {isAnswer
          ? "Make sure your full written answer is visible."
          : "Point your camera at the homework diary or book page. Arjuna will read it."}
      </p>

      {!isAnswer && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold">
          <button
            type="button"
            disabled={disabled}
            onClick={() => galleryRef.current?.click()}
            className="text-arjuna-primaryDark underline disabled:opacity-50"
          >
            Choose photo
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowTypeInput((v) => !v)}
            className="text-arjuna-primaryDark underline disabled:opacity-50"
          >
            Type instead
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleMic}
            className="text-arjuna-primaryDark underline disabled:opacity-50"
          >
            {recording ? "⏹ Stop speaking" : "Speak"}
          </button>
        </div>
      )}

      {isAnswer && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
          className="block w-full text-center text-xs font-semibold text-arjuna-primaryDark underline disabled:opacity-50"
        >
          Choose from gallery
        </button>
      )}

      {!isAnswer && showTypeInput && (
        <div className="space-y-2 rounded-2xl border-2 border-orange-100 bg-white p-3">
          <textarea
            value={typedNote}
            onChange={(e) => setTypedNote(e.target.value)}
            placeholder="Type the teacher's diary note…"
            className="w-full rounded-xl border-2 border-orange-100 p-3 text-sm"
            rows={3}
            disabled={disabled}
          />
          <Button
            className="w-full"
            disabled={disabled || !typedNote.trim()}
            onClick={handleTypedSubmit}
          >
            Read this
          </Button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        multiple={!isAnswer}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export { MAX_PHOTOS };
