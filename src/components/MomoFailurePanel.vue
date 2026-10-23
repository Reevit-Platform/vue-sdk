<script setup lang="ts">
/** Declined, insufficient funds, no response, provider trouble, locked, out of attempts. */
import { computed } from 'vue';
import type { DirectCharge, DirectFailure } from '../composables/useDirectCharge';
import Scope from './Scope.vue';

const props = defineProps<{
  charge: DirectCharge;
  failure: DirectFailure;
  /** Offer "Choose another method" when the list has more than one method. */
  canChooseAnother: boolean;
}>();

const emit = defineEmits<{ (e: 'chooseAnother'): void; (e: 'close'): void }>();

const s = computed(() => props.charge.state);
const resendable = computed(() => props.failure.kind === 'timeout' && !s.value.resendClosed);
const exhausted = computed(() => props.failure.kind === 'exhausted' || !props.failure.retryable);
const primary = computed(() => {
  if (exhausted.value) return null;
  return resendable.value
    ? { label: 'Send a new prompt', busy: s.value.resending }
    : { label: 'Try again', busy: false };
});
const runPrimary = () => (resendable.value ? props.charge.resend() : props.charge.retry());
</script>

<template>
  <Scope>
    <div class="reevit-result reevit-result--prompt" data-reevit="failure" :data-failure="failure.kind">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
        <span class="reevit-fail-dot" aria-hidden="true" />{{ failure.title }}
      </h2>
      <p class="reevit-text">{{ failure.message }}</p>
      <p v-if="s.notice" class="reevit-status" data-reevit="status" role="status" aria-live="polite">{{ s.notice }}</p>
      <button v-if="primary" type="button" class="reevit-cta" data-reevit="cta" data-first="" :disabled="primary.busy" @click="runPrimary">{{ primary.label }}</button>
      <button v-if="!exhausted" type="button" class="reevit-cta-secondary" data-reevit="change-number" @click="charge.useAnotherNumber()">Use another number</button>
      <button v-if="exhausted && !canChooseAnother" type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="emit('close')">Close</button>
      <div v-if="canChooseAnother" class="reevit-links">
        <button type="button" class="reevit-link" data-reevit="choose-another" :data-first="exhausted ? '' : undefined" @click="emit('chooseAnother')">Choose another method</button>
      </div>
    </div>
  </Scope>
</template>
