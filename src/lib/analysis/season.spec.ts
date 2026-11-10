import { describe, expect, it } from 'vitest';
import { seasonOf } from './season';

describe('seasonOf', () => {
	it('puts October through December in the season that starts that year', () => {
		expect(seasonOf('2025-10-01T00:00:00.000')).toBe('2025-26');
		expect(seasonOf('2025-12-31T23:59:59.000')).toBe('2025-26');
	});

	it('puts January through May in the season that started the year before', () => {
		expect(seasonOf('2026-01-01T00:00:00.000')).toBe('2025-26');
		expect(seasonOf('2026-05-31T23:59:59.000')).toBe('2025-26');
	});

	it('returns null outside heat season', () => {
		expect(seasonOf('2026-06-01T00:00:00.000')).toBeNull();
		expect(seasonOf('2025-09-30T23:59:59.000')).toBeNull();
	});

	it('returns null for seasons outside the story', () => {
		expect(seasonOf('2020-05-01T00:00:00.000')).toBeNull(); // 2019-20
		expect(seasonOf('2026-10-15T00:00:00.000')).toBeNull(); // 2026-27, in progress
	});
});
