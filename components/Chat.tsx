"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Messaggio = {
  id: string;
  mittente: "trainer" | "cliente";
  testo: string;
  created_at: string;
};

export default function Chat({
  clientId,
  ruolo,
}: {
  clientId: string;
  ruolo: "trainer" | "cliente";
}) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [testo, setTesto] = useState("");
  const [caricando, setCaricando] = useState(true);
  const [inviando, setInviando] = useState(false);
  const fineRef = useRef<HTMLDivElement>(null);

  const carica = async () => {
    const { data } = await supabase
      .from("messaggi")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessaggi(data ?? []);
    setCaricando(false);
  };

  useEffect(() => {
    carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    fineRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messaggi.length]);

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testo.trim()) return;
    setInviando(true);

    await supabase.from("messaggi").insert({
      client_id: clientId,
      mittente: ruolo,
      testo: testo.trim(),
    });

    const testoInviato = testo.trim();
    setTesto("");
    await carica();
    setInviando(false);

    // Notifica via email il destinatario (non blocca l'invio se fallisce)
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const endpoint = ruolo === "cliente" ? "/api/notifica-trainer" : "/api/notifica-cliente";
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        tipo: "nuovo_messaggio",
        client_id: clientId,
        dettagli: { testo: testoInviato },
      }),
    }).catch(() => {});
  };

  if (caricando) {
    return <p className="text-xs text-muted font-mono">Caricamento…</p>;
  }

  return (
    <div>
      <div className="max-h-72 overflow-y-auto flex flex-col gap-2 mb-3 pr-1">
        {messaggi.length === 0 && (
          <p className="text-xs text-muted font-mono">
            Nessun messaggio ancora — scrivi il primo.
          </p>
        )}
        {messaggi.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] px-3 py-2 rounded-card text-sm ${
              m.mittente === ruolo
                ? "self-end bg-gold text-ink"
                : "self-start bg-panel2 text-paper"
            }`}
          >
            <p>{m.testo}</p>
            <p
              className={`text-[9px] font-mono mt-1 ${
                m.mittente === ruolo ? "text-ink/60" : "text-muted"
              }`}
            >
              {new Date(m.created_at).toLocaleString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        <div ref={fineRef} />
      </div>
      <form onSubmit={invia} className="flex gap-2">
        <input
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio…"
          className="flex-1 px-3 py-2 rounded-card bg-ink border border-line text-paper text-sm"
        />
        <button
          type="submit"
          disabled={inviando || !testo.trim()}
          className="px-4 py-2 rounded-card bg-gold text-ink font-display uppercase text-xs tracking-wide disabled:opacity-50"
        >
          Invia
        </button>
      </form>
    </div>
  );
}
