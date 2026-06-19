import { cn } from '@eventflow/ui';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-white/10 bg-white/[0.03] p-6', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-white/10 text-white/70',
  published: 'bg-emerald-500/15 text-emerald-300',
  archived: 'bg-white/10 text-white/40',
  finished: 'bg-blue-500/15 text-blue-300',
  active: 'bg-emerald-500/15 text-emerald-300',
  suspended: 'bg-red-500/15 text-red-300',
  trial: 'bg-amber-500/15 text-amber-300',
};

export function Badge({ children, kind = 'draft' }: { children: React.ReactNode; kind?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[kind] ?? 'bg-white/10 text-white/70',
      )}
    >
      {children}
    </span>
  );
}
