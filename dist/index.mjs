import { ref as $, watch as N, computed as b, readonly as _, defineComponent as V, createElementBlock as h, openBlock as y, createElementVNode as d, toDisplayString as S, unref as U, Fragment as q, renderList as Q, normalizeClass as D, createCommentVNode as I, withModifiers as X, withDirectives as oe, vModelText as ae, createTextVNode as Z, normalizeStyle as ee, onUnmounted as re, renderSlot as Y, createBlock as W, Teleport as se, createVNode as ie } from "vue";
import { createInitialState as le, ReevitAPIClient as ce, generateReference as de, detectCountryFromCurrency as ue, reevitReducer as me, formatAmount as pe, cn as te, detectNetwork as ye, validatePhone as G, createThemeVariables as ve } from "@reevit/core";
import { ReevitAPIClient as vt, cn as ht, createReevitClient as ft, detectCountryFromCurrency as bt, detectNetwork as wt, formatAmount as Pt, formatPhone as kt, validatePhone as Ct } from "@reevit/core";
function he(e) {
  const n = e.toLowerCase();
  return n.includes("paystack") ? "paystack" : n.includes("hubtel") ? "hubtel" : n.includes("flutterwave") ? "flutterwave" : "paystack";
}
function fe(e, n) {
  return {
    id: e.id,
    clientSecret: e.client_secret,
    pspPublicKey: e.psp_public_key,
    amount: e.amount,
    currency: e.currency,
    status: e.status,
    recommendedPsp: he(e.provider),
    availableMethods: n.paymentMethods || ["card", "mobile_money"],
    reference: e.reference || n.reference,
    connectionId: e.connection_id,
    provider: e.provider,
    feeAmount: e.fee_amount,
    feeCurrency: e.fee_currency,
    netAmount: e.net_amount,
    metadata: n.metadata
  };
}
function be(e) {
  const { config: n, onSuccess: t, onError: l, onClose: a, onStateChange: s, apiBaseUrl: u } = e, o = $(le());
  if (n.initialPaymentIntent) {
    const c = n.initialPaymentIntent;
    o.value = {
      ...o.value,
      status: "ready",
      paymentIntent: c,
      selectedMethod: c.availableMethods?.length === 1 ? c.availableMethods[0] : null
    };
  }
  const v = new ce({
    publicKey: n.publicKey,
    baseUrl: u
  }), m = (c) => {
    o.value = me(o.value, c);
  };
  N(
    () => o.value.status,
    (c) => {
      s?.(c);
    }
  );
  const i = async (c) => {
    m({ type: "INIT_START" });
    try {
      const r = n.reference || de(), p = ue(n.currency), C = c || n.paymentMethods?.[0] || "card", { data: P, error: H } = await v.createPaymentIntent(
        { ...n, reference: r },
        C,
        p
      );
      if (H) {
        m({ type: "INIT_ERROR", payload: H }), l?.(H);
        return;
      }
      if (!P) {
        const B = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        m({ type: "INIT_ERROR", payload: B }), l?.(B);
        return;
      }
      const ne = fe(P, { ...n, reference: r });
      m({ type: "INIT_SUCCESS", payload: ne });
    } catch (r) {
      const p = {
        code: "INIT_FAILED",
        message: r instanceof Error ? r.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: r
      };
      m({ type: "INIT_ERROR", payload: p }), l?.(p);
    }
  }, f = (c) => {
    m({ type: "SELECT_METHOD", payload: c });
  }, k = async (c) => {
    if (!(!o.value.paymentIntent || !o.value.selectedMethod)) {
      m({ type: "PROCESS_START" });
      try {
        let r;
        if (o.value.paymentIntent.clientSecret) {
          const { data: C, error: P } = await v.confirmPaymentIntent(
            o.value.paymentIntent.id,
            o.value.paymentIntent.clientSecret
          );
          if (P) {
            m({ type: "PROCESS_ERROR", payload: P }), l?.(P);
            return;
          }
          r = C;
        } else {
          const { data: C, error: P } = await v.confirmPayment(o.value.paymentIntent.id);
          if (P) {
            m({ type: "PROCESS_ERROR", payload: P }), l?.(P);
            return;
          }
          r = C;
        }
        const p = {
          paymentId: o.value.paymentIntent.id,
          reference: c.reference || o.value.paymentIntent.reference || o.value.paymentIntent.metadata?.reference || "",
          amount: o.value.paymentIntent.amount,
          currency: o.value.paymentIntent.currency,
          paymentMethod: o.value.selectedMethod,
          psp: o.value.paymentIntent.recommendedPsp,
          pspReference: c.pspReference || r?.provider_ref_id || "",
          status: "success",
          metadata: c
        };
        m({ type: "PROCESS_SUCCESS", payload: p }), t?.(p);
      } catch (r) {
        const p = {
          code: "PAYMENT_FAILED",
          message: r instanceof Error ? r.message : "Payment failed",
          recoverable: !0,
          originalError: r
        };
        m({ type: "PROCESS_ERROR", payload: p }), l?.(p);
      }
    }
  }, g = async (c) => {
    await k(c);
  }, A = (c) => {
    m({ type: "PROCESS_ERROR", payload: c }), l?.(c);
  }, E = () => {
    m({ type: "RESET" });
  }, L = async () => {
    if (o.value.paymentIntent && o.value.status !== "success")
      try {
        await v.cancelPaymentIntent(o.value.paymentIntent.id);
      } catch {
      }
    m({ type: "CLOSE" }), a?.();
  }, R = b(() => o.value.status), K = b(() => o.value.paymentIntent), M = b(() => o.value.selectedMethod), j = b(() => o.value.error), w = b(() => o.value.result), O = b(
    () => o.value.status === "loading" || o.value.status === "processing"
  ), x = b(
    () => o.value.status === "ready" || o.value.status === "method_selected" || o.value.status === "processing"
  ), T = b(() => o.value.status === "success"), z = b(() => o.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: _(R),
    paymentIntent: _(K),
    selectedMethod: _(M),
    error: _(j),
    result: _(w),
    // Actions
    initialize: i,
    selectMethod: f,
    processPayment: k,
    handlePspSuccess: g,
    handlePspError: A,
    reset: E,
    close: L,
    // Computed
    isLoading: _(O),
    isReady: _(x),
    isComplete: _(T),
    canRetry: _(z)
  };
}
const we = { class: "reevit-method-selector" }, Pe = { class: "reevit-amount-display" }, ke = { class: "reevit-methods-grid" }, Ce = ["onClick"], _e = { class: "reevit-method-icon" }, Ee = { class: "reevit-method-info" }, Ie = { class: "reevit-method-name" }, Se = { class: "reevit-method-description" }, ge = { class: "reevit-method-radio" }, Re = {
  key: 0,
  class: "reevit-radio-inner"
}, Me = /* @__PURE__ */ V({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    amount: {},
    currency: {}
  },
  emits: ["select"],
  setup(e, { emit: n }) {
    const t = e, l = n, a = b(() => [
      {
        id: "card",
        name: "Card",
        description: "Visa, Mastercard, Maestro",
        icon: "💳"
      },
      {
        id: "mobile_money",
        name: "Mobile Money",
        description: "MTN, Vodafone, AirtelTigo",
        icon: "📱"
      },
      {
        id: "bank_transfer",
        name: "Bank Transfer",
        description: "Transfer directly from your bank",
        icon: "🏦"
      }
    ].filter((s) => t.methods.includes(s.id)));
    return (s, u) => (y(), h("div", we, [
      u[0] || (u[0] = d("h3", { class: "reevit-section-title" }, "Select Payment Method", -1)),
      d("p", Pe, " Pay " + S(U(pe)(e.amount, e.currency)), 1),
      d("div", ke, [
        (y(!0), h(q, null, Q(a.value, (o) => (y(), h("button", {
          key: o.id,
          type: "button",
          class: D(U(te)("reevit-method-card", e.selected === o.id && "reevit-method-card--selected")),
          onClick: (v) => l("select", o.id)
        }, [
          d("span", _e, S(o.icon), 1),
          d("div", Ee, [
            d("span", Ie, S(o.name), 1),
            d("span", Se, S(o.description), 1)
          ]),
          d("div", ge, [
            e.selected === o.id ? (y(), h("div", Re)) : I("", !0)
          ])
        ], 10, Ce))), 128))
      ])
    ]));
  }
}), xe = { class: "reevit-form-group" }, Te = ["disabled"], $e = { class: "reevit-network-selector" }, Ne = { class: "reevit-networks-grid" }, Ue = ["onClick", "disabled"], Le = {
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
  setup(e, { emit: n }) {
    const t = e, l = n, a = $(t.initialPhone || ""), s = $(null), u = $(null);
    N(a, (m) => {
      const i = ye(m);
      i && (s.value = i), u.value && (u.value = null);
    });
    const o = () => {
      if (!G(a.value)) {
        u.value = "Please enter a valid phone number";
        return;
      }
      if (!s.value) {
        u.value = "Please select your mobile network";
        return;
      }
      l("submit", {
        phone: a.value,
        network: s.value
      });
    }, v = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (m, i) => (y(), h("form", {
      class: "reevit-momo-form",
      onSubmit: X(o, ["prevent"])
    }, [
      d("div", xe, [
        i[1] || (i[1] = d("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        oe(d("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": i[0] || (i[0] = (f) => a.value = f),
          type: "tel",
          class: D(["reevit-input", { "reevit-input--error": u.value && !U(G)(a.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: e.loading,
          autocomplete: "tel"
        }, null, 10, Te), [
          [ae, a.value]
        ])
      ]),
      d("div", $e, [
        i[2] || (i[2] = d("label", { class: "reevit-label" }, "Select Network", -1)),
        d("div", Ne, [
          (y(), h(q, null, Q(v, (f) => d("button", {
            key: f.id,
            type: "button",
            class: D(U(te)("reevit-network-btn", s.value === f.id && "reevit-network-btn--selected")),
            onClick: (k) => s.value = f.id,
            disabled: e.loading
          }, [
            d("div", {
              class: "reevit-network-dot",
              style: ee({ backgroundColor: f.color })
            }, null, 4),
            Z(" " + S(f.name), 1)
          ], 10, Ue)), 64))
        ])
      ]),
      u.value ? (y(), h("p", Le, S(u.value), 1)) : I("", !0),
      d("button", {
        type: "submit",
        class: "reevit-submit-btn",
        disabled: e.loading || !a.value
      }, [
        e.loading ? (y(), h("span", De)) : (y(), h("span", Fe, "Continue"))
      ], 8, Oe),
      i[3] || (i[3] = d("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
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
  redirect({ purchaseInfo: n, config: t }) {
    const l = this.createCheckoutUrl(n, t), a = window.open(l);
    if (!a || a.closed || typeof a.closed > "u")
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
  initIframe({ purchaseInfo: n, callBacks: t, config: l, iframeStyle: a }) {
    var s, u, o;
    this.registerEvents(t);
    const v = document.getElementById("hubtel-checkout-iframe");
    if (!v)
      throw new Error('Container element with id "hubtel-checkout-iframe" not found in the DOM.');
    v.innerHTML = "";
    const m = document.createElement("div");
    m.textContent = "Loading...", v.appendChild(m);
    const i = document.createElement("iframe");
    i.setAttribute("id", "hubtel-iframe-element"), i.src = this.createCheckoutUrl(n, l), i.style.display = "none", i.style.width = (s = a?.width) !== null && s !== void 0 ? s : "100%", i.style.height = (u = a?.height) !== null && u !== void 0 ? u : "100%", i.style.minHeight = a?.minHeight || "400px", i.style.border = (o = a?.border) !== null && o !== void 0 ? o : "none", i.onload = () => {
      var f;
      v.removeChild(m), i.style.display = "block", (f = t.onLoad) === null || f === void 0 || f.call(t);
    }, v.appendChild(i);
  }
  openModal({ purchaseInfo: n, callBacks: t, config: l }) {
    this.injectStyles(), this.createIframe(), this.handleBackButton(), this.registerEvents(t), this.renderWebpageInPopup(this.createCheckoutUrl(n, l), t.onClose, t.onLoad);
  }
  createCheckoutUrl(n, t) {
    const l = Object.assign(Object.assign({}, n), t), a = Object.keys(l).reduce((m, i) => (l[i] !== null && l[i] !== void 0 && (m[i] = l[i]), m), {}), s = Object.keys(a).map((m) => `${m}=${encodeURIComponent(a[m])}`).join("&"), u = this.encodeBase64(s), o = encodeURIComponent(u);
    return `${a?.branding === "disabled" ? `${this.baseUrl}/pay/direct` : `${this.baseUrl}/pay`}?p=${o}`;
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
    const t = document.createElement("span");
    t.classList.add("checkout-loader"), n.appendChild(t), document.body.appendChild(n);
  }
  registerEvents(n) {
    this.messageHandler && window.removeEventListener("message", this.messageHandler, !1);
    const t = (l) => {
      var a, s, u, o, v, m;
      if (l.origin !== this.baseUrl)
        return;
      const { data: i } = l;
      if (i.success === !0)
        (a = n.onPaymentSuccess) === null || a === void 0 || a.call(n, i);
      else if (i.success === !1)
        (s = n.onPaymentFailure) === null || s === void 0 || s.call(n, i);
      else if (i.initialized)
        (u = n.init) === null || u === void 0 || u.call(n, i), (o = n.onInit) === null || o === void 0 || o.call(n, i);
      else if (i.feesChanged)
        (v = n.onFeesChanged) === null || v === void 0 || v.call(n, i.fees);
      else if (i.resize) {
        const f = document.getElementById("hubtel-iframe-element");
        f && (f.style.height = i.height + "px"), (m = n?.onResize) === null || m === void 0 || m.call(n, i);
      }
    };
    this.messageHandler = t, window.addEventListener("message", t, !1);
  }
  /**
   * Removes the message event listener to prevent memory leaks.
   * Call this method when you're done with the checkout to clean up resources.
   */
  destroy() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler, !1), this.messageHandler = null);
  }
  renderWebpageInPopup(n, t, l) {
    const a = document.createElement("div");
    a.classList.add("checkout-modal");
    const s = document.createElement("div");
    s.setAttribute("id", "checkout-close-icon"), s.innerHTML = "&times;", s.classList.add("close-icon"), s.addEventListener("click", () => {
      this.closePopUp(), t?.();
    }), a.appendChild(s);
    const u = document.createElement("iframe");
    u.src = n, history.pushState({ modalOpen: !0 }, ""), u.classList.add("iframe"), a.appendChild(u), document.body.appendChild(a), a.style.opacity = "0", u.addEventListener("load", () => {
      a.style.opacity = "1", l?.();
    });
  }
  closePopUp() {
    const n = document.querySelector(".backdrop"), t = document.querySelector(".checkout-modal");
    n && document.body.removeChild(n), t && document.body.removeChild(t), history.replaceState(null, ""), window.removeEventListener("popstate", this.closePopUp);
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
function F(e, n) {
  const t = J.get(n);
  if (t) return t;
  const l = new Promise((a, s) => {
    if (document.getElementById(n)) {
      a();
      return;
    }
    const u = document.createElement("script");
    u.id = n, u.src = e, u.async = !0, u.onload = () => a(), u.onerror = () => s(new Error(`Failed to load ${n} script`)), document.head.appendChild(u);
  });
  return J.set(n, l), l;
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
async function qe(e) {
  if (await je(), !window.PaystackPop)
    throw new Error("Paystack script not loaded");
  window.PaystackPop.setup({
    key: e.key,
    email: e.email,
    amount: e.amount,
    currency: e.currency,
    ref: e.ref,
    metadata: e.metadata,
    callback: e.onSuccess,
    onClose: e.onClose
  }).openIframe();
}
async function Be(e) {
  const n = new Ke(), t = {
    amount: e.amount,
    purchaseDescription: e.purchaseDescription,
    customerPhoneNumber: e.customerPhone || "",
    clientReference: `hubtel_${Date.now()}`
  }, l = {
    branding: "enabled",
    callbackUrl: e.callbackUrl || (typeof window < "u" ? window.location.href : ""),
    merchantAccount: typeof e.clientId == "string" ? parseInt(e.clientId, 10) : e.clientId,
    basicAuth: ""
  };
  n.openModal({
    purchaseInfo: t,
    config: l,
    callBacks: {
      onPaymentSuccess: (a) => {
        e.onSuccess(a), n.closePopUp();
      },
      onPaymentFailure: () => {
        e.onClose();
      },
      onClose: () => {
        e.onClose();
      }
    }
  });
}
async function Ye(e) {
  if (await ze(), !window.FlutterwaveCheckout)
    throw new Error("Flutterwave script not loaded");
  window.FlutterwaveCheckout({
    public_key: e.public_key,
    tx_ref: e.tx_ref,
    amount: e.amount,
    currency: e.currency,
    customer: e.customer,
    payment_options: e.payment_options,
    customizations: e.customizations,
    callback: e.callback,
    onclose: e.onclose
  });
}
async function We(e) {
  if (await He(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(e);
}
async function ut(e) {
  const t = await (await We(e.publishableKey)).confirmPayment({
    elements: e.elements,
    clientSecret: e.clientSecret,
    redirect: "if_required"
  });
  t.error ? e.onError({ message: t.error.message || "Payment failed" }) : t.paymentIntent && e.onSuccess({
    paymentIntentId: t.paymentIntent.id,
    status: t.paymentIntent.status
  });
}
async function Ge(e) {
  if (await Ve(), !window.MonnifySDK)
    throw new Error("Monnify SDK not loaded");
  window.MonnifySDK.initialize({
    amount: e.amount,
    currency: e.currency,
    reference: e.reference,
    customerName: e.customerName,
    customerEmail: e.customerEmail,
    customerMobileNumber: e.customerPhone,
    apiKey: e.apiKey,
    contractCode: e.contractCode,
    paymentDescription: e.paymentDescription || "Payment",
    isTestMode: e.isTestMode ?? !1,
    metadata: e.metadata,
    onComplete: (n) => {
      n.status === "SUCCESS" ? e.onSuccess({
        transactionReference: n.transactionReference,
        paymentReference: n.paymentReference,
        ...n
      }) : e.onError?.({ message: n.message || "Payment failed" });
    },
    onClose: e.onClose
  });
}
async function Je(e, n) {
  e.onInitiated();
  try {
    const t = await fetch(n, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: e.phoneNumber,
        amount: e.amount,
        reference: e.reference,
        description: e.description
      })
    });
    if (!t.ok) {
      const s = (await t.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return e.onError({ message: s }), { status: "failed", message: s };
    }
    const l = await t.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: l.checkout_request_id || l.transaction_id
    };
  } catch (t) {
    const l = t instanceof Error ? t.message : "Network error";
    return e.onError({ message: l }), { status: "failed", message: l };
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
  setup(e, { emit: n }) {
    const t = e, l = n, {
      status: a,
      paymentIntent: s,
      selectedMethod: u,
      error: o,
      isLoading: v,
      isReady: m,
      initialize: i,
      selectMethod: f,
      handlePspSuccess: k,
      handlePspError: g,
      close: A
    } = be({
      config: {
        publicKey: t.publicKey,
        amount: t.amount,
        currency: t.currency,
        email: t.email,
        phone: t.phone,
        reference: t.reference,
        metadata: t.metadata,
        paymentMethods: t.paymentMethods,
        initialPaymentIntent: t.initialPaymentIntent
      },
      apiBaseUrl: t.apiBaseUrl,
      onSuccess: (c) => l("success", c),
      onError: (c) => l("error", c),
      onClose: () => l("close")
    }), E = $(t.isOpen ?? !1);
    N(() => t.isOpen, (c) => {
      c !== void 0 && (E.value = c);
    });
    const L = () => {
      E.value = !0, !s.value && a.value === "idle" && i();
    };
    N([E, s, u], ([c, r, p]) => {
      c && r && p && p === "card" && M(null);
    });
    const R = () => {
      E.value = !1, A();
    }, K = (c) => {
      f(c);
    }, M = async (c) => {
      if (!s.value) return;
      const r = s.value.recommendedPsp;
      try {
        if (r === "paystack")
          await qe({
            key: t.publicKey,
            email: t.email || "",
            amount: t.amount,
            currency: t.currency,
            ref: s.value.id,
            onSuccess: (p) => k(p),
            onClose: () => {
            }
          });
        else if (r === "hubtel")
          await Be({
            clientId: t.publicKey,
            purchaseDescription: `Payment for ${t.amount} ${t.currency}`,
            amount: t.amount,
            customerPhone: c?.phone || t.phone,
            customerEmail: t.email,
            onSuccess: (p) => k(p),
            onClose: () => {
            }
          });
        else if (r === "flutterwave")
          await Ye({
            public_key: t.publicKey,
            tx_ref: s.value.id,
            amount: t.amount,
            currency: t.currency,
            customer: {
              email: t.email || "",
              phone_number: c?.phone || t.phone
            },
            callback: (p) => k(p),
            onclose: () => {
            }
          });
        else if (r === "monnify")
          await Ge({
            apiKey: s.value.pspPublicKey || t.publicKey,
            contractCode: t.metadata?.contract_code || t.publicKey,
            amount: t.amount,
            currency: t.currency,
            reference: s.value.reference || s.value.id,
            customerName: t.metadata?.customer_name || t.email || "",
            customerEmail: t.email || "",
            customerPhone: c?.phone || t.phone,
            metadata: t.metadata,
            onSuccess: (p) => k(p),
            onClose: () => {
            }
          });
        else if (r === "mpesa") {
          const p = `${t.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${s.value.id}/mpesa`;
          await Je({
            phoneNumber: c?.phone || t.phone || "",
            amount: t.amount,
            reference: s.value.reference || s.value.id,
            description: `Payment ${s.value.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (C) => k(C),
            onError: (C) => g({ code: "MPESA_ERROR", message: C.message })
          }, p);
        } else g(r === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${r}" is not supported in this checkout.`
        });
      } catch (p) {
        g({
          code: "BRIDGE_ERROR",
          message: p instanceof Error ? p.message : "Failed to open payment gateway"
        });
      }
    }, j = b(() => ve(t.theme || {}));
    N(E, (c) => {
      c ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), re(() => {
      document.body.style.overflow = "";
    });
    const w = b(() => a.value), O = b(() => o.value), x = b(() => u.value), T = b(() => v.value), z = b(() => m.value);
    return (c, r) => (y(), h("div", {
      class: "reevit-sdk-container",
      style: ee(j.value)
    }, [
      Y(c.$slots, "default", {
        open: L,
        isLoading: T.value
      }, () => [
        d("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: L,
          disabled: T.value
        }, [
          T.value ? (y(), h("span", Xe)) : Y(c.$slots, "button-text", { key: 1 }, () => [
            r[1] || (r[1] = Z("Pay Now", -1))
          ])
        ], 8, Qe)
      ]),
      (y(), W(se, { to: "body" }, [
        E.value ? (y(), h("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: X(R, ["self"])
        }, [
          d("div", {
            class: D(["reevit-modal-content", { "reevit-modal--dark": t.theme?.darkMode }])
          }, [
            d("button", {
              class: "reevit-modal-close",
              onClick: R,
              "aria-label": "Close"
            }, " × "),
            r[9] || (r[9] = d("div", { class: "reevit-modal-header" }, [
              d("img", {
                src: "https://i.imgur.com/bzUR5Lm.png",
                alt: "Reevit",
                class: "reevit-modal__logo"
              })
            ], -1)),
            d("div", Ze, [
              w.value === "loading" ? (y(), h("div", et, [...r[2] || (r[2] = [
                d("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                d("p", null, "Initializing payment...", -1)
              ])])) : w.value === "failed" && O.value ? (y(), h("div", tt, [
                r[3] || (r[3] = d("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                r[4] || (r[4] = d("h3", null, "Payment Failed", -1)),
                d("p", null, S(O.value.message), 1),
                d("button", {
                  class: "reevit-retry-btn",
                  onClick: r[0] || (r[0] = (p) => U(i)())
                }, "Retry")
              ])) : w.value === "success" ? (y(), h("div", nt, [
                r[5] || (r[5] = d("div", { class: "reevit-success-icon" }, "✅", -1)),
                r[6] || (r[6] = d("h3", null, "Payment Successful", -1)),
                r[7] || (r[7] = d("p", null, "Thank you for your payment.", -1)),
                d("button", {
                  class: "reevit-done-btn",
                  onClick: R
                }, "Done")
              ])) : z.value ? (y(), h(q, { key: 3 }, [
                w.value === "ready" || w.value === "method_selected" || w.value === "processing" ? (y(), W(Me, {
                  key: 0,
                  methods: t.paymentMethods || ["card", "mobile_money"],
                  selected: x.value,
                  amount: t.amount,
                  currency: t.currency,
                  onSelect: K
                }, null, 8, ["methods", "selected", "amount", "currency"])) : I("", !0),
                (w.value === "method_selected" || w.value === "processing") && x.value === "mobile_money" ? (y(), h("div", ot, [
                  ie(Ae, {
                    "initial-phone": t.phone,
                    loading: w.value === "processing",
                    onSubmit: M
                  }, null, 8, ["initial-phone", "loading"])
                ])) : I("", !0),
                (w.value === "method_selected" || w.value === "processing") && x.value === "card" ? (y(), h("div", at, [
                  r[8] || (r[8] = d("p", { class: "reevit-info-text" }, "You will be redirected to our secure payment partner to complete your card payment.", -1)),
                  d("button", {
                    class: "reevit-submit-btn",
                    onClick: M,
                    disabled: w.value === "processing"
                  }, [
                    w.value === "processing" ? (y(), h("span", st)) : (y(), h("span", it, "Proceed to Card Payment"))
                  ], 8, rt)
                ])) : I("", !0)
              ], 64)) : I("", !0)
            ]),
            r[10] || (r[10] = d("div", { class: "reevit-modal-footer" }, [
              d("div", { class: "reevit-trust-badges" }, [
                d("span", null, "PCI DSS Compliant"),
                d("span", null, "•"),
                d("span", null, "SSL Secure")
              ])
            ], -1))
          ], 2)
        ])) : I("", !0)
      ]))
    ], 4));
  }
});
export {
  Ae as MobileMoneyForm,
  Me as PaymentMethodSelector,
  vt as ReevitAPIClient,
  mt as ReevitCheckout,
  ht as cn,
  ut as confirmStripePayment,
  ft as createReevitClient,
  We as createStripeInstance,
  bt as detectCountryFromCurrency,
  wt as detectNetwork,
  Pt as formatAmount,
  kt as formatPhone,
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
