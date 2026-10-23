<script setup lang="ts">
/** Back chevron + title row used by every detail panel. */
defineProps<{
  title: string;
  /** Pass false when the panel is the only step (nothing to go back to). */
  back?: boolean;
}>();

const emit = defineEmits<{ (e: 'back'): void }>();
</script>

<template>
  <div :class="back ? 'reevit-panel-head' : 'reevit-panel-head reevit-panel-head--plain'">
    <button
      v-if="back"
      type="button"
      class="reevit-back"
      data-reevit="back"
      aria-label="Back to payment methods"
      @click="emit('back')"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" /></svg>
    </button>
    <h2
      :class="back ? 'reevit-panel-title' : 'reevit-panel-title reevit-sr'"
      tabindex="-1"
      data-reevit="panel-title"
    >{{ title }}</h2>
  </div>
</template>
