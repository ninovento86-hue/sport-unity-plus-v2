"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Polyline,
  Circle,
  PDFDownloadLink,
} from "@react-pdf/renderer";

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

const CAMPI = [
  { chiave: "peso_kg" as const, etichetta: "Peso", unita: "kg", colore: "#C6FF4D" },
  {
    chiave: "massa_grassa_percentuale" as const,
    etichetta: "Massa grassa",
    unita: "%",
    colore: "#FF7A6B",
  },
  {
    chiave: "massa_magra_percentuale" as const,
    etichetta: "Massa magra",
    unita: "%",
    colore: "#5CC8FF",
  },
  { chiave: "vita_cm" as const, etichetta: "Vita", unita: "cm", colore: "#FFD166" },
  { chiave: "fianchi_cm" as const, etichetta: "Fianchi", unita: "cm", colore: "#EF476F" },
  { chiave: "petto_cm" as const, etichetta: "Petto", unita: "cm", colore: "#06D6A0" },
  { chiave: "braccio_cm" as const, etichetta: "Braccio", unita: "cm", colore: "#9D8CFF" },
  { chiave: "coscia_cm" as const, etichetta: "Coscia", unita: "cm", colore: "#FFA85C" },
];

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0E0E12",
    color: "#F2F2F0",
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  headerTitolo: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerSottotitolo: {
    fontSize: 9,
    color: "#9A9A9E",
    marginBottom: 20,
  },
  rigaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A30",
    paddingBottom: 12,
  },
  grigliaCampi: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardCampo: {
    width: "48%",
    backgroundColor: "#17171C",
    borderWidth: 1,
    borderColor: "#2A2A30",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitolo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValore: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  cardVariazione: {
    fontSize: 8,
    color: "#9A9A9E",
    marginTop: 2,
  },
  assiData: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  assiTesto: {
    fontSize: 7,
    color: "#6E6E72",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#6E6E72",
    borderTopWidth: 1,
    borderTopColor: "#2A2A30",
    paddingTop: 8,
  },
  tabellaHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A30",
    paddingBottom: 6,
    marginTop: 20,
    marginBottom: 4,
  },
  tabellaRiga: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E1E24",
    paddingVertical: 5,
  },
  tabellaCella: {
    flex: 1,
    fontSize: 8,
  },
  tabellaCellaData: {
    width: 60,
    fontSize: 8,
    color: "#9A9A9E",
  },
});

function generaPunti(valori: number[], larghezza: number, altezza: number) {
  if (valori.length < 2) return null;
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const range = max - min || 1;
  const step = larghezza / (valori.length - 1);
  return valori
    .map((v, i) => {
      const x = i * step;
      const y = altezza - 6 - ((v - min) / range) * (altezza - 12);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function CardCampo({
  campo,
  checksCronologici,
}: {
  campo: (typeof CAMPI)[number];
  checksCronologici: Check[];
}) {
  const valori = checksCronologici
    .map((c) => c[campo.chiave])
    .filter((v): v is number => v !== null);

  const primo = valori[0];
  const ultimo = valori[valori.length - 1];
  const variazione =
    primo !== undefined && ultimo !== undefined ? ultimo - primo : null;

  const larghezza = 220;
  const altezza = 60;
  const punti = generaPunti(valori, larghezza, altezza);
  const ultimoPunto = punti?.split(" ").slice(-1)[0]?.split(",");

  const primaData = checksCronologici.find((c) => c[campo.chiave] !== null)?.data;
  const ultimaData = [...checksCronologici]
    .reverse()
    .find((c) => c[campo.chiave] !== null)?.data;

  return (
    <View style={styles.cardCampo} wrap={false}>
      <View style={styles.cardHeader}>
        <Text style={{ ...styles.cardTitolo, color: campo.colore }}>
          {campo.etichetta}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.cardValore}>
            {ultimo !== undefined ? `${ultimo}${campo.unita}` : "—"}
          </Text>
          {variazione !== null && (
            <Text style={styles.cardVariazione}>
              {variazione > 0 ? "+" : ""}
              {variazione.toFixed(1)}
              {campo.unita} nel periodo
            </Text>
          )}
        </View>
      </View>

      {punti ? (
        <>
          <Svg width={larghezza} height={altezza}>
            <Polyline
              points={punti}
              fill="none"
              stroke={campo.colore}
              strokeWidth={1.8}
            />
            {ultimoPunto && (
              <Circle
                cx={Number(ultimoPunto[0])}
                cy={Number(ultimoPunto[1])}
                r={2.5}
                fill={campo.colore}
              />
            )}
          </Svg>
          <View style={styles.assiData}>
            <Text style={styles.assiTesto}>
              {primaData && new Date(primaData).toLocaleDateString("it-IT")}
            </Text>
            <Text style={styles.assiTesto}>
              {ultimaData && new Date(ultimaData).toLocaleDateString("it-IT")}
            </Text>
          </View>
        </>
      ) : (
        <Text style={{ fontSize: 8, color: "#6E6E72" }}>
          Dati insufficienti per il grafico
        </Text>
      )}
    </View>
  );
}

function ReportDocument({
  nomeCliente,
  checks,
}: {
  nomeCliente: string;
  checks: Check[];
}) {
  // checks arriva ordinato dal più recente: lo inverto per l'ordine cronologico
  const cronologici = [...checks].reverse();
  const periodoInizio = cronologici[0]?.data;
  const periodoFine = cronologici[cronologici.length - 1]?.data;

  const campiConDati = CAMPI.filter((campo) =>
    cronologici.some((c) => c[campo.chiave] !== null)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.rigaHeader}>
          <View>
            <Text style={styles.headerTitolo}>Report progressi</Text>
            <Text style={styles.headerSottotitolo}>{nomeCliente}</Text>
          </View>
          <Text style={styles.headerSottotitolo}>
            {periodoInizio && new Date(periodoInizio).toLocaleDateString("it-IT")}
            {"  —  "}
            {periodoFine && new Date(periodoFine).toLocaleDateString("it-IT")}
          </Text>
        </View>

        <View style={styles.grigliaCampi}>
          {campiConDati.map((campo) => (
            <CardCampo
              key={campo.chiave}
              campo={campo}
              checksCronologici={cronologici}
            />
          ))}
        </View>

        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Storico completo
        </Text>
        <View style={styles.tabellaHeader}>
          <Text style={styles.tabellaCellaData}>Data</Text>
          <Text style={styles.tabellaCella}>Peso</Text>
          <Text style={styles.tabellaCella}>MG%</Text>
          <Text style={styles.tabellaCella}>MM%</Text>
          <Text style={styles.tabellaCella}>Vita</Text>
          <Text style={styles.tabellaCella}>Fianchi</Text>
          <Text style={styles.tabellaCella}>Petto</Text>
          <Text style={styles.tabellaCella}>Braccio</Text>
          <Text style={styles.tabellaCella}>Coscia</Text>
        </View>
        {checks.map((c) => (
          <View key={c.id} style={styles.tabellaRiga} wrap={false}>
            <Text style={styles.tabellaCellaData}>
              {new Date(c.data).toLocaleDateString("it-IT")}
            </Text>
            <Text style={styles.tabellaCella}>{c.peso_kg ?? "—"}</Text>
            <Text style={styles.tabellaCella}>
              {c.massa_grassa_percentuale ?? "—"}
            </Text>
            <Text style={styles.tabellaCella}>
              {c.massa_magra_percentuale ?? "—"}
            </Text>
            <Text style={styles.tabellaCella}>{c.vita_cm ?? "—"}</Text>
            <Text style={styles.tabellaCella}>{c.fianchi_cm ?? "—"}</Text>
            <Text style={styles.tabellaCella}>{c.petto_cm ?? "—"}</Text>
            <Text style={styles.tabellaCella}>{c.braccio_cm ?? "—"}</Text>
            <Text style={styles.tabellaCella}>{c.coscia_cm ?? "—"}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Report generato automaticamente</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export default function PulsanteReportPDF({
  nomeCliente,
  checks,
}: {
  nomeCliente: string;
  checks: Check[];
}) {
  if (checks.length === 0) return null;

  return (
    <PDFDownloadLink
      document={<ReportDocument nomeCliente={nomeCliente} checks={checks} />}
      fileName={`report-${nomeCliente.replace(/\s+/g, "-").toLowerCase()}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`}
      className="inline-block"
    >
      {({ loading }) => (
        <button
          type="button"
          className="px-5 py-2 rounded-card bg-gold text-ink font-display uppercase text-sm tracking-wide disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Preparazione…" : "Scarica report PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
"Aggiungo componente report PDF"
