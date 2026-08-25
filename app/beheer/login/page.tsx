"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BeheerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/beheer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Onjuist wachtwoord.");
      return;
    }
    router.push(params.get("next") || "/beheer");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="badge-square">RGS</span>
          <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink/60">
            Content-editor
          </span>
        </div>
        <label className="mb-2 block text-sm font-medium">Wachtwoord</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-ink/15 px-3 py-2.5"
          autoFocus
        />
        {error && <p className="mb-4 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          Inloggen
        </button>
      </form>
    </main>
  );
}
