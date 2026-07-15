import { Suspense } from "react";
import { OwnerLoginForm } from "@/components/OwnerLoginForm";

export default function OwnerLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-white px-6 py-10">
      <Suspense
        fallback={
          <div className="rounded-2xl bg-white/95 p-6 text-sm text-arjuna-muted shadow-sm">
            Loading sign in...
          </div>
        }
      >
        <OwnerLoginForm />
      </Suspense>
    </main>
  );
}
