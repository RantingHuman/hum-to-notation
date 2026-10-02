import { describe, expect, it } from 'vitest';
import { nextUntitledName } from './projectNames';

describe('nextUntitledName', () => {
  it('starts with a plain name', () => {
    expect(nextUntitledName([])).toBe('Untitled melody');
    expect(nextUntitledName(['Sunday riff'])).toBe('Untitled melody');
  });

  it('numbers after the highest existing untitled melody', () => {
    expect(nextUntitledName(['Untitled melody'])).toBe('Untitled melody 2');
    expect(nextUntitledName(['Untitled melody', 'Untitled melody 4', 'Sunday riff'])).toBe('Untitled melody 5');
  });

  it('ignores names that only start the same way', () => {
    expect(nextUntitledName(['Untitled melody remix'])).toBe('Untitled melody');
  });
});
