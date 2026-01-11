import { ref as q, watch as V, computed as b, readonly as F, defineComponent as ne, createElementBlock as v, openBlock as m, normalizeClass as Y, createCommentVNode as A, createElementVNode as c, normalizeStyle as D, Fragment as X, renderList as oe, toDisplayString as $, unref as Z, renderSlot as le, createVNode as ce, withModifiers as me, withDirectives as _e, vModelText as ge, createTextVNode as ve, onUnmounted as ke, createBlock as ie, Teleport as Ce, withCtx as we } from "vue";
import { createInitialState as Pe, ReevitAPIClient as Se, generateReference as Me, detectCountryFromCurrency as ye, reevitReducer as Ie, cn as he, detectNetwork as Ee, validatePhone as de, createReevitClient as xe, createThemeVariables as Re } from "@reevit/core";
import { ReevitAPIClient as no, cn as ro, createReevitClient as so, detectCountryFromCurrency as ao, detectNetwork as io, formatAmount as lo, formatPhone as co, validatePhone as uo } from "@reevit/core";
const $e = "https://api.reevit.io";
function Te(o, e) {
  return {
    code: e?.code || "payment_link_error",
    message: e?.message || "Payment link request failed",
    recoverable: !0,
    details: {
      httpStatus: o.status,
      ...e?.details || {}
    }
  };
}
function Le(o) {
  const e = o.toLowerCase();
  return e.includes("paystack") ? "paystack" : e.includes("hubtel") ? "hubtel" : e.includes("flutterwave") ? "flutterwave" : e.includes("stripe") ? "stripe" : e.includes("monnify") ? "monnify" : e.includes("mpesa") || e.includes("m-pesa") ? "mpesa" : "paystack";
}
function Ne(o) {
  const e = o.toLowerCase().trim();
  return e === "card" ? "card" : e === "mobile_money" || e === "momo" || e === "mobilemoney" ? "mobile_money" : e === "bank" || e === "bank_transfer" || e === "transfer" ? "bank_transfer" : null;
}
function Ue(o) {
  if (!(!o || o.length === 0))
    return o.map((e) => {
      const t = e.methods.map((n) => Ne(n)).filter(Boolean);
      return {
        provider: e.provider,
        name: e.name,
        methods: t,
        countries: e.countries
      };
    }).filter((e) => e.methods.length > 0);
}
function Ae(o) {
  if (!o)
    return {};
  const e = o, t = { ...e }, n = (d) => typeof d == "string" ? d : void 0, i = (d) => typeof d == "boolean" ? d : void 0, r = (d, a) => {
    a !== void 0 && (t[d] = a);
  };
  return r("logoUrl", n(e.logoUrl ?? e.logo_url)), r("companyName", n(e.companyName ?? e.company_name)), r("primaryColor", n(e.primaryColor ?? e.primary_color)), r("primaryForegroundColor", n(e.primaryForegroundColor ?? e.primary_foreground_color)), r("backgroundColor", n(e.backgroundColor ?? e.background_color)), r("surfaceColor", n(e.surfaceColor ?? e.surface_color)), r("textColor", n(e.textColor ?? e.text_color)), r("mutedTextColor", n(e.mutedTextColor ?? e.muted_text_color)), r("borderRadius", n(e.borderRadius ?? e.border_radius)), r("fontFamily", n(e.fontFamily ?? e.font_family)), r("darkMode", i(e.darkMode ?? e.dark_mode)), r("pspSelectorBgColor", n(e.pspSelectorBgColor ?? e.psp_selector_bg_color)), r("pspSelectorTextColor", n(e.pspSelectorTextColor ?? e.psp_selector_text_color)), r("pspSelectorBorderColor", n(e.pspSelectorBorderColor ?? e.psp_selector_border_color)), r("pspSelectorUseBorder", i(e.pspSelectorUseBorder ?? e.psp_selector_use_border)), r("selectedBackgroundColor", n(e.selectedBackgroundColor ?? e.selected_background_color)), r("selectedTextColor", n(e.selectedTextColor ?? e.selected_text_color)), r("selectedDescriptionColor", n(e.selectedDescriptionColor ?? e.selected_description_color)), r("selectedBorderColor", n(e.selectedBorderColor ?? e.selected_border_color)), t;
}
function Oe(o, e) {
  return {
    id: o.id,
    clientSecret: o.client_secret,
    pspPublicKey: o.psp_public_key,
    pspCredentials: o.psp_credentials,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    recommendedPsp: Le(o.provider),
    availableMethods: e.paymentMethods || ["card", "mobile_money"],
    reference: o.reference || e.reference,
    connectionId: o.connection_id,
    provider: o.provider,
    feeAmount: o.fee_amount,
    feeCurrency: o.fee_currency,
    netAmount: o.net_amount,
    metadata: e.metadata,
    availableProviders: Ue(o.available_psps),
    branding: Ae(o.branding)
  };
}
function Fe(o) {
  const { config: e, onSuccess: t, onError: n, onClose: i, onStateChange: r, apiBaseUrl: d } = o, a = q(Pe()), C = q(0);
  if (e.initialPaymentIntent) {
    const f = e.initialPaymentIntent;
    a.value = {
      ...a.value,
      status: "ready",
      paymentIntent: f,
      selectedMethod: f.availableMethods?.length === 1 ? f.availableMethods[0] : null
    };
  }
  const _ = new Se({
    publicKey: e.publicKey,
    baseUrl: d
  }), s = (f) => {
    a.value = Ie(a.value, f);
  };
  V(
    () => a.value.status,
    (f) => {
      r?.(f);
    }
  );
  const y = async (f, g) => {
    const N = ++C.value;
    s({ type: "INIT_START" });
    try {
      const T = e.reference || Me(), x = ye(e.currency), ae = e.paymentMethods && e.paymentMethods.length === 1 ? e.paymentMethods[0] : void 0, L = f ?? ae;
      let j, E;
      if (e.paymentLinkCode) {
        const U = await fetch(
          `${d || $e}/v1/pay/${e.paymentLinkCode}/pay`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            },
            body: JSON.stringify({
              amount: e.amount,
              email: e.email || "",
              name: e.customerName || "",
              phone: e.phone || "",
              method: L,
              country: x,
              provider: g?.preferredProvider || g?.allowedProviders?.[0],
              custom_fields: e.customFields
            })
          }
        ), u = await U.json().catch(() => ({}));
        U.ok ? j = u : E = Te(U, u);
      } else {
        const U = await _.createPaymentIntent(
          { ...e, reference: T },
          L,
          x,
          {
            preferredProviders: g?.preferredProvider ? [g.preferredProvider] : void 0,
            allowedProviders: g?.allowedProviders
          }
        );
        j = U.data, E = U.error;
      }
      if (N !== C.value)
        return;
      if (E) {
        s({ type: "INIT_ERROR", payload: E }), n?.(E);
        return;
      }
      if (!j) {
        const U = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        s({ type: "INIT_ERROR", payload: U }), n?.(U);
        return;
      }
      const H = Oe(j, { ...e, reference: T });
      s({ type: "INIT_SUCCESS", payload: H });
    } catch (T) {
      if (N !== C.value)
        return;
      const x = {
        code: "INIT_FAILED",
        message: T instanceof Error ? T.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: T
      };
      s({ type: "INIT_ERROR", payload: x }), n?.(x);
    }
  }, P = (f) => {
    s({ type: "SELECT_METHOD", payload: f });
  }, p = async (f) => {
    if (!(!a.value.paymentIntent || !a.value.selectedMethod)) {
      s({ type: "PROCESS_START" });
      try {
        let g;
        if (a.value.paymentIntent.clientSecret) {
          const { data: T, error: x } = await _.confirmPaymentIntent(
            a.value.paymentIntent.id,
            a.value.paymentIntent.clientSecret
          );
          if (x) {
            s({ type: "PROCESS_ERROR", payload: x }), n?.(x);
            return;
          }
          g = T;
        } else {
          const { data: T, error: x } = await _.confirmPayment(a.value.paymentIntent.id);
          if (x) {
            s({ type: "PROCESS_ERROR", payload: x }), n?.(x);
            return;
          }
          g = T;
        }
        const N = {
          paymentId: a.value.paymentIntent.id,
          reference: f.reference || a.value.paymentIntent.reference || a.value.paymentIntent.metadata?.reference || "",
          amount: a.value.paymentIntent.amount,
          currency: a.value.paymentIntent.currency,
          paymentMethod: a.value.selectedMethod,
          psp: a.value.paymentIntent.recommendedPsp,
          pspReference: f.pspReference || g?.provider_ref_id || "",
          status: "success",
          metadata: f
        };
        s({ type: "PROCESS_SUCCESS", payload: N }), t?.(N);
      } catch (g) {
        const N = {
          code: "PAYMENT_FAILED",
          message: g instanceof Error ? g.message : "Payment failed",
          recoverable: !0,
          originalError: g
        };
        s({ type: "PROCESS_ERROR", payload: N }), n?.(N);
      }
    }
  }, S = async (f) => {
    await p(f);
  }, h = (f) => {
    s({ type: "PROCESS_ERROR", payload: f }), n?.(f);
  }, O = () => {
    C.value += 1, s({ type: "RESET" });
  }, I = async () => {
    if (a.value.paymentIntent && a.value.status !== "success")
      try {
        await _.cancelPaymentIntent(a.value.paymentIntent.id);
      } catch {
      }
    s({ type: "CLOSE" }), i?.();
  }, B = b(() => a.value.status), Q = b(() => a.value.paymentIntent), J = b(() => a.value.selectedMethod), z = b(() => a.value.error), K = b(() => a.value.result), R = b(
    () => a.value.status === "loading" || a.value.status === "processing"
  ), ee = b(
    () => a.value.status === "ready" || a.value.status === "method_selected" || a.value.status === "processing"
  ), se = b(() => a.value.status === "success"), te = b(() => a.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: F(B),
    paymentIntent: F(Q),
    selectedMethod: F(J),
    error: F(z),
    result: F(K),
    // Actions
    initialize: y,
    selectMethod: P,
    processPayment: p,
    handlePspSuccess: S,
    handlePspError: h,
    reset: O,
    close: I,
    // Computed
    isLoading: F(R),
    isReady: F(ee),
    isComplete: F(se),
    canRetry: F(te)
  };
}
const De = {
  key: 0,
  class: "reevit-method-selector__label"
}, Be = ["disabled", "aria-pressed", "onClick"], ze = { class: "reevit-method-option__icon-wrapper" }, Ke = {
  key: 0,
  class: "reevit-method-option__logos"
}, je = ["src"], He = {
  key: 1,
  class: "reevit-method-option__icon"
}, Ge = { class: "reevit-method-option__content" }, Ve = {
  key: 0,
  class: "reevit-method-option__check"
}, qe = {
  key: 1,
  class: "reevit-method-option__chevron"
}, be = /* @__PURE__ */ ne({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    provider: {},
    layout: {},
    showLabel: { type: Boolean },
    disabled: { type: Boolean },
    country: {},
    selectedTheme: {}
  },
  emits: ["select"],
  setup(o, { emit: e }) {
    const t = o, n = b(() => t.showLabel !== !1), i = e, r = b(() => (t.layout || "list") === "grid"), d = b(() => (t.country || "GH").toUpperCase()), a = {
      card: {
        name: "Card",
        icon: "💳"
      },
      mobile_money: {
        name: "Mobile Money",
        icon: "📱"
      },
      bank_transfer: {
        name: "Bank Transfer",
        icon: "🏦"
      },
      apple_pay: {
        name: "Apple Pay",
        icon: "🍎"
      },
      google_pay: {
        name: "Google Pay",
        icon: "🤖"
      }
    }, C = (p) => {
      const S = d.value;
      return p === "mobile_money" ? {
        GH: "MTN, Vodafone Cash, AirtelTigo Money",
        KE: "M-Pesa, Airtel Money",
        NG: "MTN MoMo, Airtel Money",
        ZA: "Mobile Money"
      }[S] || "Mobile Money" : p === "card" ? "Pay with Visa, Mastercard, or other cards" : p === "bank_transfer" ? "Pay directly from your bank account" : "";
    }, _ = (p) => {
      const S = d.value, h = {
        visa: "https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg",
        mastercard: "https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg",
        apple_pay: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_Pay_logo.svg/256px-Apple_Pay_logo.svg.png",
        google_pay: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo_%282020%29.svg/256px-Google_Pay_Logo_%282020%29.svg.png",
        mtn: "https://cdn.brandfetch.io/idtdXB-ogi/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1667849059567",
        airtel: "https://cdn.brandfetch.io/idvMDbAci6/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1684941044634",
        mpesa: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/2560px-M-PESA_LOGO-01.svg.png",
        telecel: "https://cdn.brandfetch.io/idW-TDK3Zv/w/110/h/88/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1668075554810"
      };
      return p === "card" ? [h.visa, h.mastercard] : p === "apple_pay" ? [h.apple_pay] : p === "google_pay" ? [h.google_pay] : p === "mobile_money" ? S === "GH" ? [h.mtn, h.telecel, h.airtel] : S === "KE" ? [h.mpesa, h.airtel] : S === "NG" ? [h.mtn, h.airtel] : [h.mtn] : [];
    }, s = b(() => {
      if (t.selectedTheme?.backgroundColor)
        return { backgroundColor: t.selectedTheme.backgroundColor };
    }), y = (p) => {
      const S = {
        animationDelay: `${p * 0.05}s`
      };
      return t.selectedTheme?.borderColor && (S.borderBottomColor = t.selectedTheme.borderColor), S;
    }, P = b(() => [
      {
        id: "card",
        name: a.card.name,
        icon: a.card.icon
      },
      {
        id: "mobile_money",
        name: a.mobile_money.name,
        icon: a.mobile_money.icon
      },
      {
        id: "bank_transfer",
        name: a.bank_transfer.name,
        icon: a.bank_transfer.icon
      },
      {
        id: "apple_pay",
        name: a.apple_pay.name,
        icon: a.apple_pay.icon
      },
      {
        id: "google_pay",
        name: a.google_pay.name,
        icon: a.google_pay.icon
      }
    ].filter((p) => t.methods.includes(p.id)).map((p) => ({
      ...p,
      description: C(p.id),
      logos: _(p.id)
    })));
    return (p, S) => (m(), v("div", {
      class: Y(["reevit-method-selector", { "reevit-method-selector--grid": r.value }])
    }, [
      n.value ? (m(), v("div", De, "Select payment method")) : A("", !0),
      c("div", {
        class: Y(["reevit-method-selector__options", r.value ? "reevit-method-selector__options--grid" : "reevit-method-selector__options--list"]),
        style: D(s.value)
      }, [
        (m(!0), v(X, null, oe(P.value, (h, O) => (m(), v("button", {
          key: h.id,
          type: "button",
          class: Y(["reevit-method-option", [
            r.value ? "reevit-method-option--grid" : "reevit-method-option--list",
            { "reevit-method-option--selected": o.selected === h.id },
            t.disabled && "reevit-method-option--disabled"
          ]]),
          style: D(y(O)),
          disabled: t.disabled,
          "aria-pressed": o.selected === h.id,
          onClick: (I) => i("select", h.id)
        }, [
          c("span", ze, [
            h.logos.length ? (m(), v("span", Ke, [
              (m(!0), v(X, null, oe(h.logos.slice(0, 3), (I, B) => (m(), v("img", {
                key: `${h.id}-logo-${B}`,
                src: I,
                alt: "",
                class: "reevit-method-option__logo-img",
                loading: "lazy"
              }, null, 8, je))), 128))
            ])) : (m(), v("span", He, $(h.icon), 1))
          ]),
          c("div", Ge, [
            c("span", {
              class: "reevit-method-option__label",
              style: D(t.selectedTheme?.textColor ? { color: t.selectedTheme.textColor } : void 0)
            }, $(h.name), 5),
            r.value ? A("", !0) : (m(), v("span", {
              key: 0,
              class: "reevit-method-option__description",
              style: D(t.selectedTheme?.descriptionColor ? { color: t.selectedTheme.descriptionColor } : void 0)
            }, $(h.description), 5))
          ]),
          r.value ? A("", !0) : (m(), v(X, { key: 0 }, [
            o.selected === h.id ? (m(), v("span", Ve, [...S[0] || (S[0] = [
              c("svg", {
                width: "20",
                height: "20",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "3",
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
              }, [
                c("polyline", { points: "20 6 9 17 4 12" })
              ], -1)
            ])])) : (m(), v("span", qe, [...S[1] || (S[1] = [
              c("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2.5",
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
              }, [
                c("polyline", { points: "9 18 15 12 9 6" })
              ], -1)
            ])]))
          ], 64))
        ], 14, Be))), 128))
      ], 6)
    ], 2));
  }
}), Ye = { class: "reevit-psp-selector" }, Xe = { class: "reevit-psp-selector__options" }, We = ["disabled", "aria-expanded", "onClick"], Je = {
  class: "reevit-psp-option__logo",
  "aria-hidden": "true"
}, Ze = ["src"], Qe = {
  key: 1,
  class: "reevit-psp-option__logo-fallback"
}, et = { class: "reevit-psp-option__content" }, tt = { class: "reevit-psp-option__name" }, ot = { class: "reevit-psp-option__methods" }, nt = { class: "reevit-psp-methods" }, rt = /* @__PURE__ */ ne({
  __name: "ProviderSelector",
  props: {
    providers: {},
    selectedProvider: {},
    disabled: { type: Boolean },
    theme: {},
    selectedMethod: {},
    country: {}
  },
  emits: ["select", "methodSelect"],
  setup(o, { emit: e }) {
    const t = o, n = e, i = {
      paystack: "https://reevit.io/images/providers/paystack.png",
      stripe: "https://reevit.io/images/providers/stripe.png",
      flutterwave: "https://reevit.io/images/providers/flutterwave.png",
      hubtel: "https://reevit.io/images/providers/hubtel.png",
      monnify: "https://reevit.io/images/providers/monnify.png",
      mpesa: "https://reevit.io/images/providers/mpesa.png"
    }, r = {
      card: "Card",
      mobile_money: "Mobile Money",
      bank_transfer: "Bank Transfer"
    }, d = (y) => y.length ? y.map((P) => r[P]).join(", ") : "Payment methods", a = (y, P) => y.toLowerCase().includes("hubtel") ? P.filter((p) => p === "card" || p === "mobile_money") : P, C = b(() => {
      if (t.theme)
        return {
          backgroundColor: t.theme.selectedBackgroundColor,
          textColor: t.theme.selectedTextColor,
          descriptionColor: t.theme.selectedDescriptionColor,
          borderColor: t.theme.selectedBorderColor
        };
    }), _ = b(() => {
      if (t.theme?.selectedBorderColor)
        return { borderTop: `1px solid ${t.theme.selectedBorderColor}` };
    }), s = (y) => y.countries?.[0] || t.country || "GH";
    return (y, P) => (m(), v("div", Ye, [
      P[1] || (P[1] = c("div", { class: "reevit-psp-selector__label" }, "Select payment provider", -1)),
      c("div", Xe, [
        (m(!0), v(X, null, oe(o.providers, (p) => (m(), v("div", {
          key: p.provider,
          class: "reevit-psp-accordion"
        }, [
          c("button", {
            type: "button",
            class: Y(
              Z(he)(
                "reevit-psp-option",
                o.selectedProvider === p.provider && "reevit-psp-option--selected",
                o.disabled && "reevit-psp-option--disabled"
              )
            ),
            disabled: o.disabled,
            "aria-expanded": o.selectedProvider === p.provider,
            onClick: (S) => n("select", p.provider)
          }, [
            c("span", Je, [
              i[p.provider] ? (m(), v("img", {
                key: 0,
                src: i[p.provider],
                alt: "",
                class: "reevit-psp-option__logo-img",
                loading: "lazy"
              }, null, 8, Ze)) : (m(), v("span", Qe, $(p.name.slice(0, 1).toUpperCase()), 1))
            ]),
            c("div", et, [
              c("span", tt, "Pay with " + $(p.name), 1),
              c("span", ot, $(d(a(p.provider, p.methods))), 1)
            ])
          ], 10, We),
          o.selectedProvider === p.provider ? (m(), v("div", {
            key: 0,
            class: "reevit-psp-accordion__content reevit-animate-fade-in",
            style: D(_.value)
          }, [
            c("div", nt, [
              ce(be, {
                methods: a(p.provider, p.methods),
                selected: o.selectedMethod || null,
                provider: p.provider,
                "show-label": !1,
                layout: "list",
                disabled: o.disabled,
                country: s(p),
                "selected-theme": C.value,
                onSelect: P[0] || (P[0] = (S) => n("methodSelect", S))
              }, null, 8, ["methods", "selected", "provider", "disabled", "country", "selected-theme"])
            ]),
            le(y.$slots, "method-content")
          ], 4)) : A("", !0)
        ]))), 128))
      ])
    ]));
  }
}), st = { class: "reevit-form-group" }, at = ["disabled"], it = { class: "reevit-network-selector" }, lt = { class: "reevit-networks-grid" }, ct = ["onClick", "disabled"], dt = {
  key: 0,
  class: "reevit-error-message"
}, ut = { class: "reevit-momo-form__actions" }, pt = ["disabled"], mt = ["disabled"], vt = {
  key: 0,
  class: "reevit-spinner"
}, yt = { key: 1 }, ue = /* @__PURE__ */ ne({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean },
    hideCancel: { type: Boolean }
  },
  emits: ["submit", "cancel"],
  setup(o, { emit: e }) {
    const t = o, n = e, i = q(t.initialPhone || ""), r = q(null), d = q(null);
    V(i, (_) => {
      const s = Ee(_);
      s && (r.value = s), d.value && (d.value = null);
    });
    const a = () => {
      if (!de(i.value)) {
        d.value = "Please enter a valid phone number";
        return;
      }
      if (!r.value) {
        d.value = "Please select your mobile network";
        return;
      }
      n("submit", {
        phone: i.value,
        network: r.value
      });
    }, C = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (_, s) => (m(), v("form", {
      class: "reevit-momo-form",
      onSubmit: me(a, ["prevent"])
    }, [
      c("div", st, [
        s[2] || (s[2] = c("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        _e(c("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": s[0] || (s[0] = (y) => i.value = y),
          type: "tel",
          class: Y(["reevit-input", { "reevit-input--error": d.value && !Z(de)(i.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: o.loading,
          autocomplete: "tel"
        }, null, 10, at), [
          [ge, i.value]
        ])
      ]),
      c("div", it, [
        s[3] || (s[3] = c("label", { class: "reevit-label" }, "Select Network", -1)),
        c("div", lt, [
          (m(), v(X, null, oe(C, (y) => c("button", {
            key: y.id,
            type: "button",
            class: Y(Z(he)("reevit-network-btn", r.value === y.id && "reevit-network-btn--selected")),
            onClick: (P) => r.value = y.id,
            disabled: o.loading
          }, [
            c("div", {
              class: "reevit-network-dot",
              style: D({ backgroundColor: y.color })
            }, null, 4),
            ve(" " + $(y.name), 1)
          ], 10, ct)), 64))
        ])
      ]),
      d.value ? (m(), v("p", dt, $(d.value), 1)) : A("", !0),
      c("div", ut, [
        o.hideCancel ? A("", !0) : (m(), v("button", {
          key: 0,
          type: "button",
          class: "reevit-btn reevit-btn--secondary",
          onClick: s[1] || (s[1] = (y) => n("cancel")),
          disabled: o.loading
        }, " Back ", 8, pt)),
        c("button", {
          type: "submit",
          class: "reevit-btn reevit-btn--primary",
          disabled: o.loading || !i.value
        }, [
          o.loading ? (m(), v("span", vt)) : (m(), v("span", yt, "Continue"))
        ], 8, mt)
      ]),
      s[4] || (s[4] = c("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
    ], 32));
  }
});
class ht {
  constructor(e) {
    this.baseUrl = "https://unified-pay.hubtel.com", this.messageHandler = null, this.stylesInjected = !1, e && (this.baseUrl = e);
  }
  /**
  * Redirects the user to the checkout page with the provided purchase information and configuration.
  * @param purchaseInfo - The purchase information.
  * @param config - The configuration.
  * @throws {Error} If the popup is blocked by the browser.
  */
  redirect({ purchaseInfo: e, config: t }) {
    const n = this.createCheckoutUrl(e, t), i = window.open(n);
    if (!i || i.closed || typeof i.closed > "u")
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
  initIframe({ purchaseInfo: e, callBacks: t, config: n, iframeStyle: i }) {
    var r, d, a;
    this.registerEvents(t);
    const C = document.getElementById("hubtel-checkout-iframe");
    if (!C)
      throw new Error('Container element with id "hubtel-checkout-iframe" not found in the DOM.');
    C.innerHTML = "";
    const _ = document.createElement("div");
    _.textContent = "Loading...", C.appendChild(_);
    const s = document.createElement("iframe");
    s.setAttribute("id", "hubtel-iframe-element"), s.src = this.createCheckoutUrl(e, n), s.style.display = "none", s.style.width = (r = i?.width) !== null && r !== void 0 ? r : "100%", s.style.height = (d = i?.height) !== null && d !== void 0 ? d : "100%", s.style.minHeight = i?.minHeight || "400px", s.style.border = (a = i?.border) !== null && a !== void 0 ? a : "none", s.onload = () => {
      var y;
      C.removeChild(_), s.style.display = "block", (y = t.onLoad) === null || y === void 0 || y.call(t);
    }, C.appendChild(s);
  }
  openModal({ purchaseInfo: e, callBacks: t, config: n }) {
    this.injectStyles(), this.createIframe(), this.handleBackButton(), this.registerEvents(t), this.renderWebpageInPopup(this.createCheckoutUrl(e, n), t.onClose, t.onLoad);
  }
  createCheckoutUrl(e, t) {
    const n = Object.assign(Object.assign({}, e), t), i = Object.keys(n).reduce((_, s) => (n[s] !== null && n[s] !== void 0 && (_[s] = n[s]), _), {}), r = Object.keys(i).map((_) => `${_}=${encodeURIComponent(i[_])}`).join("&"), d = this.encodeBase64(r), a = encodeURIComponent(d);
    return `${i?.branding === "disabled" ? `${this.baseUrl}/pay/direct` : `${this.baseUrl}/pay`}?p=${a}`;
  }
  encodeBase64(e) {
    return btoa(unescape(encodeURIComponent(e)));
  }
  handleBackButton() {
    window.addEventListener("popstate", () => {
      this.closePopUp();
    });
  }
  createIframe() {
    const e = document.createElement("div");
    e.setAttribute("id", "backdrop"), e.classList.add("backdrop");
    const t = document.createElement("span");
    t.classList.add("checkout-loader"), e.appendChild(t), document.body.appendChild(e);
  }
  registerEvents(e) {
    this.messageHandler && window.removeEventListener("message", this.messageHandler, !1);
    const t = (n) => {
      var i, r, d, a, C, _;
      if (n.origin !== this.baseUrl)
        return;
      const { data: s } = n;
      if (s.success === !0)
        (i = e.onPaymentSuccess) === null || i === void 0 || i.call(e, s);
      else if (s.success === !1)
        (r = e.onPaymentFailure) === null || r === void 0 || r.call(e, s);
      else if (s.initialized)
        (d = e.init) === null || d === void 0 || d.call(e, s), (a = e.onInit) === null || a === void 0 || a.call(e, s);
      else if (s.feesChanged)
        (C = e.onFeesChanged) === null || C === void 0 || C.call(e, s.fees);
      else if (s.resize) {
        const y = document.getElementById("hubtel-iframe-element");
        y && (y.style.height = s.height + "px"), (_ = e?.onResize) === null || _ === void 0 || _.call(e, s);
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
  renderWebpageInPopup(e, t, n) {
    const i = document.createElement("div");
    i.classList.add("checkout-modal");
    const r = document.createElement("div");
    r.setAttribute("id", "checkout-close-icon"), r.innerHTML = "&times;", r.classList.add("close-icon"), r.addEventListener("click", () => {
      this.closePopUp(), t?.();
    }), i.appendChild(r);
    const d = document.createElement("iframe");
    d.src = e, history.pushState({ modalOpen: !0 }, ""), d.classList.add("iframe"), i.appendChild(d), document.body.appendChild(i), i.style.opacity = "0", d.addEventListener("load", () => {
      i.style.opacity = "1", n?.();
    });
  }
  closePopUp() {
    const e = document.querySelector(".backdrop"), t = document.querySelector(".checkout-modal");
    e && document.body.removeChild(e), t && document.body.removeChild(t), history.replaceState(null, ""), window.removeEventListener("popstate", this.closePopUp);
  }
  injectStyles() {
    if (this.stylesInjected)
      return;
    const e = document.createElement("style");
    e.type = "text/css", e.setAttribute("data-hubtel-checkout", "true"), e.innerHTML = `
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
    `, document.head.appendChild(e), this.stylesInjected = !0;
  }
}
const pe = /* @__PURE__ */ new Map();
function re(o, e) {
  const t = pe.get(e);
  if (t) return t;
  const n = new Promise((i, r) => {
    if (document.getElementById(e)) {
      i();
      return;
    }
    const d = document.createElement("script");
    d.id = e, d.src = o, d.async = !0, d.onload = () => i(), d.onerror = () => r(new Error(`Failed to load ${e} script`)), document.head.appendChild(d);
  });
  return pe.set(e, n), n;
}
function bt() {
  return re("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function Zt() {
  return Promise.resolve();
}
function ft() {
  return re("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function _t() {
  return re("https://js.stripe.com/v3/", "stripe-script");
}
function gt() {
  return re("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
}
async function kt(o) {
  if (await bt(), !window.PaystackPop)
    throw new Error("Paystack script not loaded");
  window.PaystackPop.setup({
    key: o.key,
    email: o.email,
    amount: o.amount,
    currency: o.currency,
    ref: o.ref,
    metadata: o.metadata,
    callback: o.onSuccess,
    onClose: o.onClose
  }).openIframe();
}
async function Ct(o) {
  const e = new ht(), t = o.preferredMethod === "mobile_money" ? "momo" : o.preferredMethod === "card" ? "card" : void 0, n = {
    amount: o.amount,
    purchaseDescription: o.purchaseDescription,
    customerPhoneNumber: o.customerPhone || "",
    clientReference: `hubtel_${Date.now()}`,
    ...t ? { paymentMethod: t } : {}
  }, i = o.hubtelSessionToken || o.basicAuth || "", r = {
    branding: "enabled",
    callbackUrl: o.callbackUrl || (typeof window < "u" ? window.location.href : ""),
    merchantAccount: typeof o.clientId == "string" ? parseInt(o.clientId, 10) : o.clientId,
    basicAuth: i,
    ...t ? { paymentMethod: t } : {}
  };
  e.openModal({
    purchaseInfo: n,
    config: r,
    callBacks: {
      onPaymentSuccess: (d) => {
        o.onSuccess(d), e.closePopUp();
      },
      onPaymentFailure: () => {
        o.onClose();
      },
      onClose: () => {
        o.onClose();
      }
    }
  });
}
async function wt(o) {
  if (await ft(), !window.FlutterwaveCheckout)
    throw new Error("Flutterwave script not loaded");
  window.FlutterwaveCheckout({
    public_key: o.public_key,
    tx_ref: o.tx_ref,
    amount: o.amount,
    currency: o.currency,
    customer: o.customer,
    payment_options: o.payment_options,
    customizations: o.customizations,
    callback: o.callback,
    onclose: o.onclose
  });
}
async function Pt(o) {
  if (await _t(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(o);
}
async function Qt(o) {
  const t = await (await Pt(o.publishableKey)).confirmPayment({
    elements: o.elements,
    clientSecret: o.clientSecret,
    redirect: "if_required"
  });
  t.error ? o.onError({ message: t.error.message || "Payment failed" }) : t.paymentIntent && o.onSuccess({
    paymentIntentId: t.paymentIntent.id,
    status: t.paymentIntent.status
  });
}
async function St(o) {
  if (await gt(), !window.MonnifySDK)
    throw new Error("Monnify SDK not loaded");
  window.MonnifySDK.initialize({
    amount: o.amount,
    currency: o.currency,
    reference: o.reference,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerMobileNumber: o.customerPhone,
    apiKey: o.apiKey,
    contractCode: o.contractCode,
    paymentDescription: o.paymentDescription || "Payment",
    isTestMode: o.isTestMode ?? !1,
    metadata: o.metadata,
    onComplete: (e) => {
      e.status === "SUCCESS" ? o.onSuccess({
        transactionReference: e.transactionReference,
        paymentReference: e.paymentReference,
        ...e
      }) : o.onError?.({ message: e.message || "Payment failed" });
    },
    onClose: o.onClose
  });
}
async function Mt(o, e) {
  o.onInitiated();
  try {
    const t = await fetch(e, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: o.phoneNumber,
        amount: o.amount,
        reference: o.reference,
        description: o.description
      })
    });
    if (!t.ok) {
      const r = (await t.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return o.onError({ message: r }), { status: "failed", message: r };
    }
    const n = await t.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: n.checkout_request_id || n.transaction_id
    };
  } catch (t) {
    const n = t instanceof Error ? t.message : "Network error";
    return o.onError({ message: n }), { status: "failed", message: n };
  }
}
const It = ["disabled"], Et = {
  key: 0,
  class: "reevit-spinner"
}, xt = { class: "reevit-modal-header" }, Rt = { class: "reevit-modal__branding" }, $t = ["src", "alt"], Tt = {
  key: 0,
  class: "reevit-modal__brand-name"
}, Lt = { class: "reevit-modal-body" }, Nt = {
  key: 0,
  class: "reevit-loading-state"
}, Ut = {
  key: 1,
  class: "reevit-error-state"
}, At = {
  key: 2,
  class: "reevit-success-state"
}, Ot = {
  key: 3,
  class: "reevit-method-step reevit-animate-slide-up"
}, Ft = {
  key: 0,
  class: "reevit-inline-action reevit-animate-fade-in"
}, Dt = ["disabled"], Bt = {
  key: 1,
  class: "reevit-inline-action reevit-animate-fade-in"
}, zt = { class: "reevit-inline-action__hint" }, Kt = ["disabled"], jt = {
  key: 0,
  class: "reevit-method-step__actions reevit-animate-slide-up"
}, Ht = { key: 0 }, Gt = {
  key: 1,
  class: "reevit-card-info reevit-animate-fade-in"
}, Vt = { class: "reevit-info-text" }, qt = ["disabled"], Yt = {
  key: 0,
  class: "reevit-spinner"
}, Xt = { key: 1 }, eo = /* @__PURE__ */ ne({
  __name: "ReevitCheckout",
  props: {
    publicKey: {},
    amount: {},
    currency: {},
    email: {},
    phone: {},
    customerName: {},
    reference: {},
    metadata: {},
    customFields: {},
    paymentLinkCode: {},
    paymentMethods: {},
    theme: {},
    isOpen: { type: Boolean },
    apiBaseUrl: {},
    initialPaymentIntent: {}
  },
  emits: ["success", "error", "close"],
  setup(o, { emit: e }) {
    const t = o, n = e, {
      status: i,
      paymentIntent: r,
      selectedMethod: d,
      error: a,
      isLoading: C,
      isReady: _,
      initialize: s,
      selectMethod: y,
      handlePspSuccess: P,
      handlePspError: p,
      close: S,
      reset: h
    } = Fe({
      config: {
        publicKey: t.publicKey,
        amount: t.amount,
        currency: t.currency,
        email: t.email,
        phone: t.phone,
        customerName: t.customerName,
        reference: t.reference,
        metadata: t.metadata,
        customFields: t.customFields,
        paymentLinkCode: t.paymentLinkCode,
        paymentMethods: t.paymentMethods,
        initialPaymentIntent: t.initialPaymentIntent
      },
      apiBaseUrl: t.apiBaseUrl,
      onSuccess: (u) => n("success", u),
      onError: (u) => n("error", u),
      onClose: () => n("close")
    }), O = q(t.isOpen ?? !1), I = q(null), B = {
      hubtel: "Hubtel",
      paystack: "Paystack",
      flutterwave: "Flutterwave",
      monnify: "Monnify",
      mpesa: "M-Pesa",
      stripe: "Stripe"
    };
    V(() => t.isOpen, (u) => {
      u !== void 0 && (O.value = u);
    });
    const Q = () => {
      O.value = !0, I.value = null, !r.value && i.value === "idle" && s();
    };
    V([O, r, d], ([u, l, w]) => {
      if (u && l && w) {
        const k = (I.value || l.recommendedPsp || "paystack").toLowerCase().includes("mpesa");
        (w === "card" || w === "mobile_money" && (!k || t.phone)) && f(null);
      }
    });
    const J = () => {
      O.value = !1, S(), I.value = null;
    }, z = b(
      () => t.paymentMethods?.length ? t.paymentMethods : ["card", "mobile_money"]
    ), K = b(() => {
      const u = r.value;
      if (!u) return [];
      const l = new Set(z.value), w = (u.availableProviders || []).map((k) => {
        const G = k.provider.toLowerCase().includes("hubtel") ? k.methods.filter((W) => W === "card" || W === "mobile_money") : k.methods;
        return {
          ...k,
          methods: G.filter((W) => l.has(W))
        };
      }).filter((k) => k.methods.length > 0);
      if (w.length > 0)
        return w;
      const M = u.recommendedPsp.toLowerCase().includes("hubtel") ? z.value.filter((k) => k === "card" || k === "mobile_money") : z.value;
      return [
        {
          provider: u.recommendedPsp,
          name: B[u.recommendedPsp] || u.recommendedPsp,
          methods: M
        }
      ];
    }), R = b(() => {
      const u = r.value;
      return I.value || u?.recommendedPsp || "paystack";
    }), ee = b(() => {
      const u = K.value.find(
        (l) => l.provider === R.value
      );
      return u?.methods.length ? u.methods : z.value;
    });
    V(
      () => K.value,
      (u) => {
        u.length && (I.value && u.some((l) => l.provider === I.value) || (u.length === 1 ? I.value = u[0].provider : I.value = null));
      },
      { immediate: !0 }
    ), V([ee, d], ([u, l]) => {
      !l || u.length === 0 || u.includes(l) || y(u[0]);
    });
    const se = (u) => {
      if (u === I.value) {
        I.value = null, h();
        return;
      }
      const l = K.value.find((k) => k.provider === u), w = l?.methods.length ? l.methods : z.value, M = d.value && w.includes(d.value) ? d.value : w[0];
      I.value = u, h(), s(M, { preferredProvider: u, allowedProviders: [u] });
    }, te = (u) => {
      y(u);
    }, f = async (u) => {
      const l = r.value;
      if (!l) return;
      const w = R.value;
      try {
        if (w === "paystack")
          await kt({
            key: l.pspPublicKey || t.publicKey || "",
            email: t.email || "",
            amount: t.amount,
            currency: t.currency,
            ref: l.id,
            onSuccess: (M) => P(M),
            onClose: () => {
            }
          });
        else if (w === "hubtel") {
          const M = xe({ publicKey: t.publicKey, baseUrl: t.apiBaseUrl }), { data: k, error: G } = await M.createHubtelSession(
            l.id,
            l.clientSecret
          );
          if (G || !k?.basicAuth) {
            p({
              code: G?.code || "hubtel_session_error",
              message: G?.message || "Failed to create Hubtel session"
            });
            return;
          }
          const W = E.value === "card" || E.value === "mobile_money" ? E.value : void 0;
          await Ct({
            clientId: k.merchantAccount || l.pspCredentials?.merchantAccount || t.publicKey || "",
            purchaseDescription: `Payment for ${t.amount} ${t.currency}`,
            amount: t.amount,
            customerPhone: u?.phone || t.phone,
            customerEmail: t.email,
            basicAuth: k.basicAuth,
            preferredMethod: W,
            onSuccess: (fe) => P(fe),
            onClose: () => {
            }
          });
        } else if (w === "flutterwave")
          await wt({
            public_key: l.pspPublicKey || t.publicKey || "",
            tx_ref: l.id,
            amount: t.amount,
            currency: t.currency,
            customer: {
              email: t.email || "",
              phone_number: u?.phone || t.phone
            },
            callback: (M) => P(M),
            onclose: () => {
            }
          });
        else if (w === "monnify") {
          const M = l.pspPublicKey || t.publicKey || "", k = t.metadata?.contract_code || t.publicKey || "";
          if (!M || !k) {
            p({
              code: "MONNIFY_CONFIG_MISSING",
              message: "Monnify configuration is missing. Please check your API key and contract code."
            });
            return;
          }
          await St({
            apiKey: M,
            contractCode: k,
            amount: t.amount,
            currency: t.currency,
            reference: l.reference || l.id,
            customerName: t.metadata?.customer_name || t.email || "",
            customerEmail: t.email || "",
            customerPhone: u?.phone || t.phone,
            metadata: t.metadata,
            onSuccess: (G) => P(G),
            onClose: () => {
            }
          });
        } else if (w === "mpesa") {
          const M = `${t.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${l.id}/mpesa`;
          await Mt({
            phoneNumber: u?.phone || t.phone || "",
            amount: t.amount,
            reference: l.reference || l.id,
            description: `Payment ${l.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (k) => P(k),
            onError: (k) => p({ code: "MPESA_ERROR", message: k.message })
          }, M);
        } else p(w === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${w}" is not supported in this checkout.`
        });
      } catch (M) {
        p({
          code: "BRIDGE_ERROR",
          message: M instanceof Error ? M.message : "Failed to open payment gateway"
        });
      }
    }, g = b(() => ({
      ...r.value?.branding || {},
      ...t.theme || {}
    })), N = b(() => Re(g.value)), T = b(() => g.value?.darkMode), x = b(() => ye(t.currency)), ae = b(() => ({
      backgroundColor: g.value?.selectedBackgroundColor,
      textColor: g.value?.selectedTextColor,
      descriptionColor: g.value?.selectedDescriptionColor,
      borderColor: g.value?.selectedBorderColor
    }));
    V(O, (u) => {
      u ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), ke(() => {
      document.body.style.overflow = "";
    });
    const L = b(() => i.value), j = b(() => a.value), E = b(() => d.value), H = b(() => C.value), U = b(() => _.value);
    return (u, l) => (m(), v("div", {
      class: "reevit-sdk-container",
      style: D(N.value)
    }, [
      le(u.$slots, "default", {
        open: Q,
        isLoading: H.value
      }, () => [
        c("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: Q,
          disabled: H.value
        }, [
          H.value ? (m(), v("span", Et)) : le(u.$slots, "button-text", { key: 1 }, () => [
            l[5] || (l[5] = ve("Pay Now", -1))
          ])
        ], 8, It)
      ]),
      (m(), ie(Ce, { to: "body" }, [
        O.value ? (m(), v("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: me(J, ["self"])
        }, [
          c("div", {
            class: Y(["reevit-modal-content", { "reevit-modal--dark": T.value }]),
            style: D(N.value)
          }, [
            c("button", {
              class: "reevit-modal-close",
              onClick: J,
              "aria-label": "Close"
            }, " × "),
            c("div", xt, [
              c("div", Rt, [
                c("img", {
                  src: g.value.logoUrl || "https://i.imgur.com/bzUR5Lm.png",
                  alt: g.value.companyName || "Reevit",
                  class: "reevit-modal__logo"
                }, null, 8, $t),
                g.value.companyName ? (m(), v("span", Tt, $(g.value.companyName), 1)) : A("", !0)
              ])
            ]),
            c("div", Lt, [
              L.value === "loading" ? (m(), v("div", Nt, [...l[6] || (l[6] = [
                c("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                c("p", null, "Initializing payment...", -1)
              ])])) : L.value === "failed" && j.value ? (m(), v("div", Ut, [
                l[7] || (l[7] = c("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                l[8] || (l[8] = c("h3", null, "Payment Failed", -1)),
                c("p", null, $(j.value.message), 1),
                c("button", {
                  class: "reevit-retry-btn",
                  onClick: l[0] || (l[0] = (w) => Z(s)())
                }, "Retry")
              ])) : L.value === "success" ? (m(), v("div", At, [
                l[9] || (l[9] = c("div", { class: "reevit-success-icon" }, "✅", -1)),
                l[10] || (l[10] = c("h3", null, "Payment Successful", -1)),
                l[11] || (l[11] = c("p", null, "Thank you for your payment.", -1)),
                c("button", {
                  class: "reevit-done-btn",
                  onClick: J
                }, "Done")
              ])) : U.value ? (m(), v("div", Ot, [
                K.value.length > 1 ? (m(), ie(rt, {
                  key: 0,
                  providers: K.value,
                  "selected-provider": I.value,
                  disabled: H.value,
                  theme: g.value,
                  "selected-method": E.value,
                  country: x.value,
                  onSelect: se,
                  onMethodSelect: te
                }, {
                  "method-content": we(() => [
                    E.value === "card" ? (m(), v("div", Ft, [
                      l[12] || (l[12] = c("p", { class: "reevit-inline-action__hint" }, " You'll be redirected to complete your card payment securely. ", -1)),
                      c("button", {
                        class: "reevit-btn reevit-btn--primary",
                        onClick: l[1] || (l[1] = (w) => f(null)),
                        disabled: L.value === "processing"
                      }, " Pay with Card ", 8, Dt)
                    ])) : E.value === "mobile_money" ? (m(), v("div", Bt, [
                      R.value.includes("mpesa") && !t.phone ? (m(), ie(ue, {
                        key: 0,
                        "initial-phone": t.phone,
                        loading: L.value === "processing",
                        "hide-cancel": "",
                        onSubmit: f
                      }, null, 8, ["initial-phone", "loading"])) : (m(), v(X, { key: 1 }, [
                        c("p", zt, $(R.value.includes("hubtel") ? "Opens the Hubtel checkout with Mobile Money selected." : `Continue to pay securely with Mobile Money via ${B[R.value] || R.value}.`), 1),
                        c("button", {
                          class: "reevit-btn reevit-btn--primary",
                          onClick: l[2] || (l[2] = (w) => f(null)),
                          disabled: L.value === "processing"
                        }, $(R.value.includes("hubtel") ? "Continue with Hubtel" : "Pay with Mobile Money"), 9, Kt)
                      ], 64))
                    ])) : A("", !0)
                  ]),
                  _: 1
                }, 8, ["providers", "selected-provider", "disabled", "theme", "selected-method", "country"])) : (m(), v(X, { key: 1 }, [
                  ce(be, {
                    methods: ee.value,
                    selected: E.value,
                    provider: R.value,
                    "show-label": !1,
                    layout: "grid",
                    disabled: H.value,
                    country: x.value,
                    "selected-theme": ae.value,
                    onSelect: te
                  }, null, 8, ["methods", "selected", "provider", "disabled", "country", "selected-theme"]),
                  E.value ? (m(), v("div", jt, [
                    E.value === "mobile_money" && R.value.includes("mpesa") && !t.phone ? (m(), v("div", Ht, [
                      ce(ue, {
                        "initial-phone": t.phone,
                        loading: L.value === "processing",
                        onSubmit: f,
                        onCancel: l[3] || (l[3] = (w) => Z(y)(null))
                      }, null, 8, ["initial-phone", "loading"])
                    ])) : (m(), v("div", Gt, [
                      c("p", Vt, $(E.value === "card" ? "You will be redirected to complete your card payment securely." : R.value.includes("hubtel") ? "Opens the Hubtel checkout with Mobile Money selected." : `Continue to pay securely via ${B[R.value] || R.value}.`), 1),
                      c("button", {
                        class: "reevit-submit-btn",
                        onClick: l[4] || (l[4] = (w) => f(null)),
                        disabled: L.value === "processing"
                      }, [
                        L.value === "processing" ? (m(), v("span", Yt)) : (m(), v("span", Xt, $(E.value === "card" ? "Pay with Card" : R.value.includes("hubtel") ? "Continue with Hubtel" : "Pay with Mobile Money"), 1))
                      ], 8, qt)
                    ]))
                  ])) : A("", !0)
                ], 64))
              ])) : A("", !0)
            ]),
            l[13] || (l[13] = c("div", { class: "reevit-modal-footer" }, [
              c("div", { class: "reevit-trust-badges" }, [
                c("span", null, "PCI DSS Compliant"),
                c("span", null, "•"),
                c("span", null, "SSL Secure")
              ])
            ], -1))
          ], 6)
        ])) : A("", !0)
      ]))
    ], 4));
  }
});
export {
  ue as MobileMoneyForm,
  be as PaymentMethodSelector,
  rt as ProviderSelector,
  no as ReevitAPIClient,
  eo as ReevitCheckout,
  ro as cn,
  Qt as confirmStripePayment,
  so as createReevitClient,
  Pt as createStripeInstance,
  ao as detectCountryFromCurrency,
  io as detectNetwork,
  lo as formatAmount,
  co as formatPhone,
  Mt as initiateMPesaSTKPush,
  ft as loadFlutterwaveScript,
  Zt as loadHubtelScript,
  gt as loadMonnifyScript,
  bt as loadPaystackScript,
  _t as loadStripeScript,
  wt as openFlutterwaveModal,
  Ct as openHubtelPopup,
  St as openMonnifyModal,
  kt as openPaystackPopup,
  Fe as useReevit,
  uo as validatePhone
};
