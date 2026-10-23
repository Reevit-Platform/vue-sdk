<script setup lang="ts">
/** One field for the OTP or voucher the provider asked for. Mount it with a key per attempt and code kind. */
import { computed, ref, useId } from 'vue';
import type { DirectCharge } from '../composables/useDirectCharge';
import Scope from './Scope.vue';

const props = defineProps<{ charge: DirectCharge }>();

const id = useId();
const code = ref('');
const s = computed(() => props.charge.state);
const voucher = computed(() => s.value.codeKind === 'voucher');
const action = computed(() => s.value.attempt?.next_action);
const busy = computed(() => s.value.phase === 'submitting');
const ready = computed(() => code.value.replace(/\D/g, '').length >= 4);

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  code.value = target.value.replace(/[^\d]/g, '').slice(0, 8);
  target.value = code.value;
};

const submit = () => {
  if (!ready.value || busy.value) return;
  void props.charge.submitCode(code.value.replace(/\s/g, ''));
};
</script>

<template>
  <Scope>
    <div data-reevit="momo-code" :data-kind="voucher ? 'voucher' : 'otp'">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">{{ voucher ? 'Enter your voucher' : 'Enter your code' }}</h2>
      <p class="reevit-text">
        <template v-if="voucher"><template v-if="action?.voucher?.ussd">Dial <span class="reevit-mono">{{ action.voucher.ussd }}</span> for your voucher.</template><template v-else>{{ action?.voucher?.hint ?? 'Get a voucher from your phone’s menu.' }}</template></template>
        <template v-else>Sent to <span class="reevit-mono">{{ action?.phone_masked ?? 'your phone' }}</span>.</template>
      </p>
      <form class="reevit-form reevit-code-form" novalidate @submit.prevent="submit">
        <div class="reevit-field">
          <div :class="s.codeError ? 'reevit-input reevit-input--invalid' : 'reevit-input'">
            <input
              :id="id"
              :aria-label="voucher ? 'Voucher code' : 'Code'"
              class="reevit-mono"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="8"
              placeholder="••••••"
              :value="code"
              :disabled="busy"
              :aria-invalid="s.codeError ? 'true' : undefined"
              :aria-describedby="s.codeError ? `${id}-error` : undefined"
              data-first=""
              @input="onInput"
            />
          </div>
          <p v-if="s.codeError" :id="`${id}-error`" class="reevit-error" role="alert">{{ s.codeError }}</p>
        </div>
        <button type="submit" class="reevit-cta" data-reevit="cta" :disabled="!ready || busy">{{ busy ? 'Please wait' : 'Continue' }}</button>
        <div class="reevit-links">
          <button type="button" class="reevit-link" data-reevit="change-number" @click="charge.useAnotherNumber()">Use another number</button>
        </div>
      </form>
    </div>
  </Scope>
</template>
