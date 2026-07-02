import nodemailer from "nodemailer";

interface SendInviteEmailOptions {
  to: string;
  nome: string;
  inviteLink: string;
}

function parseFromAddress(from: string) {
  const normalized = from.replace(/^['"]|['"]$/g, "").trim();
  const match = normalized.match(/^(.+?)\s*<([^>]+)>$/);

  if (match) {
    return {
      name: match[1].trim() || "CatequesePRO",
      email: match[2].trim(),
    };
  }

  return {
    name: "CatequesePRO",
    email: normalized,
  };
}

export function getEmailErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (!message) {
    return "Falha no envio de email.";
  }

  if (normalized.includes("unauthorized ip") || normalized.includes("525")) {
    return "O provedor bloqueou o envio por IP não autorizado. Autorize o IP do servidor no painel do provedor ou troque a configuração SMTP.";
  }

  if (
    normalized.includes("invalid login") ||
    normalized.includes("authentication failed") ||
    normalized.includes("535")
  ) {
    return "As credenciais SMTP estão incorretas ou não autorizadas para este provedor.";
  }

  if (
    normalized.includes("timed out") ||
    normalized.includes("econnrefused") ||
    normalized.includes("connect")
  ) {
    return "Não foi possível conectar ao servidor SMTP. Verifique o host, a porta e a conectividade da rede.";
  }

  return message;
}

function createTransporter() {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const smtpUrl = process.env.SMTP_URL;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (sendgridKey) {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: sendgridKey,
      },
    });
  }

  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Email provider is not configured. Set SENDGRID_API_KEY, SMTP_URL or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

function normalizeRecipient(to: string | string[]) {
  if (Array.isArray(to)) return to.join(", ");
  return to;
}

function htmlFromText(text: string) {
  return text.replace(/\n/g, "<br />");
}

async function sendWithBrevoEmail({ to, subject, text, html }: SendEmailOptions) {
  const apiKey = process.env.BREVO_API_KEY ?? process.env.BREVO_API_V3_KEY;
  if (!apiKey) {
    throw new Error("Brevo API key is not configured.");
  }

  const from =
    process.env.EMAIL_FROM ??
    process.env.BREVO_SENDER_EMAIL ??
    "CatequesePRO <no-reply@catequesepro.local>";
  const { name: senderName, email: senderEmail } = parseFromAddress(from);

  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
    subject,
  };

  if (text) payload.textContent = text;
  if (html) payload.htmlContent = html;
  else if (text) payload.htmlContent = htmlFromText(text);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo API error ${response.status}: ${body}`);
  }
  return body ? JSON.parse(body) : { ok: true };
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  const brevoApiKey = process.env.BREVO_API_KEY ?? process.env.BREVO_API_V3_KEY;
  // Prefer Brevo API when available, but fall back to SMTP transport if Brevo fails
  if (brevoApiKey) {
    try {
      return await sendWithBrevoEmail({ to, subject, text, html });
    } catch (error) {
      console.error("Falha ao enviar email via Brevo, tentando SMTP como fallback:", error);
      // try SMTP fallback
      try {
        const transporter = createTransporter();
        const from = process.env.EMAIL_FROM ?? "CatequesePRO <no-reply@catequesepro.local>";
        const textContent = text ?? "";
        const htmlContent = html ?? (text ? htmlFromText(text) : "");

        const info = await transporter.sendMail({
          from,
          to: normalizeRecipient(to),
          subject,
          text: textContent,
          html: htmlContent,
        });

        return info;
      } catch (smtpError) {
        console.error("Falha ao enviar email via SMTP após erro Brevo:", smtpError);
        throw new Error(getEmailErrorMessage(smtpError));
      }
    }
  }

  // No Brevo API key: use SMTP transport
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM ?? "CatequesePRO <no-reply@catequesepro.local>";
  const textContent = text ?? "";
  const htmlContent = html ?? (text ? htmlFromText(text) : "");

  try {
    const info = await transporter.sendMail({
      from,
      to: normalizeRecipient(to),
      subject,
      text: textContent,
      html: htmlContent,
    });

    return info;
  } catch (error) {
    console.error("Falha ao enviar email via SMTP:", error);
    throw new Error(getEmailErrorMessage(error));
  }
}

async function sendWithBrevo({ to, nome, inviteLink }: SendInviteEmailOptions) {
  const apiKey = process.env.BREVO_API_KEY ?? process.env.BREVO_API_V3_KEY;
  if (!apiKey) {
    throw new Error("Brevo API key is not configured.");
  }

  const from =
    process.env.EMAIL_FROM ??
    process.env.BREVO_SENDER_EMAIL ??
    "CatequesePRO <no-reply@catequesepro.local>";
  const { name: senderName, email: senderEmail } = parseFromAddress(from);
  const subject = "Você foi convidado para acessar o CatequesePRO";
  const textContent = `Olá ${nome},\n\nVocê foi convidado para acessar o CatequesePRO. Clique no link abaixo para aceitar o convite e criar sua conta:\n\n${inviteLink}\n\nEste link expira em 48 horas.\n\nSe você não solicitou este convite, ignore este email.`;
  const htmlContent = `
    <p>Olá ${nome},</p>
    <p>Você foi convidado para acessar o <strong>CatequesePRO</strong>.</p>
    <p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
    <p><a href="${inviteLink}">Aceitar convite</a></p>
    <p>Este link expira em 48 horas.</p>
    <p>Se você não solicitou este convite, ignore este email.</p>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: nome }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo API error ${response.status}: ${payload}`);
  }

  return payload ? JSON.parse(payload) : { ok: true };
}

export async function sendInviteEmail({ to, nome, inviteLink }: SendInviteEmailOptions) {
  const subject = "Você foi convidado para acessar o CatequesePRO";
  const text = `Olá ${nome},\n\nVocê foi convidado para acessar o CatequesePRO. Clique no link abaixo para aceitar o convite e criar sua conta:\n\n${inviteLink}\n\nEste link expira em 48 horas.\n\nSe você não solicitou este convite, ignore este email.`;
  const html = `
    <p>Olá ${nome},</p>
    <p>Você foi convidado para acessar o <strong>CatequesePRO</strong>.</p>
    <p>Clique no link abaixo para aceitar o convite e criar sua conta:</p>
    <p><a href="${inviteLink}">Aceitar convite</a></p>
    <p>Este link expira em 48 horas.</p>
    <p>Se você não solicitou este convite, ignore este email.</p>
  `;

  return await sendEmail({ to, subject, text, html });
}
