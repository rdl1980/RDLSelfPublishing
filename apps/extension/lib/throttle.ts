/** Esegue `tasks` con al massimo `concurrency` in parallelo e una pausa casuale tra una richiesta e l'altra. */
export async function runPool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  opts: { concurrency?: number; minGapMs?: number; maxGapMs?: number; signal?: AbortSignal; onEach?: (result: R, item: T) => void } = {},
): Promise<{ results: (R | undefined)[]; errors: { item: T; error: unknown }[] }> {
  const concurrency = Math.max(1, Math.min(3, opts.concurrency ?? 2));
  const minGap = opts.minGapMs ?? 300;
  const maxGap = opts.maxGapMs ?? 700;
  const results: (R | undefined)[] = new Array(items.length);
  const errors: { item: T; error: unknown }[] = [];
  let next = 0;

  const run = async () => {
    while (next < items.length) {
      if (opts.signal?.aborted) return;
      const i = next++;
      const item = items[i]!;
      try {
        const r = await worker(item, i);
        results[i] = r;
        opts.onEach?.(r, item);
      } catch (error) {
        errors.push({ item, error });
        if (error instanceof Error && error.name === 'BotChallengeError') return; // ferma il pool
      }
      await sleep(minGap + Math.random() * Math.max(0, maxGap - minGap));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return { results, errors };
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
