<script setup lang="ts">
/**
 * The provider said paid but the backend has not confirmed it in two minutes.
 * Not a failure: there is no retry.
 */
const emit = defineEmits<{ (e: 'done'): void }>();
</script>

<template>
  <div class="reevit-result" data-reevit="unconfirmed">
    <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">We’re still confirming this payment</h2>
    <p class="reevit-text">If you were charged, you don’t need to pay again. The merchant will be told as soon as it clears.</p>
    <button type="button" class="reevit-cta" data-reevit="done" data-first="" @click="emit('done')">Done</button>
  </div>
</template>
