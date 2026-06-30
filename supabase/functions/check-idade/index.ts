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

function buildIdadeTemplate(c, nivelLabel, idadeMinima, idadeAtual, paroquiaNome, config) {
  const template = config.template_email_idade_body ??
    `Olá {nome_responsavel},\n\n{nome} está abaixo da idade mínima de {idade_minima} anos para o nível {nivel}.\nIdade atual: {idade_atual}.\n\nAtenciosamente,\n{paroquia}`;
  const values = {
    nome: c.nome ?? "",
    nome_responsavel: c.nome_responsavel ?? "responsável",
    nivel: nivelLabel,
    idade_atual: String(idadeAtual ?? ""),
    idade_minima: String(idadeMinima ?? ""),
    paroquia: paroquiaNome,
  };
  return textToHtml(renderTemplate(template, values));
}

Deno.serve(async () => {
  const { data: configs, error: configError } = await supabase
    .from('configuracoes_notificacao')
    .select('*, paroquias(nome)')
    .eq('notificacao_ativa_idade', true)

  if (configError) {
    console.error('Erro ao buscar configuracoes_notificacao', configError)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }

  for (const config of configs ?? []) {
    const { data: catequizandos, error: catequizandosError } = await supabase
      .from('catequizandos')
      .select('id, nome, data_nascimento, nivel, catequista_id, comunidade_id')
      .eq('paroquia_id', config.paroquia_id)
      .in('nivel', ['iniciacao', 'primeira_eucaristia', 'crisma'])

    if (catequizandosError) {
      console.error('Erro ao buscar catequizandos para notificacao de idade', catequizandosError, {
        paroquia_id: config.paroquia_id,
      })
      continue
    }

    for (const c of catequizandos ?? []) {
      const nascimento = new Date(c.data_nascimento)
      if (Number.isNaN(nascimento.getTime())) {
        console.warn('Data de nascimento inválida no catequizando', { catequizando_id: c.id, data_nascimento: c.data_nascimento })
        continue
      }

      const now = new Date()
      let idade = now.getFullYear() - nascimento.getFullYear()
      const m = now.getMonth() - nascimento.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < nascimento.getDate())) idade--

      let min = config.idade_min_iniciacao
      let nivelLabel = 'Iniciação'
      if (c.nivel === 'primeira_eucaristia') {
        min = config.idade_min_primeira_comunhao
        nivelLabel = 'Primeira Comunhão'
      }
      if (c.nivel === 'crisma') {
        min = config.idade_min_crisma
        nivelLabel = 'Crisma'
      }

      if (idade >= min) continue

      const trintaDias = new Date()
      trintaDias.setDate(trintaDias.getDate() - 30)

      const { data: logExistente, error: logError } = await supabase
        .from('notificacoes_log')
        .select('id')
        .eq('catequizando_id', c.id)
        .eq('tipo', 'idade')
        .gte('enviado_em', trintaDias.toISOString())
        .maybeSingle()

      if (logError) {
        console.error('Erro ao verificar log de notificacao de idade', logError, {
          catequizando_id: c.id,
        })
        continue
      }

      if (logExistente) continue

      const { data: catequista, error: catequistaError } = await supabase
        .from('catequistas')
        .select('nome, email')
        .eq('id', c.catequista_id)
        .maybeSingle()
      if (catequistaError) {
        console.error('Erro ao buscar catequista', catequistaError, { catequizando_id: c.id })
      }

      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['admin', 'coordenacao'])

      if (adminsError) {
        console.error('Erro ao buscar admins/coordenacao', adminsError)
      }

      const recipients = new Set<string>()
      if (catequista?.email) {
        recipients.add(catequista.email)
      }
      for (const admin of (admins ?? []) as any[]) {
        if (admin?.email) {
          recipients.add(admin.email)
        }
      }

      if (recipients.size === 0) {
        console.warn('Nenhum destinatário encontrado para notificacao de idade', { catequizando_id: c.id })
        continue
      }

      let sentAtLeastOne = false
      for (const recipient of recipients) {
        try {
          const subject = renderTemplate(
            config.template_email_idade_subject ?? "Aviso de idade — {nome}",
            {
              nome: c.nome ?? "",
              nivel: nivelLabel,
              idade_atual: String(idade ?? ""),
              idade_minima: String(min ?? ""),
              paroquia: config.paroquias?.nome ?? "",
            },
          );

          await enviarEmail(
            recipient,
            subject,
            buildIdadeTemplate(c, nivelLabel, min, idade, config.paroquias?.nome ?? 'Catequese', config),
          )
          sentAtLeastOne = true
        } catch (error) {
          console.error('Falha ao enviar email de idade', error, {
            catequizando_id: c.id,
            para: recipient,
          })
        }
      }

      if (!sentAtLeastOne) {
        continue
      }

      const { error: insertError } = await supabase.from('notificacoes_log').insert({
        catequizando_id: c.id,
        tipo: 'idade',
        enviado_para: Array.from(recipients).join(', '),
        detalhes: { nivel: c.nivel, idade_atual: idade, idade_minima: min },
      })

      if (insertError) {
        console.error('Falha ao gravar log de notificacao de idade', insertError, {
          catequizando_id: c.id,
        })
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
