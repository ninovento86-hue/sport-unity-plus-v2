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

export default function StoricoCheck({ checks }: { checks: Check[] }) {
  // checks arrivano già ordinati dal più recente al più vecchio
  const ultimo = checks[0];
  const perGrafico = [...checks].slice(0, 8).reverse(); // ordine cronologico, max 8 punti

  const pesi = perGrafico
    .map((c) => c.peso_kg)
    .filter((p): p is number => p !== null);

  const puntiSvg = (() => {
    if (pesi.length < 2) return null;
    const min = Math.min(...pesi);
    const max = Math.max(...pesi);
    const range = max - min || 1;
    const step = 300 / (pesi.length - 1);
    return pesi
      .map((p, i) => {
        const x = i * step;
        const y = 90 - ((p - min) / range) * 80;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  const ultimoPunto = puntiSvg
    ? puntiSvg.split(" ").slice(-1)[0].split(",")
    : null;

  if (!ultimo) {
    return (
      <p className="text-muted text-sm">Nessun check registrato ancora.</p>
    );
  }

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

      {puntiSvg && (
        <>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">
            Andamento peso — ultimi {pesi.length} check
          </p>
          <svg viewBox="0 0 300 100" className="w-full h-24 mb-4">
            <polyline
              points={puntiSvg}
              fill="none"
              stroke="#C6FF4D"
              strokeWidth="3"
            />
            {ultimoPunto && (
              <circle
                cx={ultimoPunto[0]}
                cy={ultimoPunto[1]}
                r="4"
                fill="#C6FF4D"
              />
            )}
          </svg>
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
