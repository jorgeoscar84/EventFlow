'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  const padded = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur sm:h-20 sm:w-20">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={padded}
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-display absolute inset-0 flex items-center justify-center text-3xl tabular-nums sm:text-4xl"
          >
            {padded}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="eyebrow mt-2 !tracking-[0.2em]">{label}</span>
    </div>
  );
}

export function Countdown({ target }: { target: string | number | Date }) {
  const targetMs = new Date(target).getTime();
  const [t, setT] = useState(() => diff(targetMs));

  useEffect(() => {
    const id = setInterval(() => setT(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Unit value={t.d} label="Días" />
      <Unit value={t.h} label="Horas" />
      <Unit value={t.m} label="Min" />
      <Unit value={t.s} label="Seg" />
    </div>
  );
}
