import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eventflow — Plataforma de Eventos',
  description:
    'Crea, promociona y gestiona eventos presenciales y digitales: registro, confirmación, check-in QR, mensajería, sorteos y asistente IA.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
