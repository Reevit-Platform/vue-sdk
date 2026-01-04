import { ref as $, watch as N, computed as w, readonly as _, defineComponent as V, createElementBlock as h, openBlock as v, createElementVNode as c, toDisplayString as I, unref as L, Fragment as q, renderList as Q, normalizeClass as D, createCommentVNode as E, withModifiers as X, withDirectives as oe, vModelText as ae, createTextVNode as Z, normalizeStyle as ee, onUnmounted as re, renderSlot as Y, createBlock as W, Teleport as se, createVNode as ie } from "vue";
import { createInitialState as le, ReevitAPIClient as ce, generateReference as de, detectCountryFromCurrency as ue, reevitReducer as me, formatAmount as pe, cn as te, detectNetwork as ye, validatePhone as G, createThemeVariables as ve } from "@reevit/core";
import { ReevitAPIClient as vt, cn as ht, createReevitClient as ft, detectCountryFromCurrency as bt, detectNetwork as wt, formatAmount as kt, formatPhone as Pt, validatePhone as Ct } from "@reevit/core";
function he(t) {
  const n = t.toLowerCase();
  return n.includes("paystack") ? "paystack" : n.includes("hubtel") ? "hubtel" : n.includes("flutterwave") ? "flutterwave" : n.includes("stripe") ? "stripe" : n.includes("monnify") ? "monnify" : n.includes("mpesa") || n.includes("m-pesa") ? "mpesa" : "paystack";
}
function fe(t, n) {
  return {
    id: t.id,
    clientSecret: t.client_secret,
    pspPublicKey: t.psp_public_key,
    pspCredentials: t.psp_credentials,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    recommendedPsp: he(t.provider),
    availableMethods: n.paymentMethods || ["card", "mobile_money"],
    reference: t.reference || n.reference,
    connectionId: t.connection_id,
    provider: t.provider,
    feeAmount: t.fee_amount,
    feeCurrency: t.fee_currency,
    netAmount: t.net_amount,
    metadata: n.metadata
  };
}
function be(t) {
  const { config: n, onSuccess: e, onError: i, onClose: o, onStateChange: m, apiBaseUrl: d } = t, s = $(le());
  if (n.initialPaymentIntent) {
    const l = n.initialPaymentIntent;
    s.value = {
      ...s.value,
      status: "ready",
      paymentIntent: l,
      selectedMethod: l.availableMethods?.length === 1 ? l.availableMethods[0] : null
    };
  }
  const p = new ce({
    publicKey: n.publicKey,
    baseUrl: d
  }), u = (l) => {
    s.value = me(s.value, l);
  };
  N(
    () => s.value.status,
    (l) => {
      m?.(l);
    }
  );
  const a = async (l) => {
    u({ type: "INIT_START" });
    try {
      const r = n.reference || de(), y = ue(n.currency), b = l || n.paymentMethods?.[0] || "card", { data: P, error: H } = await p.createPaymentIntent(
        { ...n, reference: r },
        b,
        y
      );
      if (H) {
        u({ type: "INIT_ERROR", payload: H }), i?.(H);
        return;
      }
      if (!P) {
        const B = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        u({ type: "INIT_ERROR", payload: B }), i?.(B);
        return;
      }
      const ne = fe(P, { ...n, reference: r });
      u({ type: "INIT_SUCCESS", payload: ne });
    } catch (r) {
      const y = {
        code: "INIT_FAILED",
        message: r instanceof Error ? r.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: r
      };
      u({ type: "INIT_ERROR", payload: y }), i?.(y);
    }
  }, f = (l) => {
    u({ type: "SELECT_METHOD", payload: l });
  }, C = async (l) => {
    if (!(!s.value.paymentIntent || !s.value.selectedMethod)) {
      u({ type: "PROCESS_START" });
      try {
        let r;
        if (s.value.paymentIntent.clientSecret) {
          const { data: b, error: P } = await p.confirmPaymentIntent(
            s.value.paymentIntent.id,
            s.value.paymentIntent.clientSecret
          );
          if (P) {
            u({ type: "PROCESS_ERROR", payload: P }), i?.(P);
            return;
          }
          r = b;
        } else {
          const { data: b, error: P } = await p.confirmPayment(s.value.paymentIntent.id);
          if (P) {
            u({ type: "PROCESS_ERROR", payload: P }), i?.(P);
            return;
          }
          r = b;
        }
        const y = {
          paymentId: s.value.paymentIntent.id,
          reference: l.reference || s.value.paymentIntent.reference || s.value.paymentIntent.metadata?.reference || "",
          amount: s.value.paymentIntent.amount,
          currency: s.value.paymentIntent.currency,
          paymentMethod: s.value.selectedMethod,
          psp: s.value.paymentIntent.recommendedPsp,
          pspReference: l.pspReference || r?.provider_ref_id || "",
          status: "success",
          metadata: l
        };
        u({ type: "PROCESS_SUCCESS", payload: y }), e?.(y);
      } catch (r) {
        const y = {
          code: "PAYMENT_FAILED",
          message: r instanceof Error ? r.message : "Payment failed",
          recoverable: !0,
          originalError: r
        };
        u({ type: "PROCESS_ERROR", payload: y }), i?.(y);
      }
    }
  }, g = async (l) => {
    await C(l);
  }, A = (l) => {
    u({ type: "PROCESS_ERROR", payload: l }), i?.(l);
  }, S = () => {
    u({ type: "RESET" });
  }, U = async () => {
    if (s.value.paymentIntent && s.value.status !== "success")
      try {
        await p.cancelPaymentIntent(s.value.paymentIntent.id);
      } catch {
      }
    u({ type: "CLOSE" }), o?.();
  }, M = w(() => s.value.status), K = w(() => s.value.paymentIntent), R = w(() => s.value.selectedMethod), j = w(() => s.value.error), k = w(() => s.value.result), O = w(
    () => s.value.status === "loading" || s.value.status === "processing"
  ), x = w(
    () => s.value.status === "ready" || s.value.status === "method_selected" || s.value.status === "processing"
  ), T = w(() => s.value.status === "success"), z = w(() => s.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: _(M),
    paymentIntent: _(K),
    selectedMethod: _(R),
    error: _(j),
    result: _(k),
    // Actions
    initialize: a,
    selectMethod: f,
    processPayment: C,
    handlePspSuccess: g,
    handlePspError: A,
    reset: S,
    close: U,
    // Computed
    isLoading: _(O),
    isReady: _(x),
    isComplete: _(T),
    canRetry: _(z)
  };
}
const we = { class: "reevit-method-selector" }, ke = { class: "reevit-amount-display" }, Pe = { class: "reevit-methods-grid" }, Ce = ["onClick"], _e = { class: "reevit-method-icon" }, Se = { class: "reevit-method-info" }, Ee = { class: "reevit-method-name" }, Ie = { class: "reevit-method-description" }, ge = { class: "reevit-method-radio" }, Me = {
  key: 0,
  class: "reevit-radio-inner"
}, Re = /* @__PURE__ */ V({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    amount: {},
    currency: {},
    provider: {}
  },
  emits: ["select"],
  setup(t, { emit: n }) {
    const e = t, i = n, o = {
      hubtel: "Hubtel",
      paystack: "Paystack",
      flutterwave: "Flutterwave",
      monnify: "Monnify",
      mpesa: "M-Pesa",
      stripe: "Stripe"
    }, m = (p) => e.provider?.toLowerCase().includes("hubtel") && p === "mobile_money" ? `Pay with ${o[e.provider.toLowerCase()] || "Hubtel"}` : {
      card: "Card",
      mobile_money: "Mobile Money",
      bank_transfer: "Bank Transfer"
    }[p], d = (p) => e.provider?.toLowerCase().includes("hubtel") ? "Card, Mobile Money, and Bank Transfer" : {
      card: "Visa, Mastercard, Maestro",
      mobile_money: "MTN, Vodafone, AirtelTigo",
      bank_transfer: "Transfer directly from your bank"
    }[p], s = w(() => [
      {
        id: "card",
        name: m("card"),
        description: d("card"),
        icon: "💳"
      },
      {
        id: "mobile_money",
        name: m("mobile_money"),
        description: d("mobile_money"),
        icon: "📱"
      },
      {
        id: "bank_transfer",
        name: m("bank_transfer"),
        description: d("bank_transfer"),
        icon: "🏦"
      }
    ].filter((p) => e.methods.includes(p.id)));
    return (p, u) => (v(), h("div", we, [
      u[0] || (u[0] = c("h3", { class: "reevit-section-title" }, "Select Payment Method", -1)),
      c("p", ke, " Pay " + I(L(pe)(t.amount, t.currency)), 1),
      c("div", Pe, [
        (v(!0), h(q, null, Q(s.value, (a) => (v(), h("button", {
          key: a.id,
          type: "button",
          class: D(L(te)("reevit-method-card", t.selected === a.id && "reevit-method-card--selected")),
          onClick: (f) => i("select", a.id)
        }, [
          c("span", _e, I(a.icon), 1),
          c("div", Se, [
            c("span", Ee, I(a.name), 1),
            c("span", Ie, I(a.description), 1)
          ]),
          c("div", ge, [
            t.selected === a.id ? (v(), h("div", Me)) : E("", !0)
          ])
        ], 10, Ce))), 128))
      ])
    ]));
  }
}), xe = { class: "reevit-form-group" }, Te = ["disabled"], $e = { class: "reevit-network-selector" }, Ne = { class: "reevit-networks-grid" }, Le = ["onClick", "disabled"], Ue = {
  key: 0,
  class: "reevit-error-message"
}, Oe = ["disabled"], De = {
  key: 0,
  class: "reevit-spinner"
}, Fe = { key: 1 }, Ae = /* @__PURE__ */ V({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean }
  },
  emits: ["submit"],
  setup(t, { emit: n }) {
    const e = t, i = n, o = $(e.initialPhone || ""), m = $(null), d = $(null);
    N(o, (u) => {
      const a = ye(u);
      a && (m.value = a), d.value && (d.value = null);
    });
    const s = () => {
      if (!G(o.value)) {
        d.value = "Please enter a valid phone number";
        return;
      }
      if (!m.value) {
        d.value = "Please select your mobile network";
        return;
      }
      i("submit", {
        phone: o.value,
        network: m.value
      });
    }, p = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (u, a) => (v(), h("form", {
      class: "reevit-momo-form",
      onSubmit: X(s, ["prevent"])
    }, [
      c("div", xe, [
        a[1] || (a[1] = c("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        oe(c("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": a[0] || (a[0] = (f) => o.value = f),
          type: "tel",
          class: D(["reevit-input", { "reevit-input--error": d.value && !L(G)(o.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: t.loading,
          autocomplete: "tel"
        }, null, 10, Te), [
          [ae, o.value]
        ])
      ]),
      c("div", $e, [
        a[2] || (a[2] = c("label", { class: "reevit-label" }, "Select Network", -1)),
        c("div", Ne, [
          (v(), h(q, null, Q(p, (f) => c("button", {
            key: f.id,
            type: "button",
            class: D(L(te)("reevit-network-btn", m.value === f.id && "reevit-network-btn--selected")),
            onClick: (C) => m.value = f.id,
            disabled: t.loading
          }, [
            c("div", {
              class: "reevit-network-dot",
              style: ee({ backgroundColor: f.color })
            }, null, 4),
            Z(" " + I(f.name), 1)
          ], 10, Le)), 64))
        ])
      ]),
      d.value ? (v(), h("p", Ue, I(d.value), 1)) : E("", !0),
      c("button", {
        type: "submit",
        class: "reevit-submit-btn",
        disabled: t.loading || !o.value
      }, [
        t.loading ? (v(), h("span", De)) : (v(), h("span", Fe, "Continue"))
      ], 8, Oe),
      a[3] || (a[3] = c("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
    ], 32));
  }
});
class Ke {
  constructor(n) {
    this.baseUrl = "https://unified-pay.hubtel.com", this.messageHandler = null, this.stylesInjected = !1, n && (this.baseUrl = n);
  }
  /**
  * Redirects the user to the checkout page with the provided purchase information and configuration.
  * @param purchaseInfo - The purchase information.
  * @param config - The configuration.
  * @throws {Error} If the popup is blocked by the browser.
  */
  redirect({ purchaseInfo: n, config: e }) {
    const i = this.createCheckoutUrl(n, e), o = window.open(i);
    if (!o || o.closed || typeof o.closed > "u")
      throw new Error("Popup was blocked by the browser. Please allow popups for this site.");
  }
  /**
  * Initializes the iframe for the checkout process.
  *
  * @param purchaseInfo - The purchase information.
  * @param callBacks - The callback functions.
  * @param config - The configuration settings.
  * @param iframeStyle - The style options for the iframe (optional).
  * @throws {Error} If the container element with id "hubtel-checkout-iframe" is not found.
  */
  initIframe({ purchaseInfo: n, callBacks: e, config: i, iframeStyle: o }) {
    var m, d, s;
    this.registerEvents(e);
    const p = document.getElementById("hubtel-checkout-iframe");
    if (!p)
      throw new Error('Container element with id "hubtel-checkout-iframe" not found in the DOM.');
    p.innerHTML = "";
    const u = document.createElement("div");
    u.textContent = "Loading...", p.appendChild(u);
    const a = document.createElement("iframe");
    a.setAttribute("id", "hubtel-iframe-element"), a.src = this.createCheckoutUrl(n, i), a.style.display = "none", a.style.width = (m = o?.width) !== null && m !== void 0 ? m : "100%", a.style.height = (d = o?.height) !== null && d !== void 0 ? d : "100%", a.style.minHeight = o?.minHeight || "400px", a.style.border = (s = o?.border) !== null && s !== void 0 ? s : "none", a.onload = () => {
      var f;
      p.removeChild(u), a.style.display = "block", (f = e.onLoad) === null || f === void 0 || f.call(e);
    }, p.appendChild(a);
  }
  openModal({ purchaseInfo: n, callBacks: e, config: i }) {
    this.injectStyles(), this.createIframe(), this.handleBackButton(), this.registerEvents(e), this.renderWebpageInPopup(this.createCheckoutUrl(n, i), e.onClose, e.onLoad);
  }
  createCheckoutUrl(n, e) {
    const i = Object.assign(Object.assign({}, n), e), o = Object.keys(i).reduce((u, a) => (i[a] !== null && i[a] !== void 0 && (u[a] = i[a]), u), {}), m = Object.keys(o).map((u) => `${u}=${encodeURIComponent(o[u])}`).join("&"), d = this.encodeBase64(m), s = encodeURIComponent(d);
    return `${o?.branding === "disabled" ? `${this.baseUrl}/pay/direct` : `${this.baseUrl}/pay`}?p=${s}`;
  }
  encodeBase64(n) {
    return btoa(unescape(encodeURIComponent(n)));
  }
  handleBackButton() {
    window.addEventListener("popstate", () => {
      this.closePopUp();
    });
  }
  createIframe() {
    const n = document.createElement("div");
    n.setAttribute("id", "backdrop"), n.classList.add("backdrop");
    const e = document.createElement("span");
    e.classList.add("checkout-loader"), n.appendChild(e), document.body.appendChild(n);
  }
  registerEvents(n) {
    this.messageHandler && window.removeEventListener("message", this.messageHandler, !1);
    const e = (i) => {
      var o, m, d, s, p, u;
      if (i.origin !== this.baseUrl)
        return;
      const { data: a } = i;
      if (a.success === !0)
        (o = n.onPaymentSuccess) === null || o === void 0 || o.call(n, a);
      else if (a.success === !1)
        (m = n.onPaymentFailure) === null || m === void 0 || m.call(n, a);
      else if (a.initialized)
        (d = n.init) === null || d === void 0 || d.call(n, a), (s = n.onInit) === null || s === void 0 || s.call(n, a);
      else if (a.feesChanged)
        (p = n.onFeesChanged) === null || p === void 0 || p.call(n, a.fees);
      else if (a.resize) {
        const f = document.getElementById("hubtel-iframe-element");
        f && (f.style.height = a.height + "px"), (u = n?.onResize) === null || u === void 0 || u.call(n, a);
      }
    };
    this.messageHandler = e, window.addEventListener("message", e, !1);
  }
  /**
   * Removes the message event listener to prevent memory leaks.
   * Call this method when you're done with the checkout to clean up resources.
   */
  destroy() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler, !1), this.messageHandler = null);
  }
  renderWebpageInPopup(n, e, i) {
    const o = document.createElement("div");
    o.classList.add("checkout-modal");
    const m = document.createElement("div");
    m.setAttribute("id", "checkout-close-icon"), m.innerHTML = "&times;", m.classList.add("close-icon"), m.addEventListener("click", () => {
      this.closePopUp(), e?.();
    }), o.appendChild(m);
    const d = document.createElement("iframe");
    d.src = n, history.pushState({ modalOpen: !0 }, ""), d.classList.add("iframe"), o.appendChild(d), document.body.appendChild(o), o.style.opacity = "0", d.addEventListener("load", () => {
      o.style.opacity = "1", i?.();
    });
  }
  closePopUp() {
    const n = document.querySelector(".backdrop"), e = document.querySelector(".checkout-modal");
    n && document.body.removeChild(n), e && document.body.removeChild(e), history.replaceState(null, ""), window.removeEventListener("popstate", this.closePopUp);
  }
  injectStyles() {
    if (this.stylesInjected)
      return;
    const n = document.createElement("style");
    n.type = "text/css", n.setAttribute("data-hubtel-checkout", "true"), n.innerHTML = `
        .backdrop {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999998;
        }

        .loader {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 999999;
            /* Your loader styles */
        }

        .checkout-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            height: 90%;
            padding-top: 20px;
            max-width: 480px;
            background-color: #fff;
            border-radius: 10px;
            z-index: 1000000;
            transition: opacity 0.5s ease, transform 0.5s ease;
            opacity: 0;
        }

        .close-icon {
            position: absolute;
            top: 10px;
            width: 25px;
            height: 25px;
            font-size: 20px;
            right: 10px;
            cursor: pointer;
            color: #fff;
            background-color: #000;
            text-align: center;
            border-radius: 50%;
        }

        .iframe {
            width: 100%;
            height: calc(100% - 20px);
            border: none;
        }

        .checkout-loader {
          width: 30px;
          height: 30px;
          border: 3px solid #FFF;
          border-bottom-color: #42b883;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          position : fixed;
          top : 50%;
          left : 50%;
          transform : translate(-50%, -50%);
          z-index : 999999;
          animation: rotation 1s linear infinite;
      }

      @keyframes rotation {
          0% {
              transform: rotate(0deg);
          }
          100% {
              transform: rotate(360deg);
          }
      }

      @media screen and (max-width: 600px) {
          .checkout-modal {
              width: 100%;
              height: 100%;
              border-radius: 0;
              padding-bottom: 0px;
              padding-top: 0px;
          }
          .close-icon{
            top: 10px;
            right: 15px;
          }

          .iframe {

            height: 100%;

        }
      }
    `, document.head.appendChild(n), this.stylesInjected = !0;
  }
}
const J = /* @__PURE__ */ new Map();
function F(t, n) {
  const e = J.get(n);
  if (e) return e;
  const i = new Promise((o, m) => {
    if (document.getElementById(n)) {
      o();
      return;
    }
    const d = document.createElement("script");
    d.id = n, d.src = t, d.async = !0, d.onload = () => o(), d.onerror = () => m(new Error(`Failed to load ${n} script`)), document.head.appendChild(d);
  });
  return J.set(n, i), i;
}
function je() {
  return F("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function dt() {
  return Promise.resolve();
}
function ze() {
  return F("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function He() {
  return F("https://js.stripe.com/v3/", "stripe-script");
}
function Ve() {
  return F("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
}
async function qe(t) {
  if (await je(), !window.PaystackPop)
    throw new Error("Paystack script not loaded");
  window.PaystackPop.setup({
    key: t.key,
    email: t.email,
    amount: t.amount,
    currency: t.currency,
    ref: t.ref,
    metadata: t.metadata,
    callback: t.onSuccess,
    onClose: t.onClose
  }).openIframe();
}
async function Be(t) {
  const n = new Ke(), e = {
    amount: t.amount,
    purchaseDescription: t.purchaseDescription,
    customerPhoneNumber: t.customerPhone || "",
    clientReference: `hubtel_${Date.now()}`
  }, i = {
    branding: "enabled",
    callbackUrl: t.callbackUrl || (typeof window < "u" ? window.location.href : ""),
    merchantAccount: typeof t.clientId == "string" ? parseInt(t.clientId, 10) : t.clientId,
    basicAuth: t.basicAuth || ""
  };
  n.openModal({
    purchaseInfo: e,
    config: i,
    callBacks: {
      onPaymentSuccess: (o) => {
        t.onSuccess(o), n.closePopUp();
      },
      onPaymentFailure: () => {
        t.onClose();
      },
      onClose: () => {
        t.onClose();
      }
    }
  });
}
async function Ye(t) {
  if (await ze(), !window.FlutterwaveCheckout)
    throw new Error("Flutterwave script not loaded");
  window.FlutterwaveCheckout({
    public_key: t.public_key,
    tx_ref: t.tx_ref,
    amount: t.amount,
    currency: t.currency,
    customer: t.customer,
    payment_options: t.payment_options,
    customizations: t.customizations,
    callback: t.callback,
    onclose: t.onclose
  });
}
async function We(t) {
  if (await He(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(t);
}
async function ut(t) {
  const e = await (await We(t.publishableKey)).confirmPayment({
    elements: t.elements,
    clientSecret: t.clientSecret,
    redirect: "if_required"
  });
  e.error ? t.onError({ message: e.error.message || "Payment failed" }) : e.paymentIntent && t.onSuccess({
    paymentIntentId: e.paymentIntent.id,
    status: e.paymentIntent.status
  });
}
async function Ge(t) {
  if (await Ve(), !window.MonnifySDK)
    throw new Error("Monnify SDK not loaded");
  window.MonnifySDK.initialize({
    amount: t.amount,
    currency: t.currency,
    reference: t.reference,
    customerName: t.customerName,
    customerEmail: t.customerEmail,
    customerMobileNumber: t.customerPhone,
    apiKey: t.apiKey,
    contractCode: t.contractCode,
    paymentDescription: t.paymentDescription || "Payment",
    isTestMode: t.isTestMode ?? !1,
    metadata: t.metadata,
    onComplete: (n) => {
      n.status === "SUCCESS" ? t.onSuccess({
        transactionReference: n.transactionReference,
        paymentReference: n.paymentReference,
        ...n
      }) : t.onError?.({ message: n.message || "Payment failed" });
    },
    onClose: t.onClose
  });
}
async function Je(t, n) {
  t.onInitiated();
  try {
    const e = await fetch(n, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: t.phoneNumber,
        amount: t.amount,
        reference: t.reference,
        description: t.description
      })
    });
    if (!e.ok) {
      const m = (await e.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return t.onError({ message: m }), { status: "failed", message: m };
    }
    const i = await e.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: i.checkout_request_id || i.transaction_id
    };
  } catch (e) {
    const i = e instanceof Error ? e.message : "Network error";
    return t.onError({ message: i }), { status: "failed", message: i };
  }
}
const Qe = ["disabled"], Xe = {
  key: 0,
  class: "reevit-spinner"
}, Ze = { class: "reevit-modal-body" }, et = {
  key: 0,
  class: "reevit-loading-state"
}, tt = {
  key: 1,
  class: "reevit-error-state"
}, nt = {
  key: 2,
  class: "reevit-success-state"
}, ot = {
  key: 1,
  class: "reevit-method-form-container"
}, at = {
  key: 2,
  class: "reevit-card-info"
}, rt = ["disabled"], st = {
  key: 0,
  class: "reevit-spinner"
}, it = { key: 1 }, mt = /* @__PURE__ */ V({
  __name: "ReevitCheckout",
  props: {
    publicKey: {},
    amount: {},
    currency: {},
    email: {},
    phone: {},
    reference: {},
    metadata: {},
    paymentMethods: {},
    theme: {},
    isOpen: { type: Boolean },
    apiBaseUrl: {},
    initialPaymentIntent: {}
  },
  emits: ["success", "error", "close"],
  setup(t, { emit: n }) {
    const e = t, i = n, {
      status: o,
      paymentIntent: m,
      selectedMethod: d,
      error: s,
      isLoading: p,
      isReady: u,
      initialize: a,
      selectMethod: f,
      handlePspSuccess: C,
      handlePspError: g,
      close: A
    } = be({
      config: {
        publicKey: e.publicKey,
        amount: e.amount,
        currency: e.currency,
        email: e.email,
        phone: e.phone,
        reference: e.reference,
        metadata: e.metadata,
        paymentMethods: e.paymentMethods,
        initialPaymentIntent: e.initialPaymentIntent
      },
      apiBaseUrl: e.apiBaseUrl,
      onSuccess: (l) => i("success", l),
      onError: (l) => i("error", l),
      onClose: () => i("close")
    }), S = $(e.isOpen ?? !1);
    N(() => e.isOpen, (l) => {
      l !== void 0 && (S.value = l);
    });
    const U = () => {
      S.value = !0, !m.value && o.value === "idle" && a();
    };
    N([S, m, d], ([l, r, y]) => {
      l && r && y && y === "card" && R(null);
    });
    const M = () => {
      S.value = !1, A();
    }, K = (l) => {
      f(l);
    }, R = async (l) => {
      const r = m.value;
      if (!r) return;
      const y = r.recommendedPsp;
      try {
        if (y === "paystack")
          await qe({
            key: e.publicKey,
            email: e.email || "",
            amount: e.amount,
            currency: e.currency,
            ref: r.id,
            onSuccess: (b) => C(b),
            onClose: () => {
            }
          });
        else if (y === "hubtel")
          await Be({
            clientId: r.pspCredentials?.merchantAccount || e.publicKey,
            purchaseDescription: `Payment for ${e.amount} ${e.currency}`,
            amount: e.amount,
            customerPhone: l?.phone || e.phone,
            customerEmail: e.email,
            basicAuth: r.pspCredentials?.basicAuth,
            onSuccess: (b) => C(b),
            onClose: () => {
            }
          });
        else if (y === "flutterwave")
          await Ye({
            public_key: e.publicKey,
            tx_ref: r.id,
            amount: e.amount,
            currency: e.currency,
            customer: {
              email: e.email || "",
              phone_number: l?.phone || e.phone
            },
            callback: (b) => C(b),
            onclose: () => {
            }
          });
        else if (y === "monnify")
          await Ge({
            apiKey: r.pspPublicKey || e.publicKey,
            contractCode: e.metadata?.contract_code || e.publicKey,
            amount: e.amount,
            currency: e.currency,
            reference: r.reference || r.id,
            customerName: e.metadata?.customer_name || e.email || "",
            customerEmail: e.email || "",
            customerPhone: l?.phone || e.phone,
            metadata: e.metadata,
            onSuccess: (b) => C(b),
            onClose: () => {
            }
          });
        else if (y === "mpesa") {
          const b = `${e.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${r.id}/mpesa`;
          await Je({
            phoneNumber: l?.phone || e.phone || "",
            amount: e.amount,
            reference: r.reference || r.id,
            description: `Payment ${r.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (P) => C(P),
            onError: (P) => g({ code: "MPESA_ERROR", message: P.message })
          }, b);
        } else g(y === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${y}" is not supported in this checkout.`
        });
      } catch (b) {
        g({
          code: "BRIDGE_ERROR",
          message: b instanceof Error ? b.message : "Failed to open payment gateway"
        });
      }
    }, j = w(() => ve(e.theme || {}));
    N(S, (l) => {
      l ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), re(() => {
      document.body.style.overflow = "";
    });
    const k = w(() => o.value), O = w(() => s.value), x = w(() => d.value), T = w(() => p.value), z = w(() => u.value);
    return (l, r) => (v(), h("div", {
      class: "reevit-sdk-container",
      style: ee(j.value)
    }, [
      Y(l.$slots, "default", {
        open: U,
        isLoading: T.value
      }, () => [
        c("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: U,
          disabled: T.value
        }, [
          T.value ? (v(), h("span", Xe)) : Y(l.$slots, "button-text", { key: 1 }, () => [
            r[1] || (r[1] = Z("Pay Now", -1))
          ])
        ], 8, Qe)
      ]),
      (v(), W(se, { to: "body" }, [
        S.value ? (v(), h("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: X(M, ["self"])
        }, [
          c("div", {
            class: D(["reevit-modal-content", { "reevit-modal--dark": e.theme?.darkMode }])
          }, [
            c("button", {
              class: "reevit-modal-close",
              onClick: M,
              "aria-label": "Close"
            }, " × "),
            r[9] || (r[9] = c("div", { class: "reevit-modal-header" }, [
              c("img", {
                src: "https://i.imgur.com/bzUR5Lm.png",
                alt: "Reevit",
                class: "reevit-modal__logo"
              })
            ], -1)),
            c("div", Ze, [
              k.value === "loading" ? (v(), h("div", et, [...r[2] || (r[2] = [
                c("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                c("p", null, "Initializing payment...", -1)
              ])])) : k.value === "failed" && O.value ? (v(), h("div", tt, [
                r[3] || (r[3] = c("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                r[4] || (r[4] = c("h3", null, "Payment Failed", -1)),
                c("p", null, I(O.value.message), 1),
                c("button", {
                  class: "reevit-retry-btn",
                  onClick: r[0] || (r[0] = (y) => L(a)())
                }, "Retry")
              ])) : k.value === "success" ? (v(), h("div", nt, [
                r[5] || (r[5] = c("div", { class: "reevit-success-icon" }, "✅", -1)),
                r[6] || (r[6] = c("h3", null, "Payment Successful", -1)),
                r[7] || (r[7] = c("p", null, "Thank you for your payment.", -1)),
                c("button", {
                  class: "reevit-done-btn",
                  onClick: M
                }, "Done")
              ])) : z.value ? (v(), h(q, { key: 3 }, [
                k.value === "ready" || k.value === "method_selected" || k.value === "processing" ? (v(), W(Re, {
                  key: 0,
                  methods: e.paymentMethods || ["card", "mobile_money"],
                  selected: x.value,
                  amount: e.amount,
                  currency: e.currency,
                  provider: l.psp,
                  onSelect: K
                }, null, 8, ["methods", "selected", "amount", "currency", "provider"])) : E("", !0),
                (k.value === "method_selected" || k.value === "processing") && x.value === "mobile_money" ? (v(), h("div", ot, [
                  ie(Ae, {
                    "initial-phone": e.phone,
                    loading: k.value === "processing",
                    onSubmit: R
                  }, null, 8, ["initial-phone", "loading"])
                ])) : E("", !0),
                (k.value === "method_selected" || k.value === "processing") && x.value === "card" ? (v(), h("div", at, [
                  r[8] || (r[8] = c("p", { class: "reevit-info-text" }, "You will be redirected to our secure payment partner to complete your card payment.", -1)),
                  c("button", {
                    class: "reevit-submit-btn",
                    onClick: R,
                    disabled: k.value === "processing"
                  }, [
                    k.value === "processing" ? (v(), h("span", st)) : (v(), h("span", it, "Proceed to Card Payment"))
                  ], 8, rt)
                ])) : E("", !0)
              ], 64)) : E("", !0)
            ]),
            r[10] || (r[10] = c("div", { class: "reevit-modal-footer" }, [
              c("div", { class: "reevit-trust-badges" }, [
                c("span", null, "PCI DSS Compliant"),
                c("span", null, "•"),
                c("span", null, "SSL Secure")
              ])
            ], -1))
          ], 2)
        ])) : E("", !0)
      ]))
    ], 4));
  }
});
export {
  Ae as MobileMoneyForm,
  Re as PaymentMethodSelector,
  vt as ReevitAPIClient,
  mt as ReevitCheckout,
  ht as cn,
  ut as confirmStripePayment,
  ft as createReevitClient,
  We as createStripeInstance,
  bt as detectCountryFromCurrency,
  wt as detectNetwork,
  kt as formatAmount,
  Pt as formatPhone,
  Je as initiateMPesaSTKPush,
  ze as loadFlutterwaveScript,
  dt as loadHubtelScript,
  Ve as loadMonnifyScript,
  je as loadPaystackScript,
  He as loadStripeScript,
  Ye as openFlutterwaveModal,
  Be as openHubtelPopup,
  Ge as openMonnifyModal,
  qe as openPaystackPopup,
  be as useReevit,
  Ct as validatePhone
};
