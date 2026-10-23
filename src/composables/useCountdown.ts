import { computed, onScopeDispose, ref, watchEffect, getCurrentScope, type MaybeRefOrGetter, toValue } from 'vue';

/** Seconds left and the share of the window still ahead, ticking four times a second. */
export function useCountdown(
  expiresAt: MaybeRefOrGetter<number | null>,
  startedAt: MaybeRefOrGetter<number | null>,
  now: () => number = () => Date.now(),
) {
  const tick = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  watchEffect((onCleanup) => {
    if (!toValue(expiresAt)) return;
    timer = setInterval(() => (tick.value += 1), 250);
    onCleanup(stop);
  });
  if (getCurrentScope()) onScopeDispose(stop);

  return computed(() => {
    void tick.value;
    const end = toValue(expiresAt);
    if (!end) return { seconds: 0, fraction: 0 };
    const remaining = Math.max(0, end - now());
    const total = Math.max(1, end - (toValue(startedAt) ?? end - 120_000));
    return { seconds: Math.ceil(remaining / 1000), fraction: Math.min(1, remaining / total) };
  });
}
