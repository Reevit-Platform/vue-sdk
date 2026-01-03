import { ref as $, watch as N, computed as w, readonly as _, defineComponent as V, createElementBlock as h, openBlock as y, createElementVNode as c, toDisplayString as S, unref as U, Fragment as q, renderList as Q, normalizeClass as A, createCommentVNode as I, withModifiers as X, withDirectives as oe, vModelText as ae, createTextVNode as Z, normalizeStyle as ee, onUnmounted as re, renderSlot as Y, createBlock as W, Teleport as se, createVNode as ie } from "vue";
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
    pspCredentials: e.psp_credentials,
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
  const { config: n, onSuccess: t, onError: i, onClose: a, onStateChange: u, apiBaseUrl: d } = e, o = $(le());
  if (n.initialPaymentIntent) {
    const l = n.initialPaymentIntent;
    o.value = {
      ...o.value,
      status: "ready",
      paymentIntent: l,
      selectedMethod: l.availableMethods?.length === 1 ? l.availableMethods[0] : null
    };
  }
  const v = new ce({
    publicKey: n.publicKey,
    baseUrl: d
  }), m = (l) => {
    o.value = me(o.value, l);
  };
  N(
    () => o.value.status,
    (l) => {
      u?.(l);
    }
  );
  const s = async (l) => {
    m({ type: "INIT_START" });
    try {
      const r = n.reference || de(), p = ue(n.currency), b = l || n.paymentMethods?.[0] || "card", { data: k, error: H } = await v.createPaymentIntent(
        { ...n, reference: r },
        b,
        p
      );
      if (H) {
        m({ type: "INIT_ERROR", payload: H }), i?.(H);
        return;
      }
      if (!k) {
        const B = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        m({ type: "INIT_ERROR", payload: B }), i?.(B);
        return;
      }
      const ne = fe(k, { ...n, reference: r });
      m({ type: "INIT_SUCCESS", payload: ne });
    } catch (r) {
      const p = {
        code: "INIT_FAILED",
        message: r instanceof Error ? r.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: r
      };
      m({ type: "INIT_ERROR", payload: p }), i?.(p);
    }
  }, f = (l) => {
    m({ type: "SELECT_METHOD", payload: l });
  }, C = async (l) => {
    if (!(!o.value.paymentIntent || !o.value.selectedMethod)) {
      m({ type: "PROCESS_START" });
      try {
        let r;
        if (o.value.paymentIntent.clientSecret) {
          const { data: b, error: k } = await v.confirmPaymentIntent(
            o.value.paymentIntent.id,
            o.value.paymentIntent.clientSecret
          );
          if (k) {
            m({ type: "PROCESS_ERROR", payload: k }), i?.(k);
            return;
          }
          r = b;
        } else {
          const { data: b, error: k } = await v.confirmPayment(o.value.paymentIntent.id);
          if (k) {
            m({ type: "PROCESS_ERROR", payload: k }), i?.(k);
            return;
          }
          r = b;
        }
        const p = {
          paymentId: o.value.paymentIntent.id,
          reference: l.reference || o.value.paymentIntent.reference || o.value.paymentIntent.metadata?.reference || "",
          amount: o.value.paymentIntent.amount,
          currency: o.value.paymentIntent.currency,
          paymentMethod: o.value.selectedMethod,
          psp: o.value.paymentIntent.recommendedPsp,
          pspReference: l.pspReference || r?.provider_ref_id || "",
          status: "success",
          metadata: l
        };
        m({ type: "PROCESS_SUCCESS", payload: p }), t?.(p);
      } catch (r) {
        const p = {
          code: "PAYMENT_FAILED",
          message: r instanceof Error ? r.message : "Payment failed",
          recoverable: !0,
          originalError: r
        };
        m({ type: "PROCESS_ERROR", payload: p }), i?.(p);
      }
    }
  }, g = async (l) => {
    await C(l);
  }, F = (l) => {
    m({ type: "PROCESS_ERROR", payload: l }), i?.(l);
  }, E = () => {
    m({ type: "RESET" });
  }, L = async () => {
    if (o.value.paymentIntent && o.value.status !== "success")
      try {
        await v.cancelPaymentIntent(o.value.paymentIntent.id);
      } catch {
      }
    m({ type: "CLOSE" }), a?.();
  }, R = w(() => o.value.status), K = w(() => o.value.paymentIntent), M = w(() => o.value.selectedMethod), j = w(() => o.value.error), P = w(() => o.value.result), O = w(
    () => o.value.status === "loading" || o.value.status === "processing"
  ), x = w(
    () => o.value.status === "ready" || o.value.status === "method_selected" || o.value.status === "processing"
  ), T = w(() => o.value.status === "success"), z = w(() => o.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: _(R),
    paymentIntent: _(K),
    selectedMethod: _(M),
    error: _(j),
    result: _(P),
    // Actions
    initialize: s,
    selectMethod: f,
    processPayment: C,
    handlePspSuccess: g,
    handlePspError: F,
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
    const t = e, i = n, a = w(() => [
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
    ].filter((u) => t.methods.includes(u.id)));
    return (u, d) => (y(), h("div", we, [
      d[0] || (d[0] = c("h3", { class: "reevit-section-title" }, "Select Payment Method", -1)),
      c("p", Pe, " Pay " + S(U(pe)(e.amount, e.currency)), 1),
      c("div", ke, [
        (y(!0), h(q, null, Q(a.value, (o) => (y(), h("button", {
          key: o.id,
          type: "button",
          class: A(U(te)("reevit-method-card", e.selected === o.id && "reevit-method-card--selected")),
          onClick: (v) => i("select", o.id)
        }, [
          c("span", _e, S(o.icon), 1),
          c("div", Ee, [
            c("span", Ie, S(o.name), 1),
            c("span", Se, S(o.description), 1)
          ]),
          c("div", ge, [
            e.selected === o.id ? (y(), h("div", Re)) : I("", !0)
          ])
        ], 10, Ce))), 128))
      ])
    ]));
  }
}), xe = { class: "reevit-form-group" }, Te = ["disabled"], $e = { class: "reevit-network-selector" }, Ne = { class: "reevit-networks-grid" }, Ue = ["onClick", "disabled"], Le = {
  key: 0,
  class: "reevit-error-message"
}, Oe = ["disabled"], Ae = {
  key: 0,
  class: "reevit-spinner"
}, De = { key: 1 }, Fe = /* @__PURE__ */ V({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean }
  },
  emits: ["submit"],
  setup(e, { emit: n }) {
    const t = e, i = n, a = $(t.initialPhone || ""), u = $(null), d = $(null);
    N(a, (m) => {
      const s = ye(m);
      s && (u.value = s), d.value && (d.value = null);
    });
    const o = () => {
      if (!G(a.value)) {
        d.value = "Please enter a valid phone number";
        return;
      }
      if (!u.value) {
        d.value = "Please select your mobile network";
        return;
      }
      i("submit", {
        phone: a.value,
        network: u.value
      });
    }, v = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (m, s) => (y(), h("form", {
      class: "reevit-momo-form",
      onSubmit: X(o, ["prevent"])
    }, [
      c("div", xe, [
        s[1] || (s[1] = c("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        oe(c("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": s[0] || (s[0] = (f) => a.value = f),
          type: "tel",
          class: A(["reevit-input", { "reevit-input--error": d.value && !U(G)(a.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: e.loading,
          autocomplete: "tel"
        }, null, 10, Te), [
          [ae, a.value]
        ])
      ]),
      c("div", $e, [
        s[2] || (s[2] = c("label", { class: "reevit-label" }, "Select Network", -1)),
        c("div", Ne, [
          (y(), h(q, null, Q(v, (f) => c("button", {
            key: f.id,
            type: "button",
            class: A(U(te)("reevit-network-btn", u.value === f.id && "reevit-network-btn--selected")),
            onClick: (C) => u.value = f.id,
            disabled: e.loading
          }, [
            c("div", {
              class: "reevit-network-dot",
              style: ee({ backgroundColor: f.color })
            }, null, 4),
            Z(" " + S(f.name), 1)
          ], 10, Ue)), 64))
        ])
      ]),
      d.value ? (y(), h("p", Le, S(d.value), 1)) : I("", !0),
      c("button", {
        type: "submit",
        class: "reevit-submit-btn",
        disabled: e.loading || !a.value
      }, [
        e.loading ? (y(), h("span", Ae)) : (y(), h("span", De, "Continue"))
      ], 8, Oe),
      s[3] || (s[3] = c("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
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
    const i = this.createCheckoutUrl(n, t), a = window.open(i);
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
  initIframe({ purchaseInfo: n, callBacks: t, config: i, iframeStyle: a }) {
    var u, d, o;
    this.registerEvents(t);
    const v = document.getElementById("hubtel-checkout-iframe");
    if (!v)
      throw new Error('Container element with id "hubtel-checkout-iframe" not found in the DOM.');
    v.innerHTML = "";
    const m = document.createElement("div");
    m.textContent = "Loading...", v.appendChild(m);
    const s = document.createElement("iframe");
    s.setAttribute("id", "hubtel-iframe-element"), s.src = this.createCheckoutUrl(n, i), s.style.display = "none", s.style.width = (u = a?.width) !== null && u !== void 0 ? u : "100%", s.style.height = (d = a?.height) !== null && d !== void 0 ? d : "100%", s.style.minHeight = a?.minHeight || "400px", s.style.border = (o = a?.border) !== null && o !== void 0 ? o : "none", s.onload = () => {
      var f;
      v.removeChild(m), s.style.display = "block", (f = t.onLoad) === null || f === void 0 || f.call(t);
    }, v.appendChild(s);
  }
  openModal({ purchaseInfo: n, callBacks: t, config: i }) {
    this.injectStyles(), this.createIframe(), this.handleBackButton(), this.registerEvents(t), this.renderWebpageInPopup(this.createCheckoutUrl(n, i), t.onClose, t.onLoad);
  }
  createCheckoutUrl(n, t) {
    const i = Object.assign(Object.assign({}, n), t), a = Object.keys(i).reduce((m, s) => (i[s] !== null && i[s] !== void 0 && (m[s] = i[s]), m), {}), u = Object.keys(a).map((m) => `${m}=${encodeURIComponent(a[m])}`).join("&"), d = this.encodeBase64(u), o = encodeURIComponent(d);
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
    const t = (i) => {
      var a, u, d, o, v, m;
      if (i.origin !== this.baseUrl)
        return;
      const { data: s } = i;
      if (s.success === !0)
        (a = n.onPaymentSuccess) === null || a === void 0 || a.call(n, s);
      else if (s.success === !1)
        (u = n.onPaymentFailure) === null || u === void 0 || u.call(n, s);
      else if (s.initialized)
        (d = n.init) === null || d === void 0 || d.call(n, s), (o = n.onInit) === null || o === void 0 || o.call(n, s);
      else if (s.feesChanged)
        (v = n.onFeesChanged) === null || v === void 0 || v.call(n, s.fees);
      else if (s.resize) {
        const f = document.getElementById("hubtel-iframe-element");
        f && (f.style.height = s.height + "px"), (m = n?.onResize) === null || m === void 0 || m.call(n, s);
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
  renderWebpageInPopup(n, t, i) {
    const a = document.createElement("div");
    a.classList.add("checkout-modal");
    const u = document.createElement("div");
    u.setAttribute("id", "checkout-close-icon"), u.innerHTML = "&times;", u.classList.add("close-icon"), u.addEventListener("click", () => {
      this.closePopUp(), t?.();
    }), a.appendChild(u);
    const d = document.createElement("iframe");
    d.src = n, history.pushState({ modalOpen: !0 }, ""), d.classList.add("iframe"), a.appendChild(d), document.body.appendChild(a), a.style.opacity = "0", d.addEventListener("load", () => {
      a.style.opacity = "1", i?.();
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
function D(e, n) {
  const t = J.get(n);
  if (t) return t;
  const i = new Promise((a, u) => {
    if (document.getElementById(n)) {
      a();
      return;
    }
    const d = document.createElement("script");
    d.id = n, d.src = e, d.async = !0, d.onload = () => a(), d.onerror = () => u(new Error(`Failed to load ${n} script`)), document.head.appendChild(d);
  });
  return J.set(n, i), i;
}
function je() {
  return D("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function dt() {
  return Promise.resolve();
}
function ze() {
  return D("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function He() {
  return D("https://js.stripe.com/v3/", "stripe-script");
}
function Ve() {
  return D("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
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
  }, i = {
    branding: "enabled",
    callbackUrl: e.callbackUrl || (typeof window < "u" ? window.location.href : ""),
    merchantAccount: typeof e.clientId == "string" ? parseInt(e.clientId, 10) : e.clientId,
    basicAuth: e.basicAuth || ""
  };
  n.openModal({
    purchaseInfo: t,
    config: i,
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
      const u = (await t.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return e.onError({ message: u }), { status: "failed", message: u };
    }
    const i = await t.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: i.checkout_request_id || i.transaction_id
    };
  } catch (t) {
    const i = t instanceof Error ? t.message : "Network error";
    return e.onError({ message: i }), { status: "failed", message: i };
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
    const t = e, i = n, {
      status: a,
      paymentIntent: u,
      selectedMethod: d,
      error: o,
      isLoading: v,
      isReady: m,
      initialize: s,
      selectMethod: f,
      handlePspSuccess: C,
      handlePspError: g,
      close: F
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
      onSuccess: (l) => i("success", l),
      onError: (l) => i("error", l),
      onClose: () => i("close")
    }), E = $(t.isOpen ?? !1);
    N(() => t.isOpen, (l) => {
      l !== void 0 && (E.value = l);
    });
    const L = () => {
      E.value = !0, !u.value && a.value === "idle" && s();
    };
    N([E, u, d], ([l, r, p]) => {
      l && r && p && p === "card" && M(null);
    });
    const R = () => {
      E.value = !1, F();
    }, K = (l) => {
      f(l);
    }, M = async (l) => {
      const r = u.value;
      if (!r) return;
      const p = r.recommendedPsp;
      try {
        if (p === "paystack")
          await qe({
            key: t.publicKey,
            email: t.email || "",
            amount: t.amount,
            currency: t.currency,
            ref: r.id,
            onSuccess: (b) => C(b),
            onClose: () => {
            }
          });
        else if (p === "hubtel")
          await Be({
            clientId: r.pspCredentials?.merchantAccount || t.publicKey,
            purchaseDescription: `Payment for ${t.amount} ${t.currency}`,
            amount: t.amount,
            customerPhone: l?.phone || t.phone,
            customerEmail: t.email,
            basicAuth: r.pspCredentials?.basicAuth,
            onSuccess: (b) => C(b),
            onClose: () => {
            }
          });
        else if (p === "flutterwave")
          await Ye({
            public_key: t.publicKey,
            tx_ref: r.id,
            amount: t.amount,
            currency: t.currency,
            customer: {
              email: t.email || "",
              phone_number: l?.phone || t.phone
            },
            callback: (b) => C(b),
            onclose: () => {
            }
          });
        else if (p === "monnify")
          await Ge({
            apiKey: r.pspPublicKey || t.publicKey,
            contractCode: t.metadata?.contract_code || t.publicKey,
            amount: t.amount,
            currency: t.currency,
            reference: r.reference || r.id,
            customerName: t.metadata?.customer_name || t.email || "",
            customerEmail: t.email || "",
            customerPhone: l?.phone || t.phone,
            metadata: t.metadata,
            onSuccess: (b) => C(b),
            onClose: () => {
            }
          });
        else if (p === "mpesa") {
          const b = `${t.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${r.id}/mpesa`;
          await Je({
            phoneNumber: l?.phone || t.phone || "",
            amount: t.amount,
            reference: r.reference || r.id,
            description: `Payment ${r.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (k) => C(k),
            onError: (k) => g({ code: "MPESA_ERROR", message: k.message })
          }, b);
        } else g(p === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${p}" is not supported in this checkout.`
        });
      } catch (b) {
        g({
          code: "BRIDGE_ERROR",
          message: b instanceof Error ? b.message : "Failed to open payment gateway"
        });
      }
    }, j = w(() => ve(t.theme || {}));
    N(E, (l) => {
      l ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), re(() => {
      document.body.style.overflow = "";
    });
    const P = w(() => a.value), O = w(() => o.value), x = w(() => d.value), T = w(() => v.value), z = w(() => m.value);
    return (l, r) => (y(), h("div", {
      class: "reevit-sdk-container",
      style: ee(j.value)
    }, [
      Y(l.$slots, "default", {
        open: L,
        isLoading: T.value
      }, () => [
        c("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: L,
          disabled: T.value
        }, [
          T.value ? (y(), h("span", Xe)) : Y(l.$slots, "button-text", { key: 1 }, () => [
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
          c("div", {
            class: A(["reevit-modal-content", { "reevit-modal--dark": t.theme?.darkMode }])
          }, [
            c("button", {
              class: "reevit-modal-close",
              onClick: R,
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
              P.value === "loading" ? (y(), h("div", et, [...r[2] || (r[2] = [
                c("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                c("p", null, "Initializing payment...", -1)
              ])])) : P.value === "failed" && O.value ? (y(), h("div", tt, [
                r[3] || (r[3] = c("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                r[4] || (r[4] = c("h3", null, "Payment Failed", -1)),
                c("p", null, S(O.value.message), 1),
                c("button", {
                  class: "reevit-retry-btn",
                  onClick: r[0] || (r[0] = (p) => U(s)())
                }, "Retry")
              ])) : P.value === "success" ? (y(), h("div", nt, [
                r[5] || (r[5] = c("div", { class: "reevit-success-icon" }, "✅", -1)),
                r[6] || (r[6] = c("h3", null, "Payment Successful", -1)),
                r[7] || (r[7] = c("p", null, "Thank you for your payment.", -1)),
                c("button", {
                  class: "reevit-done-btn",
                  onClick: R
                }, "Done")
              ])) : z.value ? (y(), h(q, { key: 3 }, [
                P.value === "ready" || P.value === "method_selected" || P.value === "processing" ? (y(), W(Me, {
                  key: 0,
                  methods: t.paymentMethods || ["card", "mobile_money"],
                  selected: x.value,
                  amount: t.amount,
                  currency: t.currency,
                  onSelect: K
                }, null, 8, ["methods", "selected", "amount", "currency"])) : I("", !0),
                (P.value === "method_selected" || P.value === "processing") && x.value === "mobile_money" ? (y(), h("div", ot, [
                  ie(Fe, {
                    "initial-phone": t.phone,
                    loading: P.value === "processing",
                    onSubmit: M
                  }, null, 8, ["initial-phone", "loading"])
                ])) : I("", !0),
                (P.value === "method_selected" || P.value === "processing") && x.value === "card" ? (y(), h("div", at, [
                  r[8] || (r[8] = c("p", { class: "reevit-info-text" }, "You will be redirected to our secure payment partner to complete your card payment.", -1)),
                  c("button", {
                    class: "reevit-submit-btn",
                    onClick: M,
                    disabled: P.value === "processing"
                  }, [
                    P.value === "processing" ? (y(), h("span", st)) : (y(), h("span", it, "Proceed to Card Payment"))
                  ], 8, rt)
                ])) : I("", !0)
              ], 64)) : I("", !0)
            ]),
            r[10] || (r[10] = c("div", { class: "reevit-modal-footer" }, [
              c("div", { class: "reevit-trust-badges" }, [
                c("span", null, "PCI DSS Compliant"),
                c("span", null, "•"),
                c("span", null, "SSL Secure")
              ])
            ], -1))
          ], 2)
        ])) : I("", !0)
      ]))
    ], 4));
  }
});
export {
  Fe as MobileMoneyForm,
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
