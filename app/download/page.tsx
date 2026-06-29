import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";

export default function DownloadPage() {
  const apkUrl = "/Arjuna-latest.apk";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-arjuna-bg px-6 py-10">
      <Card>
        <div className="flex flex-col items-center text-center">
          <ArjunaAvatar state="idle" size="sm" />
          <h1 className="mt-4 font-display text-2xl font-bold text-arjuna-text">
            Get the Arjuna app
          </h1>
          <p className="mt-2 text-sm text-arjuna-muted">
            Two ways to install on Android
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="font-display font-bold text-arjuna-text">
              Option 1 — Add to Home Screen
            </p>
            <p className="mt-1 text-sm text-arjuna-muted">
              Open your family link in Chrome → menu → Install app / Add to Home
              Screen. Works like a native app.
            </p>
          </div>

          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="font-display font-bold text-arjuna-text">
              Option 2 — Download APK
            </p>
            <p className="mt-1 text-sm text-arjuna-muted">
              Tap below, allow &quot;Install unknown apps&quot; if asked, then
              open Arjuna from your app drawer.
            </p>
            <a href={apkUrl} download className="mt-3 block">
              <Button size="lg" className="w-full">
                Download Arjuna APK
              </Button>
            </a>
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
