import { currencyExponent } from '@reevit/core';

/** Convert a Reevit intent amount to Flutterwave's major-unit amount. */
export function toFlutterwaveAmount(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}
