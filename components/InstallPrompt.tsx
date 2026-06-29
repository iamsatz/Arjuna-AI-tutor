"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
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
    <Card className="mb-4 border-sky-200 bg-gradient-to-br from-sky-50 to-white">
      <p className="font-display text-lg font-bold text-arjuna-text">
        Install Arjuna on this phone
      </p>
      <p className="mt-1 text-sm text-arjuna-muted">
        Add to Home Screen for a full-screen app — faster mic and camera access.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {deferred && (
          <Button size="lg" className="w-full" onClick={() => void install()}>
            Add to Home Screen
          </Button>
        )}
        {ios && !deferred && (
          <p className="rounded-xl bg-white px-3 py-2 text-sm text-arjuna-text">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
          </p>
        )}
        <Link
          href="/download"
          className="text-center text-sm font-semibold text-arjuna-primaryDark underline"
        >
          Or download Android APK
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-arjuna-muted underline"
        >
          Not now
        </button>
      </div>
    </Card>
  );
}
