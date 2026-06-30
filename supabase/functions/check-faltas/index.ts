import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

async function enviarEmail(para: string, assunto: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Catequese <noreply@suaparoquia.com.br>',
      to: [para],
      subject: assunto,
      html,
    }),
  })
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao enviar email: ${response.status} ${text}`);
  }
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function textToHtml(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => `<p style="margin:0 0 12px">${line.trim() || ""}</p>`)
    .join("\n");
}

function buildFaltasTemplate(c, config) {
  const template = config.template_email_faltas_body ??
    `Olá {nome_responsavel},\n\n{nome} acumulou {total_faltas} faltas no mês, atingindo o limite de {max_faltas}.\n\nAtenciosamente,\n{paroquia}`;
  const values = {
    nome: c.nome ?? "",
    nome_responsavel: c.nome_responsavel ?? "responsável",
    total_faltas: String(c.total_faltas ?? ""),
    max_faltas: String(config.max_faltas ?? ""),
    paroquia: config.paroquias?.nome ?? "",
  };
  return textToHtml(renderTemplate(template, values));
}

Deno.serve(async () => {
  const { data: configs, error: configError } = await supabase
    .from('configuracoes_notificacao')
    .select('*, paroquias(nome)')
    .eq('notificacao_ativa_faltas', true)

  if (configError) {
    console.error('Erro ao buscar configuracoes_notificacao', configError)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }

  for (const config of configs ?? []) {
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const { data: faltosos, error: faltososError } = await supabase.rpc('contar_faltas_mes', {
      p_paroquia_id: config.paroquia_id,
      p_inicio_mes: inicioMes.toISOString(),
      p_max_faltas: config.max_faltas,
    })

    if (faltososError) {
      console.error('Erro ao contar faltas no mês', faltososError, { paroquia_id: config.paroquia_id })
      continue
    }

    for (const c of faltosos ?? []) {
      const { data: logExistente, error: logError } = await supabase
        .from('notificacoes_log')
        .select('id')
        .eq('catequizando_id', c.id)
        .eq('tipo', 'faltas')
        .gte('enviado_em', inicioMes.toISOString())
        .maybeSingle()

      if (logError) {
        console.error('Erro ao verificar log de notificacao de faltas', logError, { catequizando_id: c.id })
        continue
      }

      if (logExistente) continue
      if (!c.email_responsavel) {
        console.warn('Catequizando sem email responsavel para notificacao de faltas', { catequizando_id: c.id })
        continue
      }

      try {
        const subject = renderTemplate(
          config.template_email_faltas_subject ?? "Aviso de faltas — {nome}",
          {
            nome: c.nome ?? "",
            total_faltas: String(c.total_faltas ?? ""),
            max_faltas: String(config.max_faltas ?? ""),
            paroquia: config.paroquias?.nome ?? "",
          },
        );

        await enviarEmail(
          c.email_responsavel,
          subject,
          buildFaltasTemplate(c, config),
        );
      } catch (error) {
        console.error('Falha ao enviar email de faltas', error, {
          catequizando_id: c.id,
          email_responsavel: c.email_responsavel,
        })
        continue
      }

      const { error: insertError } = await supabase.from('notificacoes_log').insert({
        catequizando_id: c.id,
        tipo: 'faltas',
        enviado_para: c.email_responsavel,
        detalhes: { total_faltas: c.total_faltas, max_faltas: config.max_faltas },
      })

      if (insertError) {
        console.error('Falha ao gravar log de notificacao de faltas', insertError, {
          catequizando_id: c.id,
        })
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
