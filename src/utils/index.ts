/**
 * Helpers for the Ledger checkout.
 */

import { currencyExponent, detectNetwork as coreDetectNetwork } from '@reevit/core';
import type { MobileMoneyNetwork, PaymentMethod } from '@reevit/core';
import airteltigoLogo from '../assets/methods/airteltigo.png';
import applePayLogo from '../assets/methods/apple-pay.png';
import googlePayLogo from '../assets/methods/google-pay.png';
import mastercardLogo from '../assets/methods/mastercard.png';
import mpesaLogo from '../assets/methods/mpesa.png';
import mtnLogo from '../assets/methods/mtn.png';
import telecelLogo from '../assets/methods/telecel.png';
import visaLogo from '../assets/methods/visa.png';

/** Row and panel titles per payment method. */
export const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'Card',
  mobile_money: 'Mobile money',
  bank_transfer: 'Bank transfer',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

/** Order the method list is shown in. */
export const METHOD_ORDER: PaymentMethod[] = ['card', 'mobile_money', 'bank_transfer', 'apple_pay', 'google_pay'];

/**
 * Amount as shown in the checkout header and on buttons: `GHS 755.00`.
 * Minor units in, ISO code + grouped number out, using the currency's real exponent.
 */
export function formatMoney(minor: number, currency: string): string {
  const code = (currency || 'GHS').toUpperCase();
  const exp = currencyExponent(code);
  const value = (minor || 0) / 10 ** exp;
  return `${code} ${value.toLocaleString('en-GB', { minimumFractionDigits: exp, maximumFractionDigits: exp })}`;
}

/** Country code for a currency; decides which mobile money marks a row shows. */
export function getCountryFromCurrency(currency: string): string {
  const currencyToCountry: Record<string, string> = {
    GHS: 'GH',
    NGN: 'NG',
    KES: 'KE',
    ZAR: 'ZA',
    USD: 'US',
    GBP: 'GB',
    EUR: 'EU',
  };
  return currencyToCountry[currency.toUpperCase()] || 'GH';
}

export interface MethodMark {
  /** Stable key, rendered as `data-mark` so CSS can target a brand without matching URLs. */
  key: string;
  src: string;
}

/** Brand marks shown on a method row, keyed for styling. */
export function getMethodMarks(country: string, method: string): MethodMark[] {
  const c = country.toUpperCase();
  const mark = (key: string, src: string): MethodMark => ({ key, src });

  if (method === 'card') return [mark('visa', visaLogo), mark('mastercard', mastercardLogo)];
  if (method === 'apple_pay') return [mark('apple_pay', applePayLogo)];
  if (method === 'google_pay') return [mark('google_pay', googlePayLogo)];
  if (method === 'mobile_money') {
    if (c === 'GH') return [mark('mtn', mtnLogo), mark('telecel', telecelLogo), mark('airteltigo', airteltigoLogo)];
    if (c === 'KE') return [mark('mpesa', mpesaLogo)];
    return [mark('mtn', mtnLogo)];
  }
  return [];
}

/** Ghana number patterns per network, used by the network-mode mobile money form. */
const GH_PATTERNS: Record<string, RegExp> = {
  mtn: /^(0|233|\+233)?(24|54|55|59)\d{7}$/,
  telecel: /^(0|233|\+233)?(20|50)\d{7}$/,
  airteltigo: /^(0|233|\+233)?(26|27|56|57)\d{7}$/,
};

/** Is this a valid Ghana mobile money number (optionally for one network)? */
export function validateGhanaPhone(phone: string, network?: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (network && GH_PATTERNS[network]) return GH_PATTERNS[network].test(cleaned);
  return Object.values(GH_PATTERNS).some((pattern) => pattern.test(cleaned));
}

/** Operator for a Ghana number (local 0XX…, 233… or +233…), or null. */
export function detectGhanaNetwork(phone: string): MobileMoneyNetwork | null {
  let cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+233')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('233')) cleaned = '0' + cleaned.slice(3);
  if (!cleaned.startsWith('0') || cleaned.length < 3) return null;
  return coreDetectNetwork(cleaned);
}

/** The provider mark shown in the checkout footer. */
export interface FooterProvider {
  id: string;
  name: string;
  src: string;
  kind: 'icon' | 'word';
}
