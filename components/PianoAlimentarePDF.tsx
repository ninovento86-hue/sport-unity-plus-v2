"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    color: "#17171C",
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  headerTitolo: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerSottotitolo: {
    fontSize: 9,
    color: "#6E6E72",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#DADADD",
    paddingBottom: 16,
  },
  riga: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#9A9A9E",
    borderTopWidth: 1,
    borderTopColor: "#DADADD",
    paddingTop: 8,
  },
});

function DocumentoPianoAlimentare({
  nomeCliente,
  pianoAlimentare,
}: {
  nomeCliente: string;
  pianoAlimentare: string;
}) {
  const righe = pianoAlimentare.split("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitolo}>Piano alimentare</Text>
        <Text style={styles.headerSottotitolo}>
          {nomeCliente} — aggiornato al{" "}
          {new Date().toLocaleDateString("it-IT")}
        </Text>

        <View>
          {righe.map((riga, i) => (
            <Text key={i} style={styles.riga}>
              {riga.trim() === "" ? " " : riga}
            </Text>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Sport Unity Club — piano personalizzato dal tuo trainer</Text>
        </View>
      </Page>
    </Document>
  );
}

export default function PulsantePianoAlimentarePDF({
  nomeCliente,
  pianoAlimentare,
}: {
  nomeCliente: string;
  pianoAlimentare: string;
}) {
  if (!pianoAlimentare) return null;

  return (
    <PDFDownloadLink
      document={
        <DocumentoPianoAlimentare
          nomeCliente={nomeCliente}
          pianoAlimentare={pianoAlimentare}
        />
      }
      fileName={`piano-alimentare-${nomeCliente
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`}
      className="inline-block"
    >
      {({ loading }) => (
        <button
          type="button"
          className="text-xs font-mono text-gold border border-gold rounded-card px-3 py-1.5 hover:bg-gold hover:text-ink transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Preparazione…" : "↓ Scarica PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
