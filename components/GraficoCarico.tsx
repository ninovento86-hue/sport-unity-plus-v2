"use client";

type Voce = { data: string; carico_kg: number | null };

export default function GraficoCarico({ voci }: { voci: Voce[] }) {
  const valori = [...voci]
    .filter((v) => v.carico_kg !== null)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-8);

  if (valori.length === 0) {
    return <p className="text-xs text-muted font-mono">Nessun dato ancora.</p>;
  }

  const ultimo = valori[valori.length - 1];

  if (valori.length === 1) {
    return (
      <p className="text-xs font-mono">
        <span className="text-gold">{ultimo.carico_kg} kg</span>{" "}
        <span className="text-muted">
          ({new Date(ultimo.data).toLocaleDateString("it-IT")})
        </span>
      </p>
    );
  }

  const pesi = valori.map((v) => v.carico_kg as number);
  const min = Math.min(...pesi);
  const max = Math.max(...pesi);
  const range = max - min || 1;
  const step = 160 / (pesi.length - 1);
  const punti = pesi
    .map((p, i) => {
      const x = i * step;
      const y = 44 - ((p - min) / range) * 36;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const ultimoPunto = punti.split(" ").slice(-1)[0].split(",");

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 160 44" className="w-24 h-6">
        <polyline points={punti} fill="none" stroke="#C6FF4D" strokeWidth="2.5" />
        <circle cx={ultimoPunto[0]} cy={ultimoPunto[1]} r="3" fill="#C6FF4D" />
      </svg>
      <p className="text-xs font-mono">
        <span className="text-gold">{ultimo.carico_kg} kg</span>{" "}
        <span className="text-muted">
          ({new Date(ultimo.data).toLocaleDateString("it-IT")})
        </span>
      </p>
    </div>
  );
}
