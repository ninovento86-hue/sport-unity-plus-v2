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
  piano?: "plus" | "premium";
};

export default function Dashboard() {
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [inviando, setInviando] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const caricaClienti = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome_completo, email, attivo, created_at")
      .eq("role", "cliente")
      .order("nome_completo");

    const lista = data ?? [];
    if (lista.length > 0) {
      const { data: piani } = await supabase
        .from("dati_cliente")
        .select("client_id, piano")
        .in(
          "client_id",
          lista.map((c) => c.id)
        );
      const mappaPiani: Record<string, "plus" | "premium"> = {};
      (piani ?? []).forEach((p) => {
        mappaPiani[p.client_id] = p.piano;
      });
      lista.forEach((c: Cliente) => {
        c.piano = mappaPiani[c.id] ?? "plus";
      });
    }

    setClienti(lista);
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

  const eliminaCliente = async (id: string, nome: string) => {
    if (
      !window.confirm(
        `Eliminare definitivamente ${nome}? Verranno cancellati anche schede, check e foto. Non si può annullare.`
      )
    ) {
      return;
    }
    setEliminando(id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/elimina-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ client_id: id }),
    });

    if (res.ok) {
      caricaClienti();
    } else {
      const risposta = await res.json();
      alert(`Errore durante l'eliminazione: ${risposta.errore ?? "sconosciuto"}`);
    }
    setEliminando(null);
  };

  const disconnetti = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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
      body: JSON.stringify({ email, nome_completo: nome, piano }),
    });
    const risposta = await res.json();

    if (!res.ok) {
      setMessaggio(`Errore: ${risposta.errore}`);
    } else {
      setMessaggio(`Invito inviato a ${email}.`);
      setNome("");
      setEmail("");
      setPiano("plus");
      setMostraForm(false);
      caricaClienti();
    }
    setInviando(false);
  };

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icona.png" alt="" className="h-8 mb-6" />
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase">
          Area trainer
        </p>
        <button
          onClick={disconnetti}
          className="text-xs font-mono text-muted hover:text-paper transition"
        >
          Esci →
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
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

      <div className="flex gap-3 mb-10">
        <a
          href="/dashboard/agenda"
          className="flex-1 bg-panel border border-line rounded-card p-4 hover:border-gold transition group"
        >
          <p className="font-display uppercase tracking-wide text-sm group-hover:text-gold transition">
            📅 Agenda
          </p>
          <p className="text-xs text-muted mt-0.5">
            Appuntamenti della settimana
          </p>
        </a>
        <a
          href="/dashboard/appuntamenti"
          className="flex-1 bg-panel border border-line rounded-card p-4 hover:border-gold transition group"
        >
          <p className="font-display uppercase tracking-wide text-sm group-hover:text-gold transition">
            🗓️ Calendario
          </p>
          <p className="text-xs text-muted mt-0.5">Gestisci gli slot disponibili</p>
        </a>
        <a
          href="/dashboard/statistiche"
          className="flex-1 bg-panel border border-line rounded-card p-4 hover:border-gold transition group"
        >
          <p className="font-display uppercase tracking-wide text-sm group-hover:text-gold transition">
            📊 Statistiche
          </p>
          <p className="text-xs text-muted mt-0.5">Clienti e fatturato stimato</p>
        </a>
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
          <label className="block text-sm text-muted mb-2">Piano</label>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setPiano("plus")}
              className={`flex-1 py-2 rounded-card border text-sm font-display uppercase tracking-wide transition ${
                piano === "plus"
                  ? "bg-gold text-ink border-gold"
                  : "border-line text-muted"
              }`}
            >
              Plus
            </button>
            <button
              type="button"
              onClick={() => setPiano("premium")}
              className={`flex-1 py-2 rounded-card border text-sm font-display uppercase tracking-wide transition ${
                piano === "premium"
                  ? "bg-gold text-ink border-gold"
                  : "border-line text-muted"
              }`}
            >
              Premium
            </button>
          </div>
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
            <li key={c.id} className="flex items-center">
              <a
                href={`/dashboard/clienti/${c.id}`}
                className="flex-1 flex items-center justify-between px-5 py-4 hover:bg-panel transition"
              >
                <div>
                  <p className="font-display uppercase tracking-wide">
                    {c.nome_completo}{" "}
                    {c.piano === "premium" && (
                      <span className="text-[10px] font-mono normal-case tracking-normal text-gold border border-gold rounded px-1.5 py-0.5 align-middle">
                        premium
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">{c.email}</p>
                </div>
                <span className="font-mono text-xs text-muted">→</span>
              </a>
              <button
                onClick={() => eliminaCliente(c.id, c.nome_completo)}
                disabled={eliminando === c.id}
                className="px-4 py-4 text-muted hover:text-red-400 transition text-xs font-mono disabled:opacity-50"
                aria-label={`Elimina ${c.nome_completo}`}
                title="Elimina cliente"
              >
                {eliminando === c.id ? "…" : "🗑"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
