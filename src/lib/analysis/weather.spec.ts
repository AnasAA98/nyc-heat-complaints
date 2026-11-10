import { describe, expect, it } from 'vitest';
import { addDays, heatingDegreeDays, seasonDates } from './weather';

describe('heatingDegreeDays', () => {
	it('measures how far the daily average falls below 65', () => {
		expect(heatingDegreeDays(40, 30)).toBe(30);
		expect(heatingDegreeDays(17, 9)).toBe(52);
	});

	it('is zero on warm days', () => {
		expect(heatingDegreeDays(80, 60)).toBe(0);
		expect(heatingDegreeDays(70, 60)).toBe(0);
	});
});

describe('addDays', () => {
	it('crosses month and year boundaries', () => {
		expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
		expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
	});
});

describe('seasonDates', () => {
	it('runs Oct 1 through May 31', () => {
		const days = seasonDates('2025-26');
		expect(days[0]).toBe('2025-10-01');
		expect(days.at(-1)).toBe('2026-05-31');
		expect(days).toHaveLength(243);
	});

	it('has one more day in a leap year', () => {
		expect(seasonDates('2023-24')).toHaveLength(244);
	});
});
