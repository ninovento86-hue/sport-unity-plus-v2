"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Appuntamento = {
  id: string;
  slot_id: string;
  client_id: string;
  tipo: "pt" | "valutazione";
  stato: "richiesto" | "confermato" | "rifiutato" | "annullato";
  nota_cliente: string | null;
  data_ora: string;
  durata_minuti: number;
  nome_cliente: string;
};

function inizioSettimana(data: Date) {
  const d = new Date(data);
  const giorno = d.getDay(); // 0 = domenica
  const diff = giorno === 0 ? -6 : 1 - giorno; // porta al lunedì
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function stessoGiorno(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AgendaTrainer() {
  const router = useRouter();

  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [inizioSettimanaCorrente, setInizioSettimanaCorrente] = useState(() =>
    inizioSettimana(new Date())
  );
  const [filtroTipo, setFiltroTipo] = useState<"tutti" | "pt" | "valutazione">(
    "tutti"
  );
  const [caricando, setCaricando] = useState(true);
  const [elaborando, setElaborando] = useState<string | null>(null);

  const caricaTutto = async () => {
    const { data: prenotazioniData } = await supabase
      .from("prenotazioni")
      .select("*, slot_disponibili(data_ora, durata_minuti)")
      .in("stato", ["richiesto", "confermato"]);

    const idClienti = Array.from(
      new Set((prenotazioniData ?? []).map((p) => p.client_id))
    );
    let mappaNomi: Record<string, string> = {};
    if (idClienti.length > 0) {
      const { data: profili } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", idClienti);
      mappaNomi = Object.fromEntries(
        (profili ?? []).map((p) => [p.id, p.nome_completo])
      );
    }

    const mappati: Appuntamento[] = (prenotazioniData ?? [])
      .map((p: any) => ({
        id: p.id,
        slot_id: p.slot_id,
        client_id: p.client_id,
        tipo: p.tipo,
        stato: p.stato,
        nota_cliente: p.nota_cliente,
        data_ora: p.slot_disponibili?.data_ora,
        durata_minuti: p.slot_disponibili?.durata_minuti ?? 60,
        nome_cliente: mappaNomi[p.client_id] ?? "Cliente",
      }))
      .filter((a) => a.data_ora)
      .sort(
        (a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime()
      );

    setAppuntamenti(mappati);
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
      caricaTutto();
    };
    guardia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rispondi = async (
    appuntamento: Appuntamento,
    stato: "confermato" | "rifiutato"
  ) => {
    setElaborando(appuntamento.id);
    await supabase
      .from("prenotazioni")
      .update({ stato, updated_at: new Date().toISOString() })
      .eq("id", appuntamento.id);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    fetch("/api/notifica-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tipo: "esito_appuntamento",
        client_id: appuntamento.client_id,
        dettagli: {
          stato,
          data_ora: new Date(appuntamento.data_ora).toLocaleString("it-IT"),
        },
      }),
    }).catch(() => {});

    setElaborando(null);
    caricaTutto();
  };

  if (caricando) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-sm text-muted">Caricamento…</p>
      </main>
    );
  }

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const giorniSettimana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inizioSettimanaCorrente);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fineSettimana = new Date(giorniSettimana[6]);
  fineSettimana.setHours(23, 59, 59, 999);

  const appuntamentiSettimana = appuntamenti.filter((a) => {
    const d = new Date(a.data_ora);
    const dentroSettimana = d >= inizioSettimanaCorrente && d <= fineSettimana;
    const dentroFiltro = filtroTipo === "tutti" || a.tipo === filtroTipo;
    return dentroSettimana && dentroFiltro;
  });

  const settimanaCorrenteReale = stessoGiorno(
    inizioSettimanaCorrente,
    inizioSettimana(new Date())
  );

  const vaiSettimanaPrecedente = () => {
    const d = new Date(inizioSettimanaCorrente);
    d.setDate(d.getDate() - 7);
    setInizioSettimanaCorrente(d);
  };

  const vaiSettimanaSuccessiva = () => {
    const d = new Date(inizioSettimanaCorrente);
    d.setDate(d.getDate() + 7);
    setInizioSettimanaCorrente(d);
  };

  const vaiOggi = () => setInizioSettimanaCorrente(inizioSettimana(new Date()));

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <a href="/dashboard" className="text-sm text-muted hover:text-paper">
        ← Tutti i clienti
      </a>
      <h1 className="font-display text-3xl uppercase mt-3 mb-4">Agenda</h1>

      <div className="flex gap-2 mb-4">
        {(
          [
            { chiave: "tutti", etichetta: "Tutti" },
            { chiave: "pt", etichetta: "PT" },
            { chiave: "valutazione", etichetta: "Valutazioni" },
          ] as const
        ).map((f) => (
          <button
            key={f.chiave}
            onClick={() => setFiltroTipo(f.chiave)}
            className={`px-3 py-1.5 rounded-card border text-xs font-display uppercase tracking-wide transition ${
              filtroTipo === f.chiave
                ? "bg-gold text-ink border-gold"
                : "border-line text-muted hover:border-gold"
            }`}
          >
            {f.etichetta}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-muted font-mono">
          {giorniSettimana[0].toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
          })}
          {" – "}
          {giorniSettimana[6].toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
          {" · "}
          {appuntamentiSettimana.length} appuntament
          {appuntamentiSettimana.length === 1 ? "o" : "i"}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={vaiSettimanaPrecedente}
            className="w-8 h-8 rounded-card border border-line text-muted hover:text-paper hover:border-gold transition flex items-center justify-center"
            aria-label="Settimana precedente"
          >
            ←
          </button>
          {!settimanaCorrenteReale && (
            <button
              onClick={vaiOggi}
              className="text-xs font-mono text-gold border border-gold rounded-card px-2 py-1.5 hover:bg-gold hover:text-ink transition"
            >
              Oggi
            </button>
          )}
          <button
            onClick={vaiSettimanaSuccessiva}
            className="w-8 h-8 rounded-card border border-line text-muted hover:text-paper hover:border-gold transition flex items-center justify-center"
            aria-label="Settimana successiva"
          >
            →
          </button>
        </div>
      </div>

      {giorniSettimana.map((giorno) => {
        const appuntamentiGiorno = appuntamentiSettimana.filter((a) =>
          stessoGiorno(new Date(a.data_ora), giorno)
        );
        const eOggi = stessoGiorno(giorno, oggi);

        return (
          <div key={giorno.toISOString()} className="mb-6">
            <p
              className={`font-display uppercase tracking-wide text-sm mb-2 ${
                eOggi ? "text-gold" : "text-muted"
              }`}
            >
              {giorno.toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {eOggi && " · Oggi"}
            </p>

            {appuntamentiGiorno.length === 0 ? (
              <p className="text-xs text-muted font-mono pl-1">—</p>
            ) : (
              <div className="border border-line rounded-card divide-y divide-line overflow-hidden">
                {appuntamentiGiorno.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm">
                        <span className="font-mono text-gold mr-2">
                          {new Date(a.data_ora).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {a.nome_cliente}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {a.tipo === "pt" ? "Lezione PT" : "Valutazione"} ·{" "}
                        {a.durata_minuti} min
                        {a.nota_cliente ? ` — ${a.nota_cliente}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.stato === "richiesto" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => rispondi(a, "confermato")}
                            disabled={elaborando === a.id}
                            className="text-xs px-3 py-1.5 rounded-card bg-gold text-ink font-display uppercase tracking-wide disabled:opacity-50"
                          >
                            Conferma
                          </button>
                          <button
                            onClick={() => rispondi(a, "rifiutato")}
                            disabled={elaborando === a.id}
                            className="text-xs px-3 py-1.5 rounded-card border border-line text-muted font-display uppercase tracking-wide disabled:opacity-50"
                          >
                            Rifiuta
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-card border text-gold border-gold">
                          confermato
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}
