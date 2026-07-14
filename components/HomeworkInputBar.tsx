"use client";

import { useRef, useState, useEffect } from "react";

export const MAX_PHOTOS = 5;

export type HomeworkInputBarProps = {
  disabled?: boolean;
  recording?: boolean;
  transcribing?: boolean;
  mode?: "homework" | "answer";
  /** Called when the user attaches files via camera / gallery / PDF */
  onCapture: (files: File[]) => void;
  /** Called when the user submits typed text */
  onReadText?: (text: string) => void;
  /** Called to toggle mic recording on/off */
  onToggleMic?: () => void;
  /** Called when the user taps "add manually" (skip AI) */
  onManualEntry?: () => void;
};

type AttachOption = {
  id: string;
  label: string;
  capture?: "environment";
  accept: string;
  multiple: boolean;
};

export function HomeworkInputBar({
  disabled,
  recording,
  transcribing,
  mode = "homework",
  onCapture,
  onReadText,
  onToggleMic,
  onManualEntry,
}: HomeworkInputBarProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const isAnswer = mode === "answer";

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;
    const files = Array.from(fileList).slice(0, isAnswer ? 1 : MAX_PHOTOS);
    setSheetOpen(false);
    if (isAnswer) {
      onCapture(files);
    } else {
      setPendingFiles((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));
    }
  }

  function removePending(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend() {
    if (disabled) return;
    if (pendingFiles.length > 0) {
      onCapture(pendingFiles);
      setPendingFiles([]);
      setText("");
      return;
    }
    const trimmed = text.trim();
    if (trimmed && onReadText) {
      onReadText(trimmed);
      setText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !disabled && !transcribing && (pendingFiles.length > 0 || text.trim().length > 0);
  const isRecording = recording && !transcribing;

  const attachOptions: AttachOption[] = isAnswer
    ? [
        { id: "camera", label: "Take photo", capture: "environment", accept: "image/*", multiple: false },
        { id: "gallery", label: "Choose from gallery", accept: "image/*", multiple: false },
      ]
    : [
        { id: "camera", label: "Scan / Take photo", capture: "environment", accept: "image/*,application/pdf", multiple: false },
        { id: "gallery", label: "Choose from gallery", accept: "image/*,application/pdf", multiple: true },
        { id: "pdf", label: "Upload PDF", accept: "application/pdf", multiple: false },
      ];

  function triggerAttach(id: string) {
    if (id === "camera") cameraRef.current?.click();
    else if (id === "gallery") galleryRef.current?.click();
    else if (id === "pdf") pdfRef.current?.click();
    setSheetOpen(false);
  }

  return (
    <div className="relative">
      {/* Thumbnail strip */}
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {pendingFiles.map((file, i) => (
            <div key={i} className="relative flex-shrink-0">
              {file.type === "application/pdf" ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primaryDark" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Attached file ${i + 1}`}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removePending(i)}
                aria-label="Remove attachment"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-arjuna-text text-[10px] font-bold text-white"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 rounded-[20px] border-2 border-orange-100 bg-white px-3 py-2.5 shadow-sm">
        {/* Attach button */}
        <button
          type="button"
          aria-label="Attach file"
          disabled={disabled}
          onClick={() => setSheetOpen((v) => !v)}
          className="mb-0.5 flex-shrink-0 text-arjuna-muted transition hover:text-arjuna-primaryDark disabled:opacity-40"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isAnswer
              ? "Describe your answer or attach a photo..."
              : transcribing
                ? "Listening..."
                : "Type your homework, or attach a photo..."
          }
          disabled={disabled || transcribing}
          rows={1}
          className="flex-1 resize-none bg-transparent py-0.5 text-sm leading-relaxed text-arjuna-text outline-none placeholder:text-arjuna-muted/70 disabled:opacity-60"
          style={{ maxHeight: 120 }}
        />

        {/* Mic button */}
        {onToggleMic && (
          <button
            type="button"
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
            disabled={disabled && !isRecording}
            onClick={onToggleMic}
            className={`mb-0.5 flex-shrink-0 transition active:scale-90 disabled:opacity-40 ${
              isRecording
                ? "animate-pulse text-red-500"
                : transcribing
                  ? "text-arjuna-primary"
                  : "text-arjuna-muted hover:text-arjuna-primaryDark"
            }`}
          >
            {transcribing ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          aria-label="Send"
          onClick={handleSend}
          disabled={!canSend}
          className={`mb-0.5 flex-shrink-0 rounded-full p-1.5 transition active:scale-90 ${
            canSend
              ? "bg-arjuna-primary text-white shadow-sm"
              : "bg-orange-100 text-arjuna-muted"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Attach bottom sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border-2 border-orange-100 bg-white shadow-chunky">
            {attachOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => triggerAttach(opt.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-arjuna-text transition hover:bg-orange-50 active:bg-orange-100"
              >
                {opt.id === "camera" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primaryDark" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
                {opt.id === "gallery" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primaryDark" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
                {opt.id === "pdf" && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-primaryDark" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                {opt.label}
              </button>
            ))}
            {!isAnswer && onManualEntry && (
              <button
                type="button"
                onClick={() => { onManualEntry(); setSheetOpen(false); }}
                className="flex w-full items-center gap-3 border-t border-orange-100 px-4 py-3 text-left text-sm font-semibold text-arjuna-muted transition hover:bg-orange-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add tasks manually
              </button>
            )}
          </div>
        </>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        multiple={!isAnswer}
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
