<script setup lang="ts">
import { computed } from 'vue';
import type { PaymentMethod } from '@reevit/core';
import airteltigoLogo from '../assets/methods/airteltigo.png';
import applePayLogo from '../assets/methods/apple-pay.png';
import googlePayLogo from '../assets/methods/google-pay.png';
import mastercardLogo from '../assets/methods/mastercard.png';
import mpesaLogo from '../assets/methods/mpesa.png';
import mtnLogo from '../assets/methods/mtn.png';
import telecelLogo from '../assets/methods/telecel.png';
import visaLogo from '../assets/methods/visa.png';

const props = defineProps<{
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  provider?: string;
  layout?: 'grid' | 'list';
  showLabel?: boolean;
  disabled?: boolean;
  country?: string;
  selectedTheme?: {
    backgroundColor?: string;
    textColor?: string;
    descriptionColor?: string;
    borderColor?: string;
  };
}>();

const showLabel = computed(() => props.showLabel !== false);

const emit = defineEmits<{
  (e: 'select', method: PaymentMethod): void;
}>();

const isGrid = computed(() => (props.layout || 'list') === 'grid');
const country = computed(() => (props.country || 'GH').toUpperCase());

const methodConfig: Record<
  PaymentMethod,
  { name: string; icon: string }
> = {
  card: {
    name: 'Card',
    icon: '💳',
  },
  mobile_money: {
    name: 'Mobile Money',
    icon: '📱',
  },
  bank_transfer: {
    name: 'Bank Transfer',
    icon: '🏦',
  },
  apple_pay: {
    name: 'Apple Pay',
    icon: '🍎',
  },
  google_pay: {
    name: 'Google Pay',
    icon: '🤖',
  },
};

const getMethodDescription = (method: PaymentMethod): string => {
  const c = country.value;

  if (method === 'mobile_money') {
    const mobileMoneyDescriptions: Record<string, string> = {
      GH: 'MTN, Telecel, AirtelTigo Money',
      KE: 'M-Pesa, Airtel Money',
      NG: 'MTN MoMo, Airtel Money',
      ZA: 'Mobile Money',
    };
    return mobileMoneyDescriptions[c] || 'Mobile Money';
  }

  if (method === 'card') {
    return 'Pay with Visa, Mastercard, or other cards';
  }

  if (method === 'bank_transfer') {
    return 'Pay directly from your bank account';
  }

  if (method === 'apple_pay') {
    return 'Pay with Apple Pay';
  }

  if (method === 'google_pay') {
    return 'Pay with Google Pay';
  }

  return '';
};

const getMethodLogos = (method: PaymentMethod): string[] => {
  const c = country.value;
  const logos = {
    visa: visaLogo,
    mastercard: mastercardLogo,
    apple_pay: applePayLogo,
    google_pay: googlePayLogo,
    mtn: mtnLogo,
    telecel: telecelLogo,
    airteltigo: airteltigoLogo,
    mpesa: mpesaLogo,
  };

  if (method === 'card') {
    return [logos.visa, logos.mastercard];
  }

  if (method === 'apple_pay') return [logos.apple_pay];
  if (method === 'google_pay') return [logos.google_pay];

  if (method === 'mobile_money') {
    if (c === 'GH') return [logos.mtn, logos.telecel, logos.airteltigo];
    if (c === 'KE') return [logos.mpesa];
    if (c === 'NG') return [logos.mtn];
    return [logos.mtn];
  }

  return [];
};

const optionsStyle = computed(() => {
  if (!props.selectedTheme?.backgroundColor) return undefined;
  return { backgroundColor: props.selectedTheme.backgroundColor };
});

const methodOptionStyle = (index: number): Record<string, string> => {
  const style: Record<string, string> = {
    animationDelay: `${index * 0.05}s`,
  };
  if (props.selectedTheme?.borderColor) {
    style.borderBottomColor = props.selectedTheme.borderColor;
  }
  return style;
};

const availableMethods = computed(() => {
  return [
    {
      id: 'card' as const,
      name: methodConfig.card.name,
      icon: methodConfig.card.icon,
    },
    {
      id: 'mobile_money' as const,
      name: methodConfig.mobile_money.name,
      icon: methodConfig.mobile_money.icon,
    },
    {
      id: 'bank_transfer' as const,
      name: methodConfig.bank_transfer.name,
      icon: methodConfig.bank_transfer.icon,
    },
    {
      id: 'apple_pay' as const,
      name: methodConfig.apple_pay.name,
      icon: methodConfig.apple_pay.icon,
    },
    {
      id: 'google_pay' as const,
      name: methodConfig.google_pay.name,
      icon: methodConfig.google_pay.icon,
    },
  ]
    .filter((method) => props.methods.includes(method.id))
    .map((method) => ({
      ...method,
      description: getMethodDescription(method.id),
      logos: getMethodLogos(method.id),
    }));
});
</script>

<template>
  <div class="reevit-method-selector" :class="{ 'reevit-method-selector--grid': isGrid }">
    <div v-if="showLabel" class="reevit-method-selector__label">Select payment method</div>
    <div 
      class="reevit-method-selector__options" 
      :class="isGrid ? 'reevit-method-selector__options--grid' : 'reevit-method-selector__options--list'"
      :style="optionsStyle"
    >
      <button
        v-for="(method, index) in availableMethods"
        :key="method.id"
        type="button"
        class="reevit-method-option"
        :class="[
          isGrid ? 'reevit-method-option--grid' : 'reevit-method-option--list',
          { 'reevit-method-option--selected': selected === method.id },
          props.disabled && 'reevit-method-option--disabled'
        ]"
        :style="methodOptionStyle(index)"
        :disabled="props.disabled"
        :aria-pressed="selected === method.id"
        @click="emit('select', method.id)"
      >
        <span class="reevit-method-option__icon-wrapper">
          <span v-if="method.logos.length" class="reevit-method-option__logos">
            <img
              v-for="(logo, logoIndex) in method.logos.slice(0, 3)"
              :key="`${method.id}-logo-${logoIndex}`"
              :src="logo"
              alt=""
              class="reevit-method-option__logo-img"
              loading="lazy"
            />
          </span>
          <span v-else class="reevit-method-option__icon">{{ method.icon }}</span>
        </span>
        <div class="reevit-method-option__content">
          <span
            class="reevit-method-option__label"
            :style="props.selectedTheme?.textColor ? { color: props.selectedTheme.textColor } : undefined"
          >
            {{ method.name }}
          </span>
          <span
            v-if="!isGrid"
            class="reevit-method-option__description"
            :style="props.selectedTheme?.descriptionColor ? { color: props.selectedTheme.descriptionColor } : undefined"
          >
            {{ method.description }}
          </span>
        </div>
        <template v-if="!isGrid">
          <span v-if="selected === method.id" class="reevit-method-option__check">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span v-else class="reevit-method-option__chevron">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </template>
      </button>
    </div>
  </div>
</template>
