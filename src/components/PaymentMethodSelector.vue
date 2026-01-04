<script setup lang="ts">
import { computed } from 'vue';
import { formatAmount, cn } from '@reevit/core';
import type { PaymentMethod } from '@reevit/core';

const props = defineProps<{
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  amount: number;
  currency: string;
  provider?: string;
}>();

const emit = defineEmits<{
  (e: 'select', method: PaymentMethod): void;
}>();

// Human-readable PSP names
const pspNames: Record<string, string> = {
  hubtel: 'Hubtel',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  monnify: 'Monnify',
  mpesa: 'M-Pesa',
  stripe: 'Stripe',
};

const getMethodName = (method: PaymentMethod): string => {
  // For Hubtel, show "Pay with Hubtel" for mobile_money
  if (props.provider?.toLowerCase().includes('hubtel') && method === 'mobile_money') {
    return `Pay with ${pspNames[props.provider.toLowerCase()] || 'Hubtel'}`;
  }

  const names: Record<PaymentMethod, string> = {
    card: 'Card',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
  };
  return names[method];
};

const getMethodDescription = (method: PaymentMethod): string => {
  // Hubtel handles everything internally
  if (props.provider?.toLowerCase().includes('hubtel')) {
    return 'Card, Mobile Money, and Bank Transfer';
  }

  const descriptions: Record<PaymentMethod, string> = {
    card: 'Visa, Mastercard, Maestro',
    mobile_money: 'MTN, Vodafone, AirtelTigo',
    bank_transfer: 'Transfer directly from your bank',
  };
  return descriptions[method];
};

const availableMethods = computed(() => {
  return [
    {
      id: 'card' as const,
      name: getMethodName('card'),
      description: getMethodDescription('card'),
      icon: '💳',
    },
    {
      id: 'mobile_money' as const,
      name: getMethodName('mobile_money'),
      description: getMethodDescription('mobile_money'),
      icon: '📱',
    },
    {
      id: 'bank_transfer' as const,
      name: getMethodName('bank_transfer'),
      description: getMethodDescription('bank_transfer'),
      icon: '🏦',
    },
  ].filter(m => props.methods.includes(m.id));
});
</script>

<template>
  <div class="reevit-method-selector">
    <h3 class="reevit-section-title">Select Payment Method</h3>
    <p class="reevit-amount-display">
      Pay {{ formatAmount(amount, currency) }}
    </p>

    <div class="reevit-methods-grid">
      <button
        v-for="method in availableMethods"
        :key="method.id"
        type="button"
        :class="cn('reevit-method-card', selected === method.id && 'reevit-method-card--selected')"
        @click="emit('select', method.id)"
      >
        <span class="reevit-method-icon">{{ method.icon }}</span>
        <div class="reevit-method-info">
          <span class="reevit-method-name">{{ method.name }}</span>
          <span class="reevit-method-description">{{ method.description }}</span>
        </div>
        <div class="reevit-method-radio">
          <div class="reevit-radio-inner" v-if="selected === method.id" />
        </div>
      </button>
    </div>
  </div>
</template>
