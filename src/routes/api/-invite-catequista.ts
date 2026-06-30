import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase.server";
import { sendInviteEmail } from "@/lib/email";

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
    return { ok: false, error: "Apenas administradores e coordenadores podem convidar catequistas." };
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

    const rawBody = await request.text();
    let body: Record<string, unknown> = {};

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        const params = new URLSearchParams(rawBody);
        body = Object.fromEntries(params.entries());
      }
    }

    const { nome, email, comunidade_id, role } = body;
    if (!nome || !email || !comunidade_id) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes." }), { status: 400 });
    }

    const { data: comunidade } = await supabaseAdmin
      .from("comunidades")
      .select("id")
      .eq("id", comunidade_id)
      .single();

    if (!comunidade) {
      return new Response(JSON.stringify({ error: "Comunidade inválida." }), { status: 400 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: catequista, error: catequistaError } = await supabaseAdmin
      .from("catequistas")
      .insert({ nome, email, comunidade_id, status: "pending" })
      .select("id")
      .single();

    if (catequistaError || !catequista) {
      return new Response(JSON.stringify({ error: catequistaError?.message ?? "Falha ao criar catequista." }), { status: 500 });
    }

    const roleValue = (role === "coordenacao") ? "coordenacao" : "catequista";

    const { data: convite, error: conviteError } = await supabaseAdmin
      .from("convites")
      .insert({
        id: token,
        email,
        nome,
        comunidade_id,
        catequista_id: catequista.id,
        expira_em: expiresAt,
        usado: false,
        role: roleValue,
      })
      .select("id")
      .single();

    if (conviteError || !convite) {
      return new Response(JSON.stringify({ error: conviteError?.message ?? "Falha ao salvar convite." }), { status: 500 });
    }

    const origin = request.headers.get("origin") ?? "";
    const inviteLink = origin ? `${origin}/register?token=${token}` : `/register?token=${token}`;

    let emailStatus = "not_sent";
    let emailError: string | null = null;
    try {
      await sendInviteEmail({ to: email, nome, inviteLink });
      emailStatus = "sent";
    } catch (err) {
      emailStatus = "failed";
      emailError = (err as Error).message ?? "Falha no envio de email.";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email,
        inviteLink,
        token,
        emailStatus,
        emailError,
      }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Erro desconhecido." }), { status: 500 });
  }
}
