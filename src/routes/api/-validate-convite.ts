import { supabaseAdmin } from "@/lib/supabase.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "Token ausente." }), { status: 400 });
  }

  const { data: convite, error } = await supabaseAdmin
    .from("convites")
    .select("id, email, nome, expira_em, usado")
    .eq("id", token)
    .single();

  if (error || !convite) {
    return new Response(JSON.stringify({ error: "Convite inválido." }), { status: 404 });
  }

  if (convite.usado) {
    return new Response(JSON.stringify({ error: "Convite já utilizado." }), { status: 400 });
  }

  if (new Date(convite.expira_em) < new Date()) {
    return new Response(JSON.stringify({ error: "Convite expirado." }), { status: 400 });
  }

  return new Response(JSON.stringify({ invite: { email: convite.email, nome: convite.nome } }), { status: 200 });
}
