import { describe, expect, it } from 'vitest';
import { big, date, nycDate, ordinal, pct, seasonLabel, tick } from './format';

describe('format', () => {
	it('writes large numbers the way a sentence would', () => {
		expect(big(1_484_133)).toBe('1.48 million');
		expect(big(1_500_000)).toBe('1.5 million');
		expect(big(341_824)).toBe('341,824');
	});

	it('formats shares and ticks', () => {
		expect(pct(0.4971)).toBe('50%');
		expect(pct(0.0627, 1)).toBe('6.3%');
		expect(tick(2000)).toBe('2K');
		expect(tick(500)).toBe('500');
	});

	it('formats seasons and dates', () => {
		expect(seasonLabel('2025-26')).toBe('2025–26');
		expect(date('2026-02-08')).toBe('Feb. 8, 2026');
		expect(date('2026-02-08', { weekday: true })).toBe('Sunday, Feb. 8, 2026');
		expect(date('2025-10-01', { year: false })).toBe('Oct. 1');
	});

	it('reads a timestamp as a New York date', () => {
		// 02:39 UTC on Nov. 10 is still Nov. 9 in New York.
		expect(nycDate('2026-11-10T02:39:24.321Z')).toBe('Nov. 9, 2026');
	});

	it('writes ordinals', () => {
		expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual([
			'1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '103rd'
		]);
	});
});
