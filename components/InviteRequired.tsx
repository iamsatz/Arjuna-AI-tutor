"use client";

export function InviteRequired() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-arjuna-bg px-6 py-10">
      <div className="rounded-2xl bg-white/95 p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
          Arjuna
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-arjuna-text">
          Invite link needed
        </h1>
        <p className="mt-3 text-sm text-arjuna-muted">
          Open the invite link you received to set up your child&apos;s profile
          and start homework tutoring.
        </p>
      </div>
    </main>
  );
}
