import { supabaseAdmin } from "@/lib/supabase.server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;
    if (!token || !password) {
      return new Response(JSON.stringify({ error: "Token e senha são obrigatórios." }), { status: 400 });
    }

    const { data: convite, error: findError } = await supabaseAdmin
      .from("convites")
      .select("id, email, nome, comunidade_id, catequista_id, expira_em, usado, role")
      .eq("id", token)
      .single();

    if (findError || !convite) {
      return new Response(JSON.stringify({ error: "Convite inválido." }), { status: 404 });
    }

    if (convite.usado) {
      return new Response(JSON.stringify({ error: "Convite já utilizado." }), { status: 400 });
    }

    if (new Date(convite.expira_em) < new Date()) {
      return new Response(JSON.stringify({ error: "Convite expirado." }), { status: 400 });
    }

    const { data, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: convite.email,
      password,
      email_confirm: true,
      user_metadata: { nome: convite.nome },
    });

    const createdUser = data?.user;

    if (userError || !createdUser) {
      return new Response(JSON.stringify({ error: userError?.message ?? "Falha ao criar usuário." }), { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: createdUser.id,
      role: convite.role ?? "catequista",
      catequista_id: convite.catequista_id,
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message ?? "Falha ao criar perfil." }), { status: 500 });
    }

    const { error: updateConviteError } = await supabaseAdmin
      .from("convites")
      .update({ usado: true })
      .eq("id", token);

    if (updateConviteError) {
      return new Response(JSON.stringify({ error: updateConviteError.message ?? "Falha ao marcar convite como usado." }), { status: 500 });
    }

    const { error: updateCatequistaError } = await supabaseAdmin
      .from("catequistas")
      .update({ status: "active" })
      .eq("id", convite.catequista_id);

    if (updateCatequistaError) {
      return new Response(JSON.stringify({ error: updateCatequistaError.message ?? "Falha ao ativar catequista." }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro desconhecido." }), { status: 500 });
  }
}
