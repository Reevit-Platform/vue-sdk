# Changelog

All notable changes to `@reevit/vue` will be documented in this file.

## [0.13.0] - Unreleased

### Added

- **Mobile money in Reevit's own screens.** When a checkout session says a provider takes mobile money **directly** (`method_options[].flow === 'direct'` on `GET /v1/checkout/sessions/{secret}`), the checkout no longer opens a provider window for it. Reevit's own screens collect the number, send the prompt, and wait for the real result. Providers that say `hosted` keep today's provider handoff, and a backend that sends no `method_options` behaves exactly as 0.12.1. Cards are never direct: card details stay in the provider's window.
  - **Number form.** Network is detected from the prefix (override it with the three network marks); only the networks the provider accepts are offered. M-Pesa keeps the +254 form. The number is sent to Reevit, never put in a URL or a header.
  - **Approve on your phone.** A live countdown from the server's `expires_at`, **I've approved** (an immediate status read, never a shortcut to success), **Resend prompt** (disabled until the server's `can_resend_at`; a `409 attempt_pending` shows the server's line and keeps the earlier prompt) and **Use another number**.
  - **Code or voucher.** When the provider asks for an OTP or a Telecel voucher, one calm screen takes it: a single mono field named for assistive tech ("Code" or "Voucher code"), the dial code when the server sends one, and the number of tries left once it is two or fewer. Five wrong codes end the attempt.
  - **Declined, insufficient funds, no response.** Each has its own panel with **Try again** (a new attempt for the same number), **Send a new prompt** or **Use another number**, and **Choose another method** when there is one. When the attempt limit is spent, the only ways out are another method or closing.
  - **Failover.** While the server reports a rerouted attempt still pending, the panel says so; the receipt carries the one-line note.
  - **Only `succeeded` is success.** A pending, processing or unreadable answer never ends the flow. If the countdown runs out the screen ends, but the attempt is still watched for five minutes, so a late approval still reaches the receipt and `success`.
  - **Polite polling.** The status read follows the server's `poll_after_ms`, backs off on errors, pauses while the tab is hidden, and stops when the checkout closes or unmounts. One request of each kind is in flight at a time; a retry after an unanswered charge reuses its `attempt_token`, so the server replays it instead of sending a second prompt.
- New exports: `useDirectCharge` (the state machine as a composable), `createDirectChargeClient` (`charge`, `status`, `action`, `resend`, with the `X-Reevit-Client-Secret` header) and their types. `PaymentResult` for a direct payment carries `metadata.backend_status`, `rerouted`, `receipt_url` and `network`; it does not carry the number.
- Needs the backend with direct charge (`/charge`, `/status`, `/action`, `/resend`) and a server-created checkout session (`sessionSecret`). Public-key mode and `initialPaymentIntent` keep the previous flows.

## [0.12.1] - Unreleased

### Fixed

- **M-Pesa now completes.** A Phase 0 stopgap; the next release replaces it with a proper status endpoint.
  - `MPesaBridge` no longer POSTs to `/v1/payments/{id}/mpesa`, a route the backend does not have, with an `x-reevit-public-key` header its CORS policy rejects. Creating the payment already sends the STK push.
  - The prompt goes to the number the shopper typed. The number is sent with the intent (public-key mode) and with the checkout-session `select` call (new optional `phone`), so the server pushes to it. Session mode needs the backend that accepts `phone` on `select`.
  - The bridge checks the payment every 4 seconds (backing off on errors) and ends only on `succeeded` (receipt) or a final failure (failure panel with **Try again** and **Use another number**). It gives up after 2 minutes with "No response in time". Polling stops when the checkout closes.
  - Try again sends a fresh prompt: each retry or corrected number creates a new payment (`attempt` 1 to 3 on `select`) instead of replaying the failed one.
  - **A pending payment is never success, and never a retryable failure.** `useReevit.processPayment` used to report every provider "success" as paid. Now, when a popup provider (Paystack, Flutterwave, Monnify, Hubtel, Stripe) reports success but the backend still says `pending`, the buyer sees a calm "Confirming your payment" state with no Try again (they may already be debited), and can close it without the leave prompt or cancelling the payment. It keeps checking (4 s, backing off on errors) for up to 2 minutes: `succeeded` shows the receipt and emits `success`; a final failure shows the failure panel. The same goes for a first check that fails without a verdict (network error, timeout, 5xx, 429, unreadable answer): it is treated as pending, not as a failure. Only a definitive answer (a terminal status, or a 4xx such as a 402 decline) shows the failure panel straight away. If it is still pending at the deadline the panel reads "We’re still confirming this payment" with **Done** only; `success` and `error` are not emitted. The new `stateChange` event reports `confirming`, then `pending`.

### Changed

- **`MPesaBridge` props and events.** It takes `paymentId`, `clientSecret`, `publicKey`, `apiBaseUrl`, `phoneNumber`, `reference`, `canRetry` and `canChangeNumber`, and emits `success`, `error`, `retry` and `changeNumber`. `apiEndpoint`, `amount`, `currency`, `headers`, `description`, `autoStart` and the `initiated` event are gone: the old flow never worked.
- **Removed `initiateMPesaSTKPush`** and its `MPesaConfig` / `MPesaSTKPushResult` types, which called the missing route.

## [0.12.0] - Unreleased

### Added

- **New Ledger checkout.** `ReevitCheckout` has a new interface: a calm,
  monochrome dialog with a single list of payment methods, the merchant name and
  logo, the amount and order reference up top, and a "Secured by Reevit" footer
  showing the provider that will take the payment. On screens 480px and narrower
  it is a bottom sheet. It renders the same DOM and CSS as `@reevit/react` 0.12.0.
- **Reevit picks the processor.** The processor picker is gone. The method list is
  the union of the methods across your connected providers (Card, Mobile money,
  Bank transfer, Apple Pay, Google Pay, in that order). Tapping a method routes to
  the recommended provider if it supports it, otherwise to the first connected
  provider that does. Hubtel is still limited to card and mobile money, and
  `paymentMethods` still filters the list.
- **Card, bank and wallet details stay in the provider's own window.** After the
  tap the dialog shows the method title with a back chevron and an "Opening
  Paystack…" line while the provider window is open. Closing that window returns
  to the list.
- **Stripe now works in the Vue checkout.** The Payment Element renders inside the
  dialog, styled to match, and the Pay button confirms the payment. Before, Stripe
  ended in a "requires custom Elements setup" error.
- **M-Pesa** asks for the number on its own screen (+254, no network choice), sends
  the STK push when the shopper taps Pay, then shows "Approve on your phone" with a
  "Use another number" link, or a "Try again" panel if the request fails.
- **Receipt** shows reference, method, provider and date, with **Done** and
  **Download receipt**. Done (or closing the receipt) emits `success` once and
  closes; the `successDelayMs` auto-close still works and never emits it twice.
  Closing the receipt before the delay used to drop `success`; it now delivers it.
- **Failures** show a plain panel with the message and **Try again**, including
  provider-window errors.
- **Leaving mid-payment** (close, scrim or Esc while a provider window is open or a
  payment is being confirmed) asks "Leave checkout?" first.
- **Accessibility.** `role="dialog"` with `aria-modal` and a labelled title, focus
  moves into the dialog and returns to the opener, Tab is trapped, Esc closes, a
  polite live region announces each step, and reduced motion is respected.
- **Bundled fonts.** Inter, Geist Mono and Bricolage Grotesque (latin subsets,
  about 115 KB) ship inside `@reevit/vue/styles.css` under the family names
  `Reevit Inter`, `Reevit Mono` and `Reevit Display`, so there are no third-party
  font requests and no clash with the merchant's fonts.
- **Theming.** Light by default; `theme.darkMode` or an `html.dark` class switches
  to dark. `buttonBackgroundColor` and `buttonTextColor` still drive the primary
  button. Every custom property is prefixed `--rv-` and every rule is scoped under
  `.reevit-root`.
- Passing `isOpen` now starts the checkout without a trigger click.
- `openHubtelPopup` accepts an optional `onOpen` callback, called once Hubtel's
  hosted checkout is on screen.

### Changed (visual breaking)

- All `reevit-brut__*` and `reevit-brut-overlay` class names are replaced by the
  new `reevit-*` Ledger names (`reevit-dialog`, `reevit-header`, `reevit-row`,
  `reevit-cta`, and so on). If you override the checkout's CSS, review those
  overrides. The props, events, exports and the `@reevit/vue/styles.css` path are
  unchanged.
- The processor picker and the "Make payment" step, with their copy, no longer
  exist.
- `MobileMoneyForm` uses the Ledger look and accepts `mode` (`'network'` or
  `'mpesa'`) and `submitLabel`.
- `styles.css` no longer imports Space Grotesk from Google Fonts. The standalone
  `PaymentMethodSelector` and `ProviderSelector` fall back to the system font.

### Fixed

- With a `sessionSecret`, picking a method now asks the session for a method-specific intent (`POST /v1/checkout/sessions/{secret}/select`) instead of reusing the initial one, so Paystack opens Mobile Money for a Mobile money pick rather than card only. Repeat taps replay the same selection.
- The M-Pesa STK push request now includes `currency` and the `x-reevit-public-key` header. `MPesaConfig` accepts optional `currency` and `headers`.
- Flutterwave checkout converts Reevit minor units using the currency exponent. A 5,012 GHS intent requests 50.12 GHS; a 5,000 XOF intent requests 5,000 XOF.
- The exported `openFlutterwaveModal` helper retains Flutterwave's major-unit config contract; the widget performs conversion before calling it.
- The header and Stripe pay button format amounts with the currency's real exponent instead of dividing by 100.
- Stripe card validation errors stay inline instead of tearing down the card form.

## [0.11.0] - 2026-09-24

### Security

- **Hubtel checkout no longer uses the merchant's Hubtel credentials.**
  `ReevitCheckout` used to fetch `basicAuth` (base64 `client_id:client_secret`)
  from `POST /v1/payments/hubtel/sessions/{id}` and pass it to
  `@hubteljs/checkout` in the browser, which put the merchant's Hubtel API login
  in the shopper's browser. It now opens the hosted checkout the Reevit API
  already created (`checkoutDirectUrl` embedded in a plain overlay, or
  `checkoutUrl`) and learns the result by polling
  `POST /v1/payments/{id}/confirm-intent`. It never reads a result from the
  Hubtel page. A message from a `*.hubtel.com` page only triggers an immediate
  status check. The checkout closes it when the widget closes or unmounts.
- The `@hubteljs/checkout` dependency is removed, along with the bundled copy
  of it in `dist/`.

### Deprecated

- `HubtelConfig.basicAuth` is ignored. It stays in the type so existing code
  still compiles, and outside production builds the SDK logs a single console
  warning when it is passed. If you ever passed `basicAuth` yourself, rotate
  those Hubtel API keys.
- `openHubtelPopup` now takes `paymentId` + `clientSecret` (full outcome
  tracking) or a `checkoutUrl` (display only), plus an optional `onError`. It
  returns a handle with `cancel()`. The old purchase fields (`clientId`,
  `purchaseDescription`, `amount`, `callbackUrl`, `customerPhone`,
  `customerEmail`, `hubtelSessionToken`, `preferredMethod`) are optional and
  ignored. `loadHubtelScript` remains a no-op.

### Compatibility

- Works with backends before and after the server change: an older backend
  still returns `basicAuth` and no checkout URL. The SDK ignores `basicAuth` and
  opens the payment's client secret instead, which on Hubtel payments is the
  hosted checkout URL.
- **Breaking for published versions up to 0.10.3 once the backend change
  deploys.** The session endpoint stops returning `basicAuth`, so those versions
  fail with "Failed to create Hubtel session" and cannot take Hubtel payments.
  Other providers are unaffected. Merchants using Hubtel must upgrade.

### Added

- `sessionSecret` and `idempotencyKey` props on `ReevitCheckout`. A
  server-created checkout session now drives the widget end to end, and
  `amount`/`currency` are optional when one is supplied.
- A vitest suite with a smoke test covering the server-session flow, wired
  into CI.

### Changed

- Requires `@reevit/core` `^0.9.1`, which sends a per-attempt UUID as the
  `Idempotency-Key` instead of a 32-bit hash and honours the currency
  exponent when formatting amounts (a 5,000 XOF charge no longer renders as
  `50.00`).
- The displayed amount and the amount handed to each PSP bridge come from the
  payment intent when there is one, falling back to the props.
- **Release order:** `@reevit/core` 0.9.1 must be published to npm before
  `@reevit/vue` can install via `npm ci`, build in CI, or be published.
  `package-lock.json` still resolves core 0.9.0 and predates the new test
  dependencies; regenerate it once 0.9.1 is on npm.

### Fixed

- A checkout configured with neither `sessionSecret`, `amount`+`currency`,
  `paymentLinkCode` nor `initialPaymentIntent` now emits `error` immediately
  instead of failing later inside the API client.

## [0.10.3] - 2026-07-18

### Changed

- Release artifacts are built reproducibly and the npm lockfile is committed.

## [0.10.2] - 2026-07-18

### Fixed

- The PSP script loader no longer touches `document` during SSR.

### Changed

- Publishing moved to npm trusted publishing and the provenance repository
  field was corrected.

## [0.10.1] - 2026-07-08

### Fixed

- Paystack is driven through the Inline v2 instance API and resumes
  backend-initialized transactions instead of creating a new one.

### Changed

- CI workflows migrated to Blacksmith runners.

> Tag note: the `0.10.1` tag points at `d5d244f`, whose `package.json` still
> reads `0.10.0`. The manifest was bumped straight to `0.10.2`.

## [0.10.0] - 2026-05-15

### Changed

- Checkout UI redesigned onto the brutalist design system: reworked
  `ReevitCheckout` and `MobileMoneyForm`, a new `LoadingState` component and a
  rewritten stylesheet.

## [0.9.0] - 2026-05-15

### Added

- Checkout session support in the `useReevit` composable.

### Changed

- Build and publish workflows handle a prerelease `@reevit/core` and produce a
  stable ESM bundle and declaration output.

## [0.8.1] - 2026-03-13

### Changed

- Re-compressed the bundled M-Pesa logo (117 KB to 6 KB).

## [0.8.0] - 2026-03-03

### Changed

- Aligned the Hubtel callback and provider reference flow.

## [0.7.0] - 2026-02-07

Internal changes — `@reevit/core` dependency bump and version alignment across
the Reevit SDKs.

## [0.6.0] - 2026-02-04

### 🛠 Improvements

- Added `idempotencyKey` support in checkout config and intent initialization.
- Added in-flight dedupe for payment intent creation.

## [0.5.9] - 2026-01-21

### Changed

- Reworked `ReevitCheckout`, the `useReevit` composable, the PSP bridge loaders
  and the widget stylesheet. The originating commit message does not describe
  the change further.

## [0.5.1] - 2026-01-17

### Changed

- Widget stylesheet updates.

## [0.5.0] - 2026-01-11

### 🚀 New Features

#### Apple Pay & Google Pay Support
- Added `apple_pay` and `google_pay` as supported payment methods.
- Included localized logos for Apple Pay and Google Pay.

#### Local Asset Bundling
- Switched from CDN-hosted logos to local bundled assets for better performance and reliability.

#### Success Screen Customization
- Added `successDelayMs` prop to `ReevitCheckout` to control how long the success screen is displayed before closing (default: 5000ms).

### 📦 Install / Upgrade

```bash
npm install @reevit/vue@0.5.0
```

---

## [0.3.2] - 2025-12-29

### 🐛 Bug Fixes

#### Fixed: Payment Method Selector Bypass
Resolved an issue where the `ReevitCheckout` component would bypass the payment method selection screen and auto-select 'card' when an `initialPaymentIntent` was provided. This fix ensures:
- The `ReevitCheckout` popup now correctly displays the payment method selector (e.g., Card, Mobile Money) when multiple options are available.
- The auto-advance logic is less aggressive, allowing users to make their selection within the popup.
- The composable no longer auto-selects a method if more than one is available in the `initialPaymentIntent`.

### 🚀 New Features

#### Added: Controlled Mode Support
The `ReevitCheckout` component now supports controlled mode for advanced use cases like Payment Links:

```vue
<template>
  <ReevitCheckout
    :isOpen="isCheckoutOpen"
    @openChange="isCheckoutOpen = $event"
    :initialPaymentIntent="paymentIntent"
    :publicKey="publicKey"
    :amount="amount"
    :currency="currency"
    @success="handleSuccess"
    @error="handleError"
    @close="handleClose"
  />
</template>
```

**New props:**
| Prop | Type | Description |
|------|------|-------------|
| `initialPaymentIntent` | `PaymentIntent` | Pass a pre-created payment intent (skips internal initialization) |

#### Added: Public Payment Confirmation
The SDK now supports confirming payments via a public endpoint using a client secret, enabling anonymous payment link flows without authentication.

### 📦 Install / Upgrade

```bash
npm install @reevit/vue@0.3.2
# or
yarn add @reevit/vue@0.3.2
# or
pnpm add @reevit/vue@0.3.2
```

### ⚠️ Breaking Changes

None. This is a backwards-compatible release.

### Full Changelog

- `b5eca56` - fix: Restore payment method selector in ReevitCheckout
- `38ae223` - chore: Bump version to 0.3.2

## [0.1.0] - 2024-12-24

### Added
- Initial release
- **Components:**
  - `ReevitCheckout` - Complete checkout widget with modal UI
  - `PaymentMethodSelector` - Payment method selection component
  - `MobileMoneyForm` - Mobile money input with network detection
- **Composables:**
  - `useReevit` - Core reactive state management
- **PSP Bridge Functions:**
  - `openPaystackPopup()` - Paystack inline popup
  - `openFlutterwaveModal()` - Flutterwave checkout
  - `openHubtelPopup()` - Hubtel checkout
  - `createStripeInstance()` - Stripe.js initialization
  - `confirmStripePayment()` - Stripe payment confirmation
  - `openMonnifyModal()` - Monnify SDK modal
  - `initiateMPesaSTKPush()` - M-Pesa STK Push
- **Script Loaders:**
  - `loadPaystackScript()`
  - `loadFlutterwaveScript()`
  - `loadHubtelScript()`
  - `loadStripeScript()`
  - `loadMonnifyScript()`
- Theme customization support
- Dark mode support
- Vue 3 Composition API
- TypeScript support
