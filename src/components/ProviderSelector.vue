<script setup lang="ts">
import { computed } from 'vue';
import type { CheckoutProviderOption, PaymentMethod, ReevitTheme } from '@reevit/core';
import { cn } from '@reevit/core';
import PaymentMethodSelector from './PaymentMethodSelector.vue';

const props = defineProps<{
  providers: CheckoutProviderOption[];
  selectedProvider: string | null;
  disabled?: boolean;
  theme?: ReevitTheme;
  selectedMethod?: PaymentMethod | null;
}>();

const emit = defineEmits<{
  (e: 'select', provider: string): void;
  (e: 'methodSelect', method: PaymentMethod): void;
}>();

const providerLogos: Record<string, string> = {
  paystack: 'https://reevit.io/images/providers/paystack.png',
  stripe: 'https://reevit.io/images/providers/stripe.png',
  flutterwave: 'https://reevit.io/images/providers/flutterwave.png',
  hubtel: 'https://reevit.io/images/providers/hubtel.png',
  monnify: 'https://reevit.io/images/providers/monnify.png',
  mpesa: 'https://reevit.io/images/providers/mpesa.png',
};

const methodLabels: Record<PaymentMethod, string> = {
  card: 'Card',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
};

const formatMethods = (methods: PaymentMethod[]): string => {
  if (!methods.length) return 'Payment methods';
  return methods.map((method) => methodLabels[method]).join(', ');
};

const sanitizeMethods = (providerId: string, methods: PaymentMethod[]): PaymentMethod[] => {
  if (providerId.toLowerCase().includes('hubtel')) {
    return methods.filter((method) => method === 'card' || method === 'mobile_money');
  }
  return methods;
};
</script>

<template>
  <div class="reevit-psp-selector">
    <div class="reevit-psp-selector__label">Select payment provider</div>
    <div class="reevit-psp-selector__options">
      <div
        v-for="provider in providers"
        :key="provider.provider"
        class="reevit-psp-accordion"
      >
        <button
          type="button"
          :class="
            cn(
              'reevit-psp-option',
              selectedProvider === provider.provider && 'reevit-psp-option--selected',
              disabled && 'reevit-psp-option--disabled',
            )
          "
          :disabled="disabled"
          :aria-expanded="selectedProvider === provider.provider"
          @click="emit('select', provider.provider)"
        >
          <span class="reevit-psp-option__logo" aria-hidden="true">
            <img
              v-if="providerLogos[provider.provider]"
              :src="providerLogos[provider.provider]"
              alt=""
              class="reevit-psp-option__logo-img"
              loading="lazy"
            />
            <span v-else class="reevit-psp-option__logo-fallback">
              {{ provider.name.slice(0, 1).toUpperCase() }}
            </span>
          </span>
          <div class="reevit-psp-option__content">
            <span class="reevit-psp-option__name">{{ provider.name }}</span>
            <span class="reevit-psp-option__methods">
              {{ formatMethods(sanitizeMethods(provider.provider, provider.methods)) }}
            </span>
          </div>
        </button>

        <!-- Expanded Payment Methods -->
        <div v-if="selectedProvider === provider.provider" class="reevit-psp-accordion__content reevit-animate-fade-in">
          <div class="reevit-psp-methods">
            <PaymentMethodSelector
              :methods="sanitizeMethods(provider.provider, provider.methods)"
              :selected="selectedMethod || null"
              :provider="provider.provider"
              :show-label="false"
              layout="list"
              @select="emit('methodSelect', $event)"
            />
          </div>
          <slot name="method-content" />
        </div>
      </div>
    </div>
  </div>
</template>
