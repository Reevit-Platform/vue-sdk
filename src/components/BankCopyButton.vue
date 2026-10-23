<script setup lang="ts">
/** A real Copy button: copies the plain value, reads "Copied" for two seconds, "Press ⌘C" where the clipboard is blocked. */
import { onScopeDispose, ref } from 'vue';
import { copyText, pasteHint } from '../utils/bank';

const props = defineProps<{ label: string; value: string }>();
const emit = defineEmits<{ (e: 'copied', message: string): void }>();

const COPIED_MS = 2000;
const state = ref<'idle' | 'done' | 'failed'>('idle');
let timer: ReturnType<typeof setTimeout> | null = null;
onScopeDispose(() => timer && clearTimeout(timer));

const copy = async () => {
  const ok = await copyText(props.value);
  state.value = ok ? 'done' : 'failed';
  emit('copied', ok ? `${props.label.toLowerCase()} copied` : 'Copy failed');
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => (state.value = 'idle'), COPIED_MS);
};
</script>

<template>
  <button
    type="button"
    class="reevit-copy"
    data-reevit="copy"
    :data-copy="label.toLowerCase()"
    :data-done="state === 'done' ? '1' : undefined"
    :aria-label="`Copy ${label.toLowerCase()}`"
    @click="copy"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="7" height="8" rx="1.5" /><path d="M10.5 3.5h-6a1 1 0 0 0-1 1v7" /></svg>
    <span>{{ state === 'done' ? 'Copied' : state === 'failed' ? pasteHint() : 'Copy' }}</span>
  </button>
</template>
