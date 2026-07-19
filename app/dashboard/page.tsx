"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Cliente = {
  id: string;
  nome_completo: string;
  email: string;
  attivo: boolean;
  created_at: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [inviando, setInviando] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const caricaClienti = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome_completo, email, attivo, created_at")
      .eq("role", "cliente")
      .order("nome_completo");
    setClienti(data ?? []);
    setCaricando(false);
  };

  useEffect(() => {
    const guardia = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role !== "trainer") {
        router.replace("/");
        return;
      }
      caricaClienti();
    };
    guardia();
  }, [router]);

  const invitaCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviando(true);
    setMessaggio(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/invita-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ email, nome_completo: nome }),
    });
    const risposta = await res.json();

    if (!res.ok) {
      setMessaggio(`Errore: ${risposta.errore}`);
    } else {
      setMessaggio(`Invito inviato a ${email}.`);
      setNome("");
      setEmail("");
      setMostraForm(false);
      caricaClienti();
    }
    setInviando(false);
  };

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icona.png" alt="" className="h-8 mb-6" />
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase mb-2">
            Area trainer
          </p>
          <h1 className="font-display text-3xl uppercase">I tuoi clienti</h1>
        </div>
        <button
          onClick={() => setMostraForm((v) => !v)}
          className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide"
        >
          + Nuovo cliente
        </button>
      </div>

      {mostraForm && (
        <form
          onSubmit={invitaCliente}
          className="bg-panel border border-line rounded-card p-6 mb-8"
        >
          <h2 className="font-display uppercase text-lg mb-4">
            Invita un cliente
          </h2>
          <label className="block text-sm text-muted mb-1">
            Nome e cognome
          </label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
          />
          <label className="block text-sm text-muted mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-card bg-ink border border-line text-paper"
          />
          <button
            type="submit"
            disabled={inviando}
            className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
          >
            {inviando ? "Invio…" : "Invia invito via email"}
          </button>
          {messaggio && <p className="text-sm mt-3">{messaggio}</p>}
        </form>
      )}

      {caricando ? (
        <p className="text-muted font-mono text-sm">Caricamento…</p>
      ) : clienti.length === 0 ? (
        <p className="text-muted">
          Non hai ancora clienti. Invitane uno per iniziare.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line rounded-card overflow-hidden">
          {clienti.map((c) => (
            <li key={c.id}>
              <a
                href={`/dashboard/clienti/${c.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-panel transition"
              >
                <div>
                  <p className="font-display uppercase tracking-wide">
                    {c.nome_completo}
                  </p>
                  <p className="text-sm text-muted">{c.email}</p>
                </div>
                <span className="font-mono text-xs text-muted">→</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
