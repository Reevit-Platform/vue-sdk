<script setup lang="ts">
/** Approve on your phone: countdown, "I've approved", resend, another number. Renders `useDirectCharge`; decides nothing. */
import { computed } from 'vue';
import type { DirectCharge } from '../composables/useDirectCharge';
import { FAILOVER_NOW } from '../composables/useDirectCharge';
import { useCountdown } from '../composables/useCountdown';
import { NETWORK_LABEL, mmss } from '../utils/momo';
import Scope from './Scope.vue';

const props = defineProps<{
  charge: DirectCharge;
  /** The number as the shopper typed it; falls back to the server's masked form. */
  phoneText: string;
  network?: string;
  now?: () => number;
}>();

const clock = () => (props.now ?? Date.now)();
const s = computed(() => props.charge.state);
const countdown = useCountdown(
  () => s.value.expiresAt,
  () => s.value.startedAt,
  clock,
);
const resendWait = computed(() => {
  void countdown.value; // re-evaluated on every tick, like the clock
  return s.value.canResendAt ? Math.max(0, Math.ceil((s.value.canResendAt - clock()) / 1000)) : 0;
});
const resendReady = computed(() => !s.value.resendClosed && !s.value.resending && resendWait.value === 0);
const status = computed(() => s.value.notice ?? (s.value.attempt?.rerouted ? FAILOVER_NOW : ''));
const label = computed(() => (props.network && NETWORK_LABEL[props.network]) || 'mobile money');
</script>

<template>
  <Scope>
    <div class="reevit-wait" data-reevit="momo-wait" :data-payment-id="s.attempt?.id">
      <span class="reevit-spin reevit-spin--lg" aria-hidden="true" />
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">Approve on your phone</h2>
      <!-- Separate text nodes, as the React panel renders them: the browser shapes glyphs per node, so one merged node shifts a letter by a sub-pixel. -->
      <p class="reevit-text">Check <span class="reevit-mono">{{ phoneText }}</span><template v-for="part in [' for a ', label, ' prompt.']" :key="part">{{ part }}</template></p>
      <div class="reevit-countdown">
        <span class="reevit-mono" data-reevit="countdown" role="timer" aria-label="Time left">{{ mmss(countdown.seconds) }}</span>
        <div class="reevit-bar" aria-hidden="true"><i :style="{ transform: `scaleX(${countdown.fraction})` }" /></div>
      </div>
      <p class="reevit-status" data-reevit="status" role="status" aria-live="polite">{{ status }}</p>
      <button
        type="button"
        class="reevit-cta"
        data-reevit="cta"
        data-first=""
        :disabled="s.checking"
        @click="charge.check()"
      >I’ve approved</button>
      <div class="reevit-links">
        <button
          v-if="!s.resendClosed"
          type="button"
          class="reevit-link"
          data-reevit="resend"
          :disabled="!resendReady"
          :aria-disabled="!resendReady"
          @click="resendReady && charge.resend()"
        >{{ resendWait > 0 ? `Resend prompt in ${resendWait}s` : 'Resend prompt' }}</button>
        <button type="button" class="reevit-link" data-reevit="change-number" @click="charge.useAnotherNumber()">Use another number</button>
      </div>
    </div>
  </Scope>
</template>
