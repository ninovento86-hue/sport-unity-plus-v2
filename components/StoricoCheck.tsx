"use client";

type Check = {
  id: string;
  data: string;
  peso_kg: number | null;
  massa_grassa_percentuale: number | null;
  massa_magra_percentuale: number | null;
  vita_cm: number | null;
  fianchi_cm: number | null;
  petto_cm: number | null;
  braccio_cm: number | null;
  coscia_cm: number | null;
  nota: string | null;
};

const SERIE = [
  { chiave: "peso_kg" as const, etichetta: "Peso", colore: "#C6FF4D" },
  {
    chiave: "massa_grassa_percentuale" as const,
    etichetta: "Massa grassa",
    colore: "#FF7A6B",
  },
  {
    chiave: "massa_magra_percentuale" as const,
    etichetta: "Massa magra",
    colore: "#5CC8FF",
  },
];

function generaPunti(valori: number[]) {
  if (valori.length < 2) return null;
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const range = max - min || 1;
  const step = 300 / (valori.length - 1);
  return valori
    .map((v, i) => {
      const x = i * step;
      const y = 90 - ((v - min) / range) * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function StoricoCheck({ checks }: { checks: Check[] }) {
  const ultimo = checks[0];
  const perGrafico = [...checks].slice(0, 8).reverse(); // ordine cronologico, max 8 punti

  if (!ultimo) {
    return (
      <p className="text-muted text-sm">Nessun check registrato ancora.</p>
    );
  }

  const primaData = perGrafico[0]?.data;
  const ultimaData = perGrafico[perGrafico.length - 1]?.data;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-ink border border-line rounded-card p-3 text-center">
          <p className="font-mono text-lg text-gold">
            {ultimo.peso_kg ?? "—"}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-1">
            Peso kg
          </p>
        </div>
        <div className="bg-ink border border-line rounded-card p-3 text-center">
          <p className="font-mono text-lg text-gold">
            {ultimo.massa_grassa_percentuale ?? "—"}
            {ultimo.massa_grassa_percentuale ? "%" : ""}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-1">
            Massa grassa
          </p>
        </div>
        <div className="bg-ink border border-line rounded-card p-3 text-center">
          <p className="font-mono text-lg text-gold">
            {ultimo.massa_magra_percentuale ?? "—"}
            {ultimo.massa_magra_percentuale ? "%" : ""}
          </p>
          <p className="text-[10px] text-muted uppercase tracking-wide mt-1">
            Massa magra
          </p>
        </div>
      </div>

      {perGrafico.length >= 2 && (
        <>
          <div className="flex items-center gap-4 mb-2">
            {SERIE.map((s) => (
              <span
                key={s.chiave}
                className="flex items-center gap-1.5 text-[10px] text-muted font-mono uppercase"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.colore }}
                />
                {s.etichetta}
              </span>
            ))}
          </div>
          <svg viewBox="0 0 300 100" className="w-full h-24">
            {SERIE.map((s) => {
              const valori = perGrafico
                .map((c) => c[s.chiave])
                .filter((v): v is number => v !== null);
              if (valori.length < 2) return null;
              const punti = generaPunti(valori);
              if (!punti) return null;
              const ultimoPunto = punti.split(" ").slice(-1)[0].split(",");
              return (
                <g key={s.chiave}>
                  <polyline
                    points={punti}
                    fill="none"
                    stroke={s.colore}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={ultimoPunto[0]}
                    cy={ultimoPunto[1]}
                    r="3.5"
                    fill={s.colore}
                  />
                </g>
              );
            })}
          </svg>
          <div className="flex justify-between mb-4">
            <span className="text-[10px] text-muted font-mono">
              {primaData && new Date(primaData).toLocaleDateString("it-IT")}
            </span>
            <span className="text-[10px] text-muted font-mono">
              {ultimaData && new Date(ultimaData).toLocaleDateString("it-IT")}
            </span>
          </div>
        </>
      )}

      <p className="text-xs text-muted uppercase tracking-wide mb-2">
        Storico
      </p>
      <div className="border border-line rounded-card divide-y divide-line overflow-hidden">
        {checks.map((c) => (
          <div key={c.id} className="px-4 py-2.5 text-sm flex justify-between gap-3">
            <span className="font-mono text-xs text-muted whitespace-nowrap">
              {new Date(c.data).toLocaleDateString("it-IT")}
            </span>
            <span className="font-mono text-gold whitespace-nowrap">
              {c.peso_kg ? `${c.peso_kg} kg` : "—"}
            </span>
            <span className="text-muted flex-1 truncate">{c.nota}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
