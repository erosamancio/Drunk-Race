import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_MODEL_PATHS } from '../src/assets/manifest';

describe('asset manifest', () => {
  it.each(ALL_MODEL_PATHS)('%s exists in public/', (path) => {
    expect(existsSync(resolve('public', path))).toBe(true);
  });
});
