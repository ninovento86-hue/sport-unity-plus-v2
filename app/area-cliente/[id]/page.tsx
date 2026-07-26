"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type VoceMenu = {
  chiave: string;
  etichetta: string;
  descrizione: string;
  href: string;
  soloPremium?: boolean;
};

const VOCI_MENU: VoceMenu[] = [
  {
    chiave: "scheda",
    etichetta: "La tua scheda",
    descrizione: "Esercizi, carichi e timer di recupero",
    href: "scheda",
  },
  {
    chiave: "check",
    etichetta: "Check di valutazione",
    descrizione: "Peso, composizione corporea, circonferenze",
    href: "check",
  },
  {
    chiave: "foto",
    etichetta: "Foto progressi",
    descrizione: "Frontale, laterale, di schiena",
    href: "foto",
  },
  {
    chiave: "alimentazione",
    etichetta: "Piano alimentare",
    descrizione: "Il tuo piano nutrizionale aggiornato",
    href: "alimentazione",
    soloPremium: true,
  },
  {
    chiave: "appuntamenti",
    etichetta: "Prenota una lezione PT",
    descrizione: "In presenza — 15€ a lezione",
    href: "appuntamenti",
    soloPremium: true,
  },
  {
    chiave: "messaggi",
    etichetta: "Messaggi con il trainer",
    descrizione: "Scrivi al tuo trainer",
    href: "messaggi",
    soloPremium: true,
  },
];

export default function MenuAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [prossimaValutazione, setProssimaValutazione] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  useEffect(() => {
    const carica = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/area-cliente");
        return;
      }
      if (session.user.id !== id) {
        router.replace(`/area-cliente/${session.user.id}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("id", id)
        .single();
      setNome(profile?.nome_completo ?? "");

      const { data: dati } = await supabase
        .from("dati_cliente")
        .select("piano, prossima_valutazione")
        .eq("client_id", id)
        .maybeSingle();
      setPiano(dati?.piano === "premium" ? "premium" : "plus");
      setProssimaValutazione(dati?.prossima_valutazione ?? null);

      setCaricando(false);
    };
    carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const disconnetti = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (caricando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  const dataValutazione = prossimaValutazione
    ? new Date(prossimaValutazione)
    : null;

  const vociVisibili = VOCI_MENU.filter(
    (v) => !v.soloPremium || piano === "premium"
  );

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icona.png" alt="" className="h-8 mb-6" />
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-xs tracking-[0.3em] text-gold uppercase">
          Il tuo spazio
        </p>
        <button
          onClick={disconnetti}
          className="text-xs font-mono text-muted hover:text-paper transition"
        >
          Esci →
        </button>
      </div>
      <h1 className="font-display text-3xl uppercase mb-2">Ciao {nome}</h1>
      {piano === "premium" && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-gold border border-gold rounded px-2 py-0.5 inline-block mb-6">
          Servizio Premium
        </p>
      )}

      {dataValutazione && (
        <div className="bg-panel border border-line rounded-card p-4 mb-6 flex items-center gap-4">
          <div className="bg-gold text-ink rounded-card px-3 py-1.5 text-center min-w-[52px]">
            <p className="font-display text-lg leading-none">
              {dataValutazione.getDate().toString().padStart(2, "0")}
            </p>
            <p className="font-mono text-[9px] uppercase">
              {dataValutazione.toLocaleDateString("it-IT", { month: "short" })}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wide">
              Prossima valutazione
            </p>
            <p className="text-sm">
              {dataValutazione.toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {vociVisibili.map((voce) => (
          <button
            key={voce.chiave}
            onClick={() => router.push(`/area-cliente/${id}/${voce.href}`)}
            className="w-full text-left bg-panel border border-line rounded-card p-5 flex items-center justify-between hover:border-gold transition group"
          >
            <div>
              <p className="font-display uppercase tracking-wide text-lg group-hover:text-gold transition">
                {voce.etichetta}
              </p>
              <p className="text-xs text-muted mt-0.5">{voce.descrizione}</p>
            </div>
            <span className="text-gold text-xl">→</span>
          </button>
        ))}
      </div>
    </main>
  );
}
"Sostituisco la home con il menu a sezioni"
