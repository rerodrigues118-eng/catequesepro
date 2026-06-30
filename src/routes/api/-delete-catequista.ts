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

    // 1. Encontrar o perfil correspondente ao catequista_id
    const { data: profile, error: findProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("catequista_id", catequista_id)
      .maybeSingle();

    if (findProfileError) {
      return new Response(JSON.stringify({ error: `Erro ao buscar perfil: ${findProfileError.message}` }), { status: 500 });
    }

    if (profile) {
      if (profile.role === "admin") {
        return new Response(JSON.stringify({ error: "Não é possível excluir um administrador do sistema." }), { status: 400 });
      }

      // 2. Desassociar presenças registradas por este usuário
      const { error: presencaError } = await supabaseAdmin
        .from("presencas")
        .update({ criado_por: null })
        .eq("criado_por", profile.id);

      if (presencaError) {
        return new Response(JSON.stringify({ error: `Erro ao desassociar presenças: ${presencaError.message}` }), { status: 500 });
      }

      // 3. Excluir o perfil
      const { error: deleteProfileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", profile.id);

      if (deleteProfileError) {
        return new Response(JSON.stringify({ error: `Erro ao deletar perfil: ${deleteProfileError.message}` }), { status: 500 });
      }

      // 4. Deletar usuário no Auth do Supabase
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
      if (deleteAuthError) {
        console.error("Erro ao deletar usuário do auth do Supabase:", deleteAuthError.message);
        // Não falhamos a requisição inteira aqui se o usuário já não existir no Auth
      }
    }

    // 5. Desassociar catequizandos vinculados a este catequista
    const { error: catequizandosError } = await supabaseAdmin
      .from("catequizandos")
      .update({ catequista_id: null })
      .eq("catequista_id", catequista_id);

    if (catequizandosError) {
      return new Response(JSON.stringify({ error: `Erro ao desassociar catequizandos: ${catequizandosError.message}` }), { status: 500 });
    }

    // 6. Desassociar atividades vinculadas a este catequista
    const { error: atividadesError } = await supabaseAdmin
      .from("atividades")
      .update({ catequista_id: null })
      .eq("catequista_id", catequista_id);

    if (atividadesError) {
      return new Response(JSON.stringify({ error: `Erro ao desassociar atividades: ${atividadesError.message}` }), { status: 500 });
    }

    // 6.5. Desassociar turmas vinculadas a este catequista
    const { error: turmasError } = await supabaseAdmin
      .from("turmas_vagas")
      .update({ catequista_id: null })
      .eq("catequista_id", catequista_id);

    if (turmasError) {
      return new Response(JSON.stringify({ error: `Erro ao desassociar turmas: ${turmasError.message}` }), { status: 500 });
    }

    // 6.6. Desassociar planos de aula vinculados a este catequista
    const { error: planosError } = await supabaseAdmin
      .from("plano_aulas")
      .update({ catequista_id: null })
      .eq("catequista_id", catequista_id);

    if (planosError) {
      return new Response(JSON.stringify({ error: `Erro ao desassociar planos de aula: ${planosError.message}` }), { status: 500 });
    }

    // 6.7. Desassociar avisos vinculados a este catequista
    const { error: avisosError } = await supabaseAdmin
      .from("avisos_mural")
      .update({ catequista_id: null })
      .eq("catequista_id", catequista_id);

    if (avisosError) {
      return new Response(JSON.stringify({ error: `Erro ao desassociar avisos: ${avisosError.message}` }), { status: 500 });
    }

    // 7. Deletar convite associado
    const { error: inviteError } = await supabaseAdmin
      .from("convites")
      .delete()
      .eq("catequista_id", catequista_id);

    if (inviteError) {
      return new Response(JSON.stringify({ error: `Erro ao deletar convite: ${inviteError.message}` }), { status: 500 });
    }

    // 8. Deletar o catequista na tabela catequistas
    const { error: deleteCatequistaError } = await supabaseAdmin
      .from("catequistas")
      .delete()
      .eq("id", catequista_id);

    if (deleteCatequistaError) {
      return new Response(JSON.stringify({ error: `Erro ao deletar catequista: ${deleteCatequistaError.message}` }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro interno." }), { status: 500 });
  }
}
