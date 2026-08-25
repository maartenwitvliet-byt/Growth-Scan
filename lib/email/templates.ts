/**
 * De twee e-mailtemplates uit sectie 12. Losse, makkelijk aanpasbare functies
 * zodat toon/lengte bijgesteld kan worden zonder de verzendlogica te raken.
 */

const senderName = process.env.EMAIL_SENDER_NAME || "Het team";
const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "ons";

export function thanksEmail(opts: { contactName: string; companyName: string; reportUrl: string }) {
  const subject = "Je Groei Scan-resultaat is binnen";
  const text = `Hoi ${opts.contactName},

Bedankt voor het invullen van de Revenue Growth Scan voor ${opts.companyName}. Je volledige rapport — inclusief benchmark en de 5 belangrijkste kansen — staat klaar: ${opts.reportUrl}

Groet, ${senderName}`;

  const html = `
    <div style="font-family: -apple-system, Inter, Arial, sans-serif; color: #161A23; max-width: 480px; margin: 0 auto;">
      <p>Hoi ${escapeHtml(opts.contactName)},</p>
      <p>Bedankt voor het invullen van de Revenue Growth Scan voor <strong>${escapeHtml(
        opts.companyName
      )}</strong>. Je volledige rapport — inclusief benchmark en de 5 belangrijkste kansen — staat klaar.</p>
      <p style="margin: 24px 0;">
        <a href="${opts.reportUrl}" style="background:#D8432B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          Bekijk je rapport
        </a>
      </p>
      <p>Groet,<br/>${escapeHtml(senderName)}</p>
    </div>
  `;
  return { subject, text, html };
}

export function coffeeEmail(opts: { contactName: string; companyName: string; agendaUrl: string }) {
  const subject = "Zullen we de uitkomst even doornemen?";
  const text = `Hoi ${opts.contactName},

Ik heb je resultaat gezien en denk dat er interessante kansen inzitten voor ${opts.companyName}. Zullen we daar een kwartiertje bij stilstaan? Plan hier een moment: ${opts.agendaUrl}

Groet, ${senderName}`;

  const html = `
    <div style="font-family: -apple-system, Inter, Arial, sans-serif; color: #161A23; max-width: 480px; margin: 0 auto;">
      <p>Hoi ${escapeHtml(opts.contactName)},</p>
      <p>Ik heb je resultaat gezien en denk dat er interessante kansen inzitten voor <strong>${escapeHtml(
        opts.companyName
      )}</strong>. Zullen we daar een kwartiertje bij stilstaan?</p>
      <p style="margin: 24px 0;">
        <a href="${opts.agendaUrl}" style="background:#D8432B;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          Plan een moment
        </a>
      </p>
      <p>Groet,<br/>${escapeHtml(senderName)}</p>
    </div>
  `;
  return { subject, text, html };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
