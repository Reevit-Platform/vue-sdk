<script setup lang="ts">
/**
 * LoadingState
 * The Ledger "working" look. `block` is the centred processing state
 * (spinner, title, optional line); `line` is the compact spinner line shown
 * under a panel header while a provider window is opening.
 */
import Scope from './Scope.vue';

withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    variant?: 'block' | 'line';
  }>(),
  { title: 'Please wait', variant: 'block' }
);
</script>

<template>
  <Scope>
    <p v-if="variant === 'line'" class="reevit-opening" data-reevit="status" role="status">
      <span class="reevit-spin" aria-hidden="true" />{{ title }}
    </p>
    <div v-else class="reevit-processing" data-reevit="processing">
      <span class="reevit-spin reevit-spin--lg" aria-hidden="true" />
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">{{ title }}</h2>
      <p v-if="message" class="reevit-text">{{ message }}</p>
    </div>
  </Scope>
</template>
