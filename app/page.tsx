import { Suspense } from "react";
import { DeviceRouter } from "@/components/DeviceRouter";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-white">
          <p className="font-display text-sm text-arjuna-muted">Loading…</p>
        </main>
      }
    >
      <DeviceRouter />
    </Suspense>
  );
}
