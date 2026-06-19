'use client';

import { useActionState } from 'react';
import { motion } from 'framer-motion';
import { registerAction, type RegisterState } from './actions';

interface CustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: unknown;
}

const initial: RegisterState = { error: null };

const field =
  'h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/30 transition-colors focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
const label = 'mb-1.5 block text-sm font-medium text-white/70';

export function RegisterForm({
  tenant,
  eventSlug,
  customFields,
}: {
  tenant: string;
  eventSlug: string;
  customFields: CustomField[];
}) {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <motion.form
      action={formAction}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <input type="hidden" name="__tenant" value={tenant} />
      <input type="hidden" name="__event" value={eventSlug} />

      <div>
        <label className={label} htmlFor="fullName">
          Nombre completo
        </label>
        <input id="fullName" name="fullName" required className={field} placeholder="Tu nombre" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className={field} placeholder="tu@correo.com" />
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Teléfono
          </label>
          <input id="phone" name="phone" required className={field} placeholder="+1 809 555 1234" />
        </div>
      </div>

      {customFields.map((f) => (
        <div key={f.key}>
          <label className={label} htmlFor={`cf_${f.key}`}>
            {f.label}
          </label>
          {f.type === 'select' && Array.isArray(f.options) ? (
            <select id={`cf_${f.key}`} name={`cf_${f.key}`} required={f.required} className={field}>
              <option value="">Selecciona…</option>
              {(f.options as string[]).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`cf_${f.key}`}
              name={`cf_${f.key}`}
              required={f.required}
              className={field}
              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
            />
          )}
        </div>
      ))}

      <label className="flex items-start gap-3 text-sm text-white/55">
        <input type="checkbox" name="consentMarketing" className="mt-0.5 h-4 w-4 rounded" />
        Acepto recibir comunicaciones sobre este y futuros eventos.
      </label>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.01] disabled:opacity-60"
      >
        {pending ? 'Registrando…' : 'Confirmar registro'}
        {!pending && <span className="transition-transform group-hover:translate-x-1">→</span>}
      </button>
    </motion.form>
  );
}
