import { describe, it, expect } from 'vitest';
import { pickWinner } from './raffle';
import { canTransition, attendanceRate } from './registration-status';

describe('pickWinner', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];

  it('es determinista con la misma semilla y ronda', () => {
    expect(pickWinner(pool, 'seed-123', 1)).toBe(pickWinner(pool, 'seed-123', 1));
  });

  it('excluye ganadores previos', () => {
    const first = pickWinner(pool, 'seed-x', 1)!;
    const second = pickWinner(pool, 'seed-x', 2, [first]);
    expect(second).not.toBe(first);
  });

  it('devuelve null cuando no quedan elegibles', () => {
    expect(pickWinner(['a'], 'seed', 1, ['a'])).toBeNull();
  });
});

describe('registration status', () => {
  it('permite registered -> confirmed', () => {
    expect(canTransition('registered', 'confirmed')).toBe(true);
  });
  it('no permite cancelled -> attended', () => {
    expect(canTransition('cancelled', 'attended')).toBe(false);
  });
  it('calcula la tasa de asistencia', () => {
    expect(attendanceRate({ registered: 100, confirmed: 80, attended: 60, noShow: 20 })).toBe(0.75);
  });
});
