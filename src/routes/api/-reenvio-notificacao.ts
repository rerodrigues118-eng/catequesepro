import { supabaseAdmin } from "@/lib/supabase.server";
import { sendEmail } from "@/lib/email";

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

  if (profile.role !== "admin") {
    return { ok: false, error: "Apenas administradores podem reenviar notificações." };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  try {
    // Verificar autenticação e role admin
    const authCheck = await verifyAdminAuth(request);
    if (!authCheck.ok) {
      return new Response(JSON.stringify({ error: authCheck.error }), { status: 403 });
    }

    const body = await request.json();
    const { notificacao_id } = body as { notificacao_id?: string };

    if (!notificacao_id) {
      return new Response(JSON.stringify({ error: "ID da notificação é obrigatório." }), { status: 400 });
    }

    const { data: log, error: logError } = await supabaseAdmin
      .from("notificacoes_log")
      .select("*, catequizandos(*), configuracoes_notificacao(*, paroquias(nome))")
      .eq("id", notificacao_id)
      .maybeSingle();

    if (logError) {
      return new Response(JSON.stringify({ error: logError.message }), { status: 500 });
    }

    if (!log) {
      return new Response(JSON.stringify({ error: "Notificação não encontrada." }), { status: 404 });
    }

    const tipo = log.tipo;
    const catequizando = (log as any).catequizandos;
    const config = (log as any).configuracoes_notificacao;

    if (!catequizando || !config) {
      return new Response(JSON.stringify({ error: "Dados insuficientes para reenvio." }), { status: 500 });
    }

    const placeholderMap: Record<string, string> = {
      nome: catequizando.nome ?? "",
      nome_responsavel: catequizando.nome_responsavel ?? "responsável",
      total_faltas: String((log as any).detalhes?.total_faltas ?? ""),
      max_faltas: String((log as any).detalhes?.max_faltas ?? ""),
      nivel: String((log as any).detalhes?.nivel ?? ""),
      idade_atual: String((log as any).detalhes?.idade_atual ?? ""),
      idade_minima: String((log as any).detalhes?.idade_minima ?? ""),
      paroquia: config.paroquias?.nome ?? "",
    };

    const templateSubject = tipo === "faltas"
      ? config.template_email_faltas_subject
      : config.template_email_idade_subject;

    const templateBody = tipo === "faltas"
      ? config.template_email_faltas_body
      : config.template_email_idade_body;

    const subject = templateSubject.replace(/\{(\w+)\}/g, (_, key) => placeholderMap[key] ?? "");
    const bodyText = templateBody.replace(/\{(\w+)\}/g, (_, key) => placeholderMap[key] ?? "");

    await sendEmail({
      to: (log as any).enviado_para,
      subject,
      text: bodyText,
    });

    const { error: insertError } = await supabaseAdmin.from("notificacoes_log").insert({
      catequizando_id: catequizando.id,
      tipo,
      enviado_para: (log as any).enviado_para,
      detalhes: { reenvio_de: notificacao_id, ...log.detalhes },
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro desconhecido." }), { status: 500 });
  }
}
