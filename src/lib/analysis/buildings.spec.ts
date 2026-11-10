import { describe, expect, it } from 'vitest';
import { isApartmentBuilding, isPublicHousing, sizeBand, titleCase, topShare } from './buildings';

describe('sizeBand', () => {
	it('puts edge values in the right band', () => {
		expect(sizeBand(1)).toBe('1–2');
		expect(sizeBand(2)).toBe('1–2');
		expect(sizeBand(3)).toBe('3–5');
		expect(sizeBand(19)).toBe('6–19');
		expect(sizeBand(20)).toBe('20–49');
		expect(sizeBand(99)).toBe('50–99');
		expect(sizeBand(100)).toBe('100+');
	});
});

describe('isApartmentBuilding', () => {
	it('starts at three homes', () => {
		expect(isApartmentBuilding(2)).toBe(false);
		expect(isApartmentBuilding(3)).toBe(true);
	});
});

describe('isPublicHousing', () => {
	it('matches NYCHA itself but not privately managed conversions', () => {
		expect(isPublicHousing('NYC HOUSING AUTHORITY')).toBe(true);
		expect(isPublicHousing(' nyc housing authority ')).toBe(true);
		expect(isPublicHousing('NYCHA TRIBOROUGH PRESERVATION HDFC')).toBe(false);
	});
});

describe('topShare', () => {
	it('finds the share held by the top fraction', () => {
		expect(topShare([50, 30, 10, 10], 0.25)).toBe(0.5);
		expect(topShare([50, 30, 10, 10], 0.5)).toBe(0.8);
	});

	it('counts members with zero toward the population', () => {
		// 4 buildings with complaints out of 100: the top 1% is one building.
		expect(topShare([50, 30, 10, 10], 0.01, 100)).toBe(0.5);
	});

	it('handles an empty or all-zero list', () => {
		expect(topShare([], 0.1)).toBe(0);
		expect(topShare([0, 0], 0.5)).toBe(0);
	});
});

describe('titleCase', () => {
	it('formats PLUTO addresses', () => {
		expect(titleCase('2176 TIEBOUT AVENUE')).toBe('2176 Tiebout Avenue');
		expect(titleCase('31-35  CRESCENT STREET')).toBe('31-35 Crescent Street');
		expect(titleCase('1040B EAST 217 STREET')).toBe('1040B East 217 Street');
	});

	it('returns an empty string for a blank address', () => {
		expect(titleCase('')).toBe('');
		expect(titleCase('  ')).toBe('');
	});
});
