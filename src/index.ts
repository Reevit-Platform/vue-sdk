/**
 * @reevit/vue
 * Unified Payment Widget for Vue 3 Applications
 */

// Components
export { default as ReevitCheckout } from './components/ReevitCheckout.vue';
export { default as PaymentMethodSelector } from './components/PaymentMethodSelector.vue';
export { default as MobileMoneyForm } from './components/MobileMoneyForm.vue';

// Composables
export { useReevit } from './composables';

// Re-export core types and utilities
export type {
  PaymentMethod,
  MobileMoneyNetwork,
  ReevitCheckoutConfig,
  ReevitCheckoutCallbacks,
  CheckoutState,
  PaymentResult,
  PaymentError,
  ReevitTheme,
  MobileMoneyFormData,
  PaymentIntent,
  PSPType,
} from '@reevit/core';

export {
  formatAmount,
  validatePhone,
  detectNetwork,
  formatPhone,
  detectCountryFromCurrency,
  cn,
  ReevitAPIClient,
  createReevitClient,
} from '@reevit/core';

// PSP Script loaders for bridges
export {
  // Script loaders
  loadPaystackScript,
  loadHubtelScript,
  loadFlutterwaveScript,
  loadStripeScript,
  loadMonnifyScript,

  // Popup/Modal openers
  openPaystackPopup,
  openHubtelPopup,
  openFlutterwaveModal,
  createStripeInstance,
  confirmStripePayment,
  openMonnifyModal,
  initiateMPesaSTKPush,

  // Types
  type PaystackConfig,
  type HubtelConfig,
  type FlutterwaveConfig,
  type StripeConfig,
  type MonnifyConfig,
  type MPesaConfig,
  type MPesaSTKPushResult,
} from './bridges';

