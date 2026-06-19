import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une clases de Tailwind resolviendo conflictos. Base del design system. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
