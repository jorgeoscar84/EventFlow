/** Selección de ganador de sorteo con semilla auditable. PRD/05 M9. */

/** PRNG determinista (mulberry32) a partir de una semilla numérica. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Selecciona un ganador entre los elegibles de forma determinista y auditable.
 * `excludeIds` evita repetir ganadores. Devuelve null si no quedan elegibles.
 */
export function pickWinner(
  eligibleIds: string[],
  seed: string,
  round: number,
  excludeIds: string[] = [],
): string | null {
  const pool = eligibleIds.filter((id) => !excludeIds.includes(id));
  if (pool.length === 0) return null;
  const rng = mulberry32(hashSeed(`${seed}:${round}`));
  const index = Math.floor(rng() * pool.length);
  return pool[index] ?? null;
}
