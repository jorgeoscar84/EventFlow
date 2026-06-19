'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function PaymentToggle({ registrationId, paid }: { registrationId: string; paid: boolean }) {
  const [isPaid, setIsPaid] = useState(paid);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !isPaid;
    setIsPaid(next);
    start(async () => {
      await fetch(`/api/v1/registrations/${registrationId}/payment`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paid: next }),
      });
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        isPaid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50'
      } hover:opacity-80 disabled:opacity-50`}
    >
      {isPaid ? 'Pagó' : 'No pagó'}
    </button>
  );
}
