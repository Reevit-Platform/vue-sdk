<script setup lang="ts">
/** Account details could not be issued. */
import type { BankFailure, DirectBank } from '../composables/useDirectBank';
import Scope from './Scope.vue';

defineProps<{
  bank: DirectBank;
  failure: BankFailure;
  /** Offer "Choose another method" when the list has more than one method. */
  canChooseAnother: boolean;
}>();

const emit = defineEmits<{ (e: 'chooseAnother'): void; (e: 'close'): void }>();
</script>

<template>
  <Scope>
    <div class="reevit-result reevit-result--prompt" data-reevit="failure" :data-failure="failure.code">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
        <span class="reevit-fail-dot" aria-hidden="true" />{{ failure.title }}
      </h2>
      <p class="reevit-text">{{ failure.message }}</p>
      <button v-if="failure.retryable" type="button" class="reevit-cta" data-reevit="cta" data-first="" :disabled="bank.state.busy" @click="bank.start()">Try again</button>
      <button v-else-if="!canChooseAnother" type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="emit('close')">Close</button>
      <div v-if="canChooseAnother" class="reevit-links">
        <button type="button" class="reevit-link" data-reevit="choose-another" :data-first="failure.retryable ? undefined : ''" @click="emit('chooseAnother')">Choose another method</button>
      </div>
    </div>
  </Scope>
</template>
