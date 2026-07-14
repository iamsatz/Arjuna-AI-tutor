"use client";

import { useRef, useState } from "react";

const MAX_PHOTOS = 5;

type HomeworkCaptureTrayProps = {
  disabled?: boolean;
  recording?: boolean;
  onCapture: (files: File[]) => void;
  onReadText?: (text: string) => void;
  onToggleMic?: () => void;
  onManualEntry?: () => void;
  mode?: "homework" | "answer";
};

export function HomeworkCaptureTray({
  disabled,
  recording,
  onCapture,
  onReadText,
  onToggleMic,
  onManualEntry,
  mode = "homework",
}: HomeworkCaptureTrayProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const isAnswer = mode === "answer";

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;
    const files = Array.from(fileList).slice(0, isAnswer ? 1 : MAX_PHOTOS);
    onCapture(files);
    setAttachOpen(false);
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled || !onReadText) return;
    onReadText(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <p className="text-xs font-semibold text-arjuna-muted">
        {isAnswer ? "Share your answer" : "Add today's homework"}
      </p>

      {/* Composer row */}
      <div className="flex items-end gap-2 rounded-2xl border border-arjuna-border bg-arjuna-surface p-1.5 shadow-card focus-within:border-arjuna-primary focus-within:ring-2 focus-within:ring-arjuna-primary/20 transition-all">
        {/* Attach button */}
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAttachOpen((v) => !v)}
            aria-label="Attach photo or file"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
              attachOpen
                ? "bg-arjuna-primaryLight text-arjuna-primary"
                : "text-arjuna-muted hover:bg-arjuna-bg hover:text-arjuna-text"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Attach menu */}
          {attachOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-48 rounded-2xl border border-arjuna-border bg-arjuna-surface shadow-card-hover z-10">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setAttachOpen(false);
                  cameraRef.current?.click();
                }}
                className="flex w-full items-center gap-3 rounded-t-2xl px-4 py-3 text-sm text-arjuna-text hover:bg-arjuna-bg transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-arjuna-muted">
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Take photo
              </button>
              <div className="h-px bg-arjuna-border" />
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setAttachOpen(false);
                  galleryRef.current?.click();
                }}
                className="flex w-full items-center gap-3 rounded-b-2xl px-4 py-3 text-sm text-arjuna-text hover:bg-arjuna-bg transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-arjuna-muted">
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Browse / PDF
              </button>
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            isAnswer
              ? "Type your answer…"
              : "Type homework or diary note, then send…"
          }
          rows={1}
          className="flex-1 resize-none bg-transparent py-2.5 text-sm text-arjuna-text placeholder-arjuna-muted/60 focus:outline-none leading-snug"
          style={{ minHeight: "2.5rem", maxHeight: "7rem" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
          }}
        />

        {/* Mic button */}
        {!isAnswer && onToggleMic && (
          <button
            type="button"
            disabled={disabled && !recording}
            onClick={onToggleMic}
            aria-label={recording ? "Stop recording" : "Start voice input"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
              recording
                ? "bg-red-100 text-arjuna-red"
                : "text-arjuna-muted hover:bg-arjuna-bg hover:text-arjuna-text"
            }`}
          >
            {recording ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <rect x="4" y="4" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}

        {/* Send button — shown when there is text */}
        {text.trim() && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleSubmit}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arjuna-primary text-white transition-all hover:bg-arjuna-primaryDark active:scale-95 disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        )}

        {/* Answer mode camera shortcut */}
        {isAnswer && !text.trim() && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
            aria-label="Take photo of answer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-arjuna-muted hover:bg-arjuna-bg hover:text-arjuna-text transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Manual entry link — subtle, below the composer */}
      {!isAnswer && onManualEntry && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={onManualEntry}
            className="text-xs text-arjuna-muted hover:text-arjuna-text disabled:opacity-50 transition-colors"
          >
            Add tasks manually instead
          </button>
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
