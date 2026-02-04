# @reevit/vue

Vue 3 SDK for integrating Reevit unified payments into your application.

## Installation

```bash
npm install @reevit/vue @reevit/core
```

## Quick Start

The simplest way to integrate Reevit is using the `ReevitCheckout` component.

```vue
<script setup lang="ts">
import { ReevitCheckout } from '@reevit/vue';
import '@reevit/vue/styles.css';

const handleSuccess = (result: any) => {
  console.log('Payment success!', result);
};

const handleError = (error: any) => {
  console.error('Payment failed:', error);
};
</script>

<template>
  <ReevitCheckout
    publicKey="pk_test_xxx"
    :amount="10000"
    currency="GHS"
    email="customer@example.com"
    idempotencyKey="order_12345"
    @success="handleSuccess"
    @error="handleError"
  >
    <template #default="{ open, isLoading }">
      <button 
        class="my-pay-button" 
        :disabled="isLoading" 
        @click="open"
      >
        {{ isLoading ? 'Loading...' : 'Pay GHS 100.00' }}
      </button>
    </template>
  </ReevitCheckout>
</template>
```

## Idempotency

Provide an `idempotencyKey` tied to your order/cart to avoid duplicate intent creation and enable safe retries.

```vue
<ReevitCheckout
  publicKey="pk_test_xxx"
  :amount="10000"
  currency="GHS"
  idempotencyKey="order_12345"
/>
```

## Controlled Modal

You can control the open state yourself.

```vue
<script setup>
const open = ref(false);
</script>

<template>
  <ReevitCheckout
    publicKey="pk_test_your_key"
    :amount="10000"
    currency="GHS"
    :isOpen="open"
    @close="open = false"
  />
</template>
```

## Success Screen Delay

By default, the checkout shows a success screen for 5 seconds before calling `@success` and closing. Override with `successDelayMs` (set to `0` for immediate close).

```vue
<ReevitCheckout :successDelayMs="0" />
```

## Custom Theme

```vue
<ReevitCheckout
  :theme="{
    primaryColor: '#00D1B2',
    backgroundColor: '#FFFFFF',
    darkMode: false,
    borderRadius: '4px'
  }"
  publicKey="pk_test_xxx"
  :amount="5000"
  currency="GHS"
>
  <button>Pay Now</button>
</ReevitCheckout>
```

## Advanced Usage: useReevit Composable

For full control over the payment flow, use the `useReevit` composable.

```vue
<script setup lang="ts">
import { useReevit } from '@reevit/vue';

const { 
  status, 
  initialize, 
  selectMethod, 
  isLoading 
} = useReevit({
  config: {
    publicKey: 'pk_test_xxx',
    amount: 5000,
    currency: 'GHS',
  },
  onSuccess: (res) => console.log('Payment done!', res),
});
</script>

<template>
  <button @click="initialize">Start Payment</button>
  <div v-if="status === 'ready'">
    <button @click="selectMethod('card')">Card</button>
    <button @click="selectMethod('mobile_money')">Mobile Money</button>
  </div>
</template>
```

## Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `publicKey` | `string` | Your project's public key (required for API-created intents; optional when using `paymentLinkCode`) |
| `amount` | `number` | **Required**. Amount in the smallest unit (e.g., 500 for 5.00) |
| `currency` | `string` | **Required**. 3-letter ISO currency code (GHS, NGN, USD, etc.) |
| `email` | `string` | Customer's email address |
| `phone` | `string` | Customer's phone number (recommended for Mobile Money) |
| `customerName` | `string` | Customer name (used in payment links and some PSPs) |
| `reference` | `string` | Your own unique transaction reference |
| `metadata` | `object` | Key-value pairs to store with the transaction |
| `customFields` | `object` | Custom fields for payment links |
| `paymentLinkCode` | `string` | Hosted payment link code (uses the public link checkout flow) |
| `paymentMethods` | `PaymentMethod[]` | Enabled methods: `card`, `mobile_money`, `bank_transfer`, `apple_pay`, `google_pay` (PSP/country dependent) |
| `initialPaymentIntent` | `PaymentIntent` | Use an existing intent instead of creating a new one |
| `isOpen` | `boolean` | Controlled open state |
| `theme` | `ReevitTheme` | Customization options for the widget |
| `apiBaseUrl` | `string` | Override API base URL (self-hosted/testing) |
| `successDelayMs` | `number` | Delay before calling `@success` and closing (default `5000`) |

## Theme Reference

| Field | Description |
|-------|-------------|
| `primaryColor` | Primary text/brand color |
| `primaryForegroundColor` | Text color on primary brand surfaces |
| `backgroundColor` | Background color for the modal |
| `borderColor` | Border and divider color |
| `borderRadius` | Border radius for inputs and buttons |
| `darkMode` | Force dark mode when `true` |
| `logoUrl` | Logo URL shown in the header |
| `companyName` | Brand name shown in the header |
| `selectedBackgroundColor` | Background color for selected provider/methods |
| `selectedTextColor` | Primary text color for selected items |
| `selectedDescriptionColor` | Description/muted text color for selected items |
| `selectedBorderColor` | Border color for selected items |
| `pspSelectorBgColor` | PSP selector background color (where supported) |
| `pspSelectorTextColor` | PSP selector text color (where supported) |
| `pspSelectorBorderColor` | PSP selector border color (where supported) |
| `pspSelectorUseBorder` | Use border-only PSP selector styling |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@success` | `PaymentResult` | Called on successful payment |
| `@error` | `PaymentError` | Called on error |
| `@close` | `void` | Called when widget is closed |

## PSP Bridge Functions

For advanced use cases, you can use PSP bridge functions directly to open payment modals.

### Stripe

```ts
import { createStripeInstance, confirmStripePayment } from '@reevit/vue';

// Create Stripe instance
const stripe = await createStripeInstance('pk_test_xxx');
const elements = stripe.elements({ clientSecret: 'pi_xxx_secret_xxx' });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// Later, confirm the payment
await confirmStripePayment({
  publishableKey: 'pk_test_xxx',
  clientSecret: 'pi_xxx_secret_xxx',
  elements,
  onSuccess: (result) => console.log('Paid:', result.paymentIntentId),
  onError: (err) => console.error(err.message),
});
```

### Monnify (Nigeria)

```ts
import { openMonnifyModal } from '@reevit/vue';

await openMonnifyModal({
  apiKey: 'MK_TEST_xxx',
  contractCode: '1234567890',
  amount: 5000,
  currency: 'NGN',
  reference: 'TXN_12345',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  onSuccess: (result) => console.log('Paid:', result.transactionReference),
  onClose: () => console.log('Closed'),
});
```

### M-Pesa (Kenya/Tanzania)

```ts
import { initiateMPesaSTKPush } from '@reevit/vue';

const result = await initiateMPesaSTKPush(
  {
    phoneNumber: '254712345678',
    amount: 500,
    reference: 'TXN_12345',
    onInitiated: () => console.log('STK Push sent'),
    onSuccess: (result) => console.log('Paid:', result.transactionId),
    onError: (err) => console.error(err.message),
  },
  '/api/mpesa/stk-push' // Your backend endpoint
);
```

## Supported PSPs

| Provider | Countries | Payment Methods |
|----------|-----------|-----------------|
| Paystack | NG, GH, ZA, KE | Card, Mobile Money, Bank Transfer |
| Flutterwave | NG, GH, KE, ZA + | Card, Mobile Money, Bank Transfer |
| Hubtel | GH | Mobile Money |
| Stripe | Global (50+) | Card, Apple Pay, Google Pay |
| Monnify | NG | Card, Bank Transfer, USSD |
| M-Pesa | KE, TZ | Mobile Money (STK Push) |

## License

MIT © Reevit
