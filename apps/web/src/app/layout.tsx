import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

export const metadata: Metadata = {
  title: 'Eventflow — Plataforma de Eventos',
  description:
    'Crea, promociona y gestiona eventos presenciales y digitales: registro, confirmación, check-in QR, mensajería, sorteos y asistente IA.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
