import { z } from "zod";

export const SECTOR_OPTIONS = [
  "SaaS / software",
  "Zakelijke dienstverlening",
  "Consultancy",
  "Financiële diensten",
  "Retail / e-commerce",
  "Industrie & productie",
  "Bouw & vastgoed",
  "Zorg",
  "Marketing & reclame",
  "Anders",
] as const;

export const contactSchema = z.object({
  company_name: z.string().trim().min(2, "Vul een bedrijfsnaam in."),
  contact_name: z.string().trim().min(2, "Vul je naam in."),
  email: z.string().trim().email("Vul een geldig e-mailadres in."),
  phone: z
    .string()
    .trim()
    .min(6, "Vul een geldig telefoonnummer in.")
    .regex(/^[0-9+()\-\s]+$/, "Gebruik alleen cijfers en +, -, (, ) of spaties."),
  sector: z.string().trim().optional().or(z.literal("")),
  consent_marketing: z.literal(true, {
    errorMap: () => ({ message: "Ga akkoord om je resultaat te kunnen ontvangen." }),
  }),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const submissionSchema = contactSchema.extend({
  answers: z.record(z.string(), z.number().int().min(1).max(5)),
});

export type SubmissionPayload = z.infer<typeof submissionSchema>;
