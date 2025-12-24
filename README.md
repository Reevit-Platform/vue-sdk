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
| `publicKey` | `string` | Your project's public key |
| `amount` | `number` | Amount in smallest unit |
| `currency` | `string` | 3-letter currency code |
| `email` | `string` | Customer's email |
| `theme` | `ReevitTheme` | Customization options |
| `isOpen` | `boolean` | Control modal visibility manually |

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

## License

MIT © Reevit
