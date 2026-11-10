import { describe, expect, it } from 'vitest';
import { findClosings, type Complaint } from './cameBack';

const fixed = (bbl: string, created: string, closed: string): Complaint => ({
	bbl,
	created,
	closed,
	category: 'said_fixed'
});
const call = (bbl: string, created: string): Complaint => ({
	bbl,
	created,
	closed: null,
	category: 'duplicate'
});

describe('findClosings', () => {
	it('counts a new complaint from the same building within 7 days', () => {
		const a = fixed('1', '2025-12-01T08:00:00.000', '2025-12-02T10:00:00.000');
		const b = call('1', '2025-12-08T09:00:00.000');
		expect(findClosings([a], [a, b])[0].cameBack).toBe(true);
	});

	it('does not count a complaint more than 7 days later', () => {
		const a = fixed('1', '2025-12-01T08:00:00.000', '2025-12-02T10:00:00.000');
		const b = call('1', '2025-12-09T10:00:01.000');
		expect(findClosings([a], [a, b])[0].cameBack).toBe(false);
	});

	it('ignores complaints filed before the closing and other buildings', () => {
		const a = fixed('1', '2025-12-01T08:00:00.000', '2025-12-02T10:00:00.000');
		const before = call('1', '2025-12-01T20:00:00.000');
		const elsewhere = call('2', '2025-12-03T09:00:00.000');
		expect(findClosings([a], [a, before, elsewhere])[0].cameBack).toBe(false);
	});

	it('skips duplicates, open complaints and close dates before the open date', () => {
		const dup = call('1', '2025-12-01T08:00:00.000');
		const open: Complaint = { ...fixed('1', '2025-12-01T08:00:00.000', ''), closed: null };
		const bad = fixed('1', '2025-12-05T08:00:00.000', '2025-12-04T08:00:00.000');
		expect(findClosings([dup, open, bad], [])).toHaveLength(0);
	});
});
