<script setup lang="ts">
/**
 * LoadingState Component
 * The single brutalist loading screen used for every loading state across
 * the checkout — server connection, PSP connection, payment processing.
 */

withDefaults(
  defineProps<{
    /** Small status tag above the bars (e.g. "CONNECTING", "PROCESSING"). */
    marker?: string;
    /** Headline. */
    title?: string;
    /** Sub-line beneath the headline. */
    message?: string;
  }>(),
  {
    marker: 'PROCESSING',
    title: 'Please wait',
    message: 'Do not close this window',
  }
);
</script>

<template>
  <div class="reevit-brut__state">
    <span class="reevit-brut__state-marker">{{ marker }}</span>
    <div class="reevit-brut__bars">
      <span /><span /><span /><span /><span />
    </div>
    <h3 class="reevit-brut__state-title">{{ title }}</h3>
    <p class="reevit-brut__state-sub">{{ message }}</p>
  </div>
</template>
