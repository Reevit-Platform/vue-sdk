<script setup lang="ts">
/** The provider has not seen the transfer yet: Check again or Keep waiting. */
import { computed } from 'vue';
import type { DirectBank } from '../composables/useDirectBank';
import Scope from './Scope.vue';

const props = defineProps<{ bank: DirectBank }>();
const notice = computed(() => props.bank.state.notice);
</script>

<template>
  <Scope>
    <div data-reevit="bank-not-seen">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
        <span class="reevit-fail-dot" aria-hidden="true" />We haven’t seen it yet
      </h2>
      <p class="reevit-text">Transfers can take a few minutes to arrive.</p>
      <p v-if="notice" class="reevit-status" data-reevit="status" role="status" aria-live="polite">{{ notice }}</p>
      <button type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="bank.sent()">Check again</button>
      <button type="button" class="reevit-cta-secondary" data-reevit="keep-waiting" @click="bank.keepWaiting()">Keep waiting</button>
    </div>
  </Scope>
</template>
