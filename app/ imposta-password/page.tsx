"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ImpostaPassword() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [password, setPassword] = useState("");
  const [conferma, setConferma] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // Il link dell'invito fa sì che supabase-js crei automaticamente una
    // sessione temporanea leggendo il token nell'indirizzo. Aspettiamo che
    // sia pronta prima di mostrare il form.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setPronto(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronto(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const salvaPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);

    if (password.length < 8) {
      setErrore("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== conferma) {
      setErrore("Le due password non coincidono.");
      return;
    }

    setSalvando(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    setSalvando(false);

    if (error) {
      setErrore("Non è stato possibile salvare la password. Riprova.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "trainer") {
      router.push("/dashboard");
    } else {
      router.push(`/area-cliente/${data.user.id}`);
    }
  };

  if (!pronto) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-mono text-sm text-muted mb-2">
            Link non valido o scaduto.
          </p>
          <a href="/area-cliente" className="text-gold text-sm underline">
            Vai alla pagina di accesso
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={salvaPassword}
        className="w-full max-w-sm bg-panel border border-line rounded-card p-8"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icona.png" alt="" className="h-10 mx-auto mb-6" />
        <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase mb-2">
          Benvenuto
        </p>
        <h1 className="font-display text-2xl uppercase mb-6">
          Imposta la tua password
        </h1>

        <label className="block text-sm text-muted mb-1" htmlFor="password">
          Nuova password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />

        <label className="block text-sm text-muted mb-1" htmlFor="conferma">
          Ripeti la password
        </label>
        <input
          id="conferma"
          type="password"
          required
          minLength={8}
          value={conferma}
          onChange={(e) => setConferma(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-card bg-ink border border-line text-paper"
        />

        {errore && (
          <p className="text-sm text-red-400 mb-4" role="alert">
            {errore}
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full py-3 rounded-card bg-gold text-ink font-display uppercase tracking-wide text-sm disabled:opacity-50"
        >
          {salvando ? "Salvataggio…" : "Salva e continua"}
        </button>
      </form>
    </main>
  );
}
