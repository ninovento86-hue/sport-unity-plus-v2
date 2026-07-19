import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // 1. Verifica che a chiamare sia davvero il trainer loggato
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const supabaseAsCaller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
  } = await supabaseAsCaller.auth.getUser();

  if (!user) {
    return NextResponse.json({ errore: "Non autenticato." }, { status: 401 });
  }

  const { data: profiloChiamante } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profiloChiamante?.role !== "trainer") {
    return NextResponse.json({ errore: "Non autorizzato." }, { status: 403 });
  }

  // 2. Crea/invita il nuovo cliente
  const { email, nome_completo } = await req.json();

  if (!email || !nome_completo) {
    return NextResponse.json(
      { errore: "Email e nome completo sono obbligatori." },
      { status: 400 }
    );
  }

  const { data: invito, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { data: { nome_completo } }
  );

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 400 });
  }

  // Il trigger handle_new_user crea già il profilo; qui ci assicuriamo
  // che il nome sia quello scritto dal trainer.
  await supabaseAdmin
    .from("profiles")
    .update({ nome_completo })
    .eq("id", invito.user.id);

  return NextResponse.json({ ok: true, id: invito.user.id });
}
