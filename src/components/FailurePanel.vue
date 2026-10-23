<script setup lang="ts">
/** Failure panel (Ledger result). */
defineProps<{
  title: string;
  message: string;
}>();

const emit = defineEmits<{ (e: 'retry'): void }>();
</script>

<template>
  <div class="reevit-result" data-reevit="failure">
    <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
      <span class="reevit-fail-dot" aria-hidden="true" />{{ title }}
    </h2>
    <p class="reevit-text">{{ message }}</p>
    <button type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="emit('retry')">Try again</button>
  </div>
</template>
