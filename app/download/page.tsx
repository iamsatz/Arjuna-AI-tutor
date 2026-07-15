import Link from "next/link";
import { existsSync } from "fs";
import path from "path";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";

export default function DownloadPage() {
  const apkUrl = "/Arjuna-latest.apk";
  const apkPath = path.join(process.cwd(), "public", "Arjuna-latest.apk");
  const apkAvailable = existsSync(apkPath);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-white px-6 py-10">
      <Card>
        <div className="flex flex-col items-center text-center">
          <ArjunaAvatar state="idle" size="sm" />
          <h1 className="mt-4 font-display text-2xl font-bold text-arjuna-text">
            Get the Arjuna app
          </h1>
          <p className="mt-2 text-sm text-arjuna-muted">
            For Android phone or TV
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="font-display font-bold text-arjuna-text">
              Option 1 — Add to Home Screen (easiest)
            </p>
            <p className="mt-1 text-sm text-arjuna-muted">
              Open your family link in Chrome → menu → Install app / Add to Home
              Screen. Works like a native app on phone and tablet.
            </p>
          </div>

          <div className="rounded-2xl bg-arjuna-primaryLight p-4">
            <p className="font-display font-bold text-arjuna-text">
              Option 2 — Download APK
            </p>
            {apkAvailable ? (
              <>
                <p className="mt-1 text-sm text-arjuna-muted">
                  Tap below, allow &quot;Install unknown apps&quot; if asked,
                  then open Arjuna from your app drawer.
                </p>
                <a href={apkUrl} download className="mt-3 block">
                  <Button size="lg" className="w-full">
                    Download Arjuna APK
                  </Button>
                </a>
              </>
            ) : (
              <p className="mt-1 text-sm text-amber-900">
                APK is being updated — use Option 1 (Add to Home Screen) for
                now. Open your family link in Chrome on Android.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-arjuna-primaryLight p-4">
            <p className="font-display font-bold text-arjuna-text">TV mode</p>
            <p className="mt-1 text-sm text-arjuna-muted">
              On Android TV: install the APK or open your family link in Chrome,
              then set device mode to Phone + TV in Settings.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-arjuna-primaryDark underline"
        >
          Back to Arjuna
        </Link>
      </Card>
    </main>
  );
}
