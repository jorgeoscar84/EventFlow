import { z } from 'zod';

/** Validaciones de dominio compartidas (cliente + servidor). PRD/06 §6.3. */

export const registrationInputSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(5).max(30),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  ticketTypeId: z.string().uuid().nullable().optional(),
  consentMarketing: z.boolean().default(false),
});
export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export const eventTypeSchema = z.enum(['in_person', 'digital', 'hybrid']);

export const createEventSchema = z
  .object({
    title: z.string().min(3).max(160),
    type: eventTypeSchema,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    timezone: z.string().default('UTC'),
    capacity: z.number().int().positive().nullable().optional(),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    onlineUrl: z.string().url().optional(),
    requiresPayment: z.boolean().default(false),
    requiresConfirmation: z.boolean().default(true),
    confirmationDeadlineHours: z.number().int().min(0).max(720).default(24),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: 'endsAt debe ser posterior a startsAt',
    path: ['endsAt'],
  })
  .refine((d) => d.type === 'digital' || !!d.locationName, {
    message: 'Eventos presenciales/híbridos requieren ubicación',
    path: ['locationName'],
  })
  .refine((d) => d.type === 'in_person' || !!d.onlineUrl, {
    message: 'Eventos digitales/híbridos requieren onlineUrl',
    path: ['onlineUrl'],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const aiChatInputSchema = z.object({
  tenantSlug: z.string().min(1),
  eventSlug: z.string().optional(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  lang: z.string().optional(),
});
export type AiChatInput = z.infer<typeof aiChatInputSchema>;
