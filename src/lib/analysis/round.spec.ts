import { describe, expect, it } from 'vitest';
import { toUnits } from './round';

describe('toUnits', () => {
	it('always adds up to the total', () => {
		expect(toUnits([0.4971, 0.1988, 0.1144, 0.1062, 0.0627, 0.0208])).toEqual([50, 20, 11, 11, 6, 2]);
		expect(toUnits([1 / 3, 1 / 3, 1 / 3]).reduce((a, b) => a + b)).toBe(100);
	});

	it('gives leftover units to the largest remainders', () => {
		expect(toUnits([0.335, 0.335, 0.33])).toEqual([34, 33, 33]);
		expect(toUnits([0.0818, 0.2814, 0.6368])).toEqual([8, 28, 64]);
	});

	it('handles shares that do not sum to one, and all zeros', () => {
		expect(toUnits([2, 1, 1], 4)).toEqual([2, 1, 1]);
		expect(toUnits([0, 0])).toEqual([0, 0]);
	});
});
