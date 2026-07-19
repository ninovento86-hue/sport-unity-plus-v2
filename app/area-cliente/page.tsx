"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginCliente() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);
    setCaricando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrore("Email o password non corrette.");
      setCaricando(false);
      return;
    }

    router.push(`/area-cliente/${data.user.id}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-panel border border-line rounded-card p-8"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icona.png" alt="" className="h-10 mx-auto mb-6" />
        <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase mb-2">
          Il tuo spazio
        </p>
        <h1 className="font-display text-2xl uppercase mb-6">
          Accedi al tuo portale
        </h1>

        <label className="block text-sm text-muted mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />

        <label className="block text-sm text-muted mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />

        {errore && (
          <p className="text-sm text-red-400 mb-4" role="alert">
            {errore}
          </p>
        )}

        <button
          type="submit"
          disabled={caricando}
          className="w-full py-3 rounded-card bg-gold text-ink font-display uppercase tracking-wide text-sm disabled:opacity-50"
        >
          {caricando ? "Accesso in corso…" : "Entra"}
        </button>

        <p className="text-xs text-muted mt-4">
          Le credenziali te le fornisce il tuo trainer al primo invito.
        </p>
      </form>
    </main>
  );
}
