// Formatting helpers. Everything is pinned to en-US so the prerendered HTML and
// the browser produce identical text.

export const num = (n: number) => n.toLocaleString('en-US');

export const pct = (share: number, digits = 0) => `${(share * 100).toFixed(digits)}%`;

// 1484133 → "1.48 million"; 341824 → "341,824"
export function big(n: number): string {
	return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(/0$/, '')} million` : num(n);
}

// Axis ticks: 2000 → "2K", 250000 → "250K"
export const tick = (n: number) => (n >= 1000 ? `${num(n / 1000)}K` : String(n));

// "2025-26" → "2025–26"
export const seasonLabel = (season: string) => season.replace('-', '–');

// AP-style month abbreviations.
const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "2026-02-08" → "Feb. 8, 2026". Plain dates only, read as UTC so they never shift.
export function date(iso: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
	const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
	const base = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
	const withYear = opts.year === false ? base : `${base}, ${d.getUTCFullYear()}`;
	return opts.weekday ? `${WEEKDAYS[d.getUTCDay()]}, ${withYear}` : withYear;
}

export const monthName = (index: number) => MONTHS[index];

// A timestamp → the date it was in New York.
export function nycDate(timestamp: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(timestamp));
	return date(parts);
}

// 1 → "1st", 12 → "12th", 23 → "23rd"
export function ordinal(n: number): string {
	const tens = n % 100;
	if (tens >= 11 && tens <= 13) return `${n}th`;
	return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
