import { describe, expect, it } from 'vitest';

import { flutterwaveTxRef } from './loaders';

// Reevit checks and binds a Flutterwave payment by the reference it created it
// under (`pf_…`). The window used to pay under the Reevit payment id, so the
// two never met and a paid payment stayed "needs action".
describe('flutterwaveTxRef', () => {
  it("pays under Reevit's stored Flutterwave reference", () => {
    expect(flutterwaveTxRef({ id: 'pay_1', reference: 'ORD-1', providerRefId: 'pf_abc' })).toBe('pf_abc');
  });

  it('ignores a stored reference that is not a tx_ref', () => {
    // After a confirmation the stored reference can be Flutterwave's numeric transaction id.
    expect(flutterwaveTxRef({ id: 'pay_1', reference: 'ORD-1', providerRefId: '4521987' })).toBe('ORD-1');
  });

  it('falls back when the backend sent no reference', () => {
    expect(flutterwaveTxRef({ id: 'pay_1' })).toBe('pay_1');
    expect(flutterwaveTxRef({ id: 'pay_1' }, 'ORD-2')).toBe('ORD-2');
    expect(flutterwaveTxRef(null)).toMatch(/^flw_/);
  });
});
