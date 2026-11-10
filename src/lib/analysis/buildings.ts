// Building size, from the number of homes on a tax lot (PLUTO's unitsres).

export const SIZE_BANDS = ['1–2', '3–5', '6–19', '20–49', '50–99', '100+'] as const;
export type SizeBand = (typeof SIZE_BANDS)[number];

export function sizeBand(units: number): SizeBand {
	if (units <= 2) return '1–2';
	if (units <= 5) return '3–5';
	if (units <= 19) return '6–19';
	if (units <= 49) return '20–49';
	if (units <= 99) return '50–99';
	return '100+';
}

// Three or more homes is the legal line for a "multiple dwelling" in New York,
// and the base this story uses for per-apartment rates.
export const isApartmentBuilding = (units: number) => units >= 3;

// Public housing tenants report heat problems to NYCHA, not through 311 to HPD,
// so NYCHA's lots are left out of rates. (Developments converted to private
// management have different owner names and stay in.)
export const isPublicHousing = (ownerName: string) => ownerName.trim().toUpperCase() === 'NYC HOUSING AUTHORITY';

// Share of the total held by the top `fraction` of a population. `population`
// can be larger than `counts.length` when most members have a count of zero
// (e.g. all apartment buildings, not just those with a complaint).
export function topShare(counts: number[], fraction: number, population = counts.length): number {
	const total = counts.reduce((a, b) => a + b, 0);
	if (total === 0) return 0;
	const k = Math.ceil(population * fraction);
	const top = [...counts].sort((a, b) => b - a).slice(0, k);
	return top.reduce((a, b) => a + b, 0) / total;
}

// "2176 TIEBOUT AVENUE" → "2176 Tiebout Avenue". House numbers keep their
// letters upper case ("1040B").
export function titleCase(text: string): string {
	return text
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => (/^\d/.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
		.join(' ');
}
