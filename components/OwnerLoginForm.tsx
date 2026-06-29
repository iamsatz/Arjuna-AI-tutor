"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function OwnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/owner";
  const configError = searchParams.get("error") === "config";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    configError ? "Owner password is not configured on the server." : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        if (data?.error === "missing_config") {
          setError(
            "Owner password not set on server. Add OWNER_PASSWORD in Vercel env vars and redeploy.",
          );
        } else {
          setError("Wrong password. Try again.");
        }
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not sign in. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/95 p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
        Arjuna · Owner
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-arjuna-text">Sign in</h1>
      <p className="mt-2 text-sm text-arjuna-muted">
        Parent dashboard for phase status and session history.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-arjuna-text">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-xl border border-arjuna-primary/20 bg-white px-4 py-3 text-arjuna-text outline-none focus:border-arjuna-primary"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-arjuna-primary px-4 py-3 font-semibold text-white transition hover:bg-arjuna-primaryDark disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Enter dashboard"}
        </button>
      </form>

      <a
        href="/"
        className="mt-4 block text-center text-sm text-arjuna-primaryDark underline"
      >
        Back to Arjuna
      </a>
    </div>
  );
}
