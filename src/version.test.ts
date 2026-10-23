import { describe, expect, it } from 'vitest';
import pkgSource from '../package.json?raw';

import { SDK_VERSION } from './version';

describe('SDK_VERSION', () => {
  it('matches package.json', () => {
    expect(SDK_VERSION).toBe(JSON.parse(pkgSource).version);
  });
});
