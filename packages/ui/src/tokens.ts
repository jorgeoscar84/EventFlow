/**
 * Design tokens — estética minimalista/tecnológica (PRD/08).
 * El acento es sobrescribible por tenant en runtime vía variables CSS.
 */
export const tokens = {
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
  },
  font: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  // Estados del funnel de registro (badges) — PRD/04 §4.5
  statusColor: {
    registered: '#64748b', // slate-500
    confirmed: '#2563eb', // blue-600
    attended: '#16a34a', // green-600
    no_show: '#dc2626', // red-600
    waitlist: '#d97706', // amber-600
    cancelled: '#94a3b8', // slate-400
  },
} as const;

export type StatusColorKey = keyof typeof tokens.statusColor;
