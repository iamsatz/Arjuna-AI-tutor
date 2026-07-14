"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ios] = useState(() => isIos());
  const [standalone] = useState(() => isStandalone());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("arjuna-install-dismissed") === "1") {
      setDismissed(true);
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone || dismissed) return null;

  function dismiss() {
    localStorage.setItem("arjuna-install-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-arjuna-border bg-arjuna-surface p-3.5 shadow-card">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arjuna-bg">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-arjuna-muted">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-arjuna-text">Install Arjuna</p>
        <p className="mt-0.5 text-xs text-arjuna-muted">
          Add to Home Screen for faster camera &amp; mic access.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {deferred && (
            <Button size="sm" onClick={() => void install()}>
              Add to Home Screen
            </Button>
          )}
          {ios && !deferred && (
            <p className="text-xs text-arjuna-muted">
              Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
            </p>
          )}
          <Link
            href="/download"
            className="text-xs font-semibold text-arjuna-primary hover:underline"
          >
            Download Android APK
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-arjuna-muted hover:text-arjuna-text"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
