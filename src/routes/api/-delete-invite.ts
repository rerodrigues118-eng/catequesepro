import { supabaseAdmin } from "@/lib/supabase.server";

async function verifyAdminAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, error: "Token de autenticação ausente." };
  }

  const token = authHeader.slice(7);
  const { data: user, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.user?.id) {
    return { ok: false, error: "Token de autenticação inválido." };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Perfil de usuário não encontrado." };
  }

  if (profile.role !== "admin" && profile.role !== "coordenacao") {
    return { ok: false, error: "Apenas administradores e coordenadores podem executar esta ação." };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  try {
    const authCheck = await verifyAdminAuth(request);
    if (!authCheck.ok) {
      return new Response(JSON.stringify({ error: authCheck.error }), { status: 403 });
    }

    const body = await request.json();
    const { catequista_id } = body;

    if (!catequista_id) {
      return new Response(JSON.stringify({ error: "O campo catequista_id é obrigatório." }), { status: 400 });
    }

    // 1. Deletar convite associado
    const { error: inviteError } = await supabaseAdmin
      .from("convites")
      .delete()
      .eq("catequista_id", catequista_id);

    if (inviteError) {
      return new Response(JSON.stringify({ error: `Erro ao deletar convite: ${inviteError.message}` }), { status: 500 });
    }

    // 2. Deletar catequista pendente
    const { error: catequistaError } = await supabaseAdmin
      .from("catequistas")
      .delete()
      .eq("id", catequista_id)
      .eq("status", "pending");

    if (catequistaError) {
      return new Response(JSON.stringify({ error: `Erro ao deletar catequista: ${catequistaError.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro interno." }), { status: 500 });
  }
}
