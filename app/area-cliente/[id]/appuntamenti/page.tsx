"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Appuntamento = {
  id: string;
  data_ora: string;
  stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
  nota_cliente: string | null;
  nota_trainer: string | null;
};

export default function AppuntamentiAreaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [piano, setPiano] = useState<"plus" | "premium">("plus");
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [nuovaDataOra, setNuovaDataOra] = useState("");
  const [nuovaNotaAppuntamento, setNuovaNotaAppuntamento] = useState("");
  const [prenotando, setPrenotando] = useState(false);
  const [caricando, setCaricando] = useState(true);

  const caricaTutto = async () => {
    const { data: dati } = await supabase
      .from("dati_cliente")
      .select("piano")
      .eq("client_id", id)
      .maybeSingle();
    setPiano(dati?.piano === "premium" ? "premium" : "plus");

    const { data: appuntamentiData } = await supabase
      .from("appuntamenti_pt")
      .select("*")
      .eq("client_id", id)
      .order("data_ora", { ascending: true });
    setAppuntamenti(appuntamentiData ?? []);

    setCaricando(false);
  };

  useEffect(() => {
    const guardia = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/area-cliente");
        return;
      }
      if (session.user.id !== id) {
        router.replace(`/area-cliente/${session.user.id}/appuntamenti`);
        return;
      }
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const prenotaAppuntamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovaDataOra) return;
    setPrenotando(true);

    await supabase.from("appuntamenti_pt").insert({
      client_id: id,
      data_ora: new Date(nuovaDataOra).toISOString(),
      nota_cliente: nuovaNotaAppuntamento || null,
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    fetch("/api/notifica-trainer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tipo: "richiesta_appuntamento",
        client_id: id,
        dettagli: {
          data_ora: new Date(nuovaDataOra).toLocaleString("it-IT"),
          nota: nuovaNotaAppuntamento,
        },
      }),
    }).catch(() => {});

    setNuovaDataOra("");
    setNuovaNotaAppuntamento("");
    setPrenotando(false);
    caricaTutto();
  };

  const annullaAppuntamento = async (appuntamentoId: string) => {
    await supabase
      .from("appuntamenti_pt")
      .update({ stato: "annullato" })
      .eq("id", appuntamentoId);
    caricaTutto();
  };

  if (caricando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <a
        href={`/area-cliente/${id}`}
        className="text-sm text-muted hover:text-paper inline-block mb-4"
      >
        ← Il tuo spazio
      </a>
      <h1 className="font-display text-2xl uppercase mb-2">
        Prenota una lezione PT
      </h1>

      {piano !== "premium" ? (
        <p className="text-muted text-sm">
          Questa sezione è disponibile solo per il servizio Premium.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted font-mono mb-4">
            Lezione individuale in presenza — 15€, da saldare in palestra.
          </p>

          <form
            onSubmit={prenotaAppuntamento}
            className="bg-panel border border-line rounded-card p-6 mb-4"
          >
            <label className="block text-sm text-muted mb-1">
              Data e ora richiesta
            </label>
            <input
              type="datetime-local"
              required
              value={nuovaDataOra}
              onChange={(e) => setNuovaDataOra(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
            />
            <input
              type="text"
              placeholder="Nota (facoltativa)"
              value={nuovaNotaAppuntamento}
              onChange={(e) => setNuovaNotaAppuntamento(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
            />
            <button
              type="submit"
              disabled={prenotando}
              className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
            >
              {prenotando ? "Invio…" : "Richiedi appuntamento"}
            </button>
          </form>

          {appuntamenti.length > 0 && (
            <div className="border border-line rounded-card divide-y divide-line overflow-hidden">
              {appuntamenti.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">
                      {new Date(a.data_ora).toLocaleString("it-IT", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {a.nota_trainer && (
                      <p className="text-xs text-muted mt-0.5">{a.nota_trainer}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-1 rounded-card border ${
                        a.stato === "confermato"
                          ? "text-gold border-gold"
                          : a.stato === "rifiutato" || a.stato === "annullato"
                          ? "text-muted border-line"
                          : "text-paper border-line"
                      }`}
                    >
                      {a.stato}
                    </span>
                    {(a.stato === "richiesto" || a.stato === "confermato") && (
                      <button
                        onClick={() => annullaAppuntamento(a.id)}
                        className="text-xs text-muted hover:text-red-400"
                      >
                        annulla
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
