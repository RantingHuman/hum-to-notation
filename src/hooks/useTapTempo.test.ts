import { describe, expect, it } from 'vitest';
import { calculateTapTempoBpm } from './useTapTempo';

describe('calculateTapTempoBpm', () => {
  it('returns null until there are two taps', () => {
    expect(calculateTapTempoBpm([])).toBeNull();
    expect(calculateTapTempoBpm([1000])).toBeNull();
  });

  it('calculates a stable tempo from recent tap intervals', () => {
    expect(calculateTapTempoBpm([0, 500, 1000, 1510, 2000, 2500])).toBe(120);
  });

  it('uses the median interval so one late tap does not swing the tempo', () => {
    expect(calculateTapTempoBpm([0, 500, 1000, 2000])).toBe(120);
  });

  it('clamps extreme tempos to the supported range', () => {
    expect(calculateTapTempoBpm([0, 200])).toBe(220);
    expect(calculateTapTempoBpm([0, 5000])).toBe(40);
  });
});
