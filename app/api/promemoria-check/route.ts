import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inviaEmail } from "@/lib/email";

const GIORNI_PRIMA = 2; // quanti giorni prima della valutazione inviare il promemoria

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ errore: "Non autorizzato." }, { status: 401 });
  }

  const oggi = new Date();
  const dataSoglia = new Date(oggi);
  dataSoglia.setDate(dataSoglia.getDate() + GIORNI_PRIMA);
  const dataSogliaStr = dataSoglia.toISOString().slice(0, 10);

  const { data: daAvvisare } = await supabaseAdmin
    .from("dati_cliente")
    .select("id, client_id, prossima_valutazione, promemoria_inviato")
    .eq("prossima_valutazione", dataSogliaStr)
    .eq("promemoria_inviato", false);

  let inviati = 0;

  for (const riga of daAvvisare ?? []) {
    const { data: cliente } = await supabaseAdmin
      .from("profiles")
      .select("email, nome_completo")
      .eq("id", riga.client_id)
      .single();

    if (cliente?.email) {
      try {
        await inviaEmail({
          to: cliente.email,
          subject: "Promemoria: prossima valutazione tra 2 giorni",
          text: `Ciao ${cliente.nome_completo},\n\nti ricordiamo che la tua prossima valutazione con il trainer è fissata per il ${new Date(
            riga.prossima_valutazione
          ).toLocaleDateString("it-IT")}.\n\nAccedi al portale per confermare o annullare la tua presenza.`,
        });
        inviati++;
      } catch (e) {
        console.error("Errore invio promemoria:", e);
      }
    }

    await supabaseAdmin
      .from("dati_cliente")
      .update({ promemoria_inviato: true })
      .eq("id", riga.id);
  }

  return NextResponse.json({ ok: true, inviati });
}
