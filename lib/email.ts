import { Resend } from "resend";
import { thanksEmail, coffeeEmail } from "./email/templates";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const from = process.env.EMAIL_FROM || "Revenue Growth Scan <onboarding@resend.dev>";

/**
 * Stuurt beide mails uit sectie 12. Faalt nooit hoorbaar voor de gebruiker
 * (sectie 14) — fouten worden gelogd, niet gethrowd naar de caller die de
 * request al heeft afgehandeld.
 */
export async function sendResultEmails(opts: {
  to: string;
  contactName: string;
  companyName: string;
  reportUrl: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY ontbreekt — mails overgeslagen voor", opts.to);
    return;
  }

  try {
    const thanks = thanksEmail({ contactName: opts.contactName, companyName: opts.companyName, reportUrl: opts.reportUrl });
    await resend.emails.send({ from, to: opts.to, subject: thanks.subject, html: thanks.html, text: thanks.text });
  } catch (err) {
    console.error("[email] bedankmail mislukt voor", opts.to, err);
  }

  const agendaUrl = process.env.COFFEE_AGENDA_URL || "#";
  const delayMinutes = Number(process.env.COFFEE_EMAIL_DELAY_MINUTES ?? 0);

  const sendCoffee = async () => {
    try {
      const coffee = coffeeEmail({ contactName: opts.contactName, companyName: opts.companyName, agendaUrl });
      await resend.emails.send({ from, to: opts.to, subject: coffee.subject, html: coffee.html, text: coffee.text });
    } catch (err) {
      console.error("[email] koffie-uitnodiging mislukt voor", opts.to, err);
    }
  };

  if (delayMinutes > 0) {
    // Eenvoudige in-process vertraging (TODO sectie 15.6). Voor productie met
    // veel verkeer is een queue (bv. een cron-job of Resend "scheduled at")
    // robuuster dan een timer die de serverless-functie kan overleven.
    setTimeout(sendCoffee, delayMinutes * 60 * 1000);
  } else {
    await sendCoffee();
  }
}
