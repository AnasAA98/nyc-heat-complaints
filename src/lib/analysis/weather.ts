// Heating degree days: the standard measure of how much heating a day demands.
// One day's value is how far its average temperature falls below 65°F.
export const HDD_BASE = 65;

export function heatingDegreeDays(tmax: number, tmin: number): number {
	return Math.max(0, HDD_BASE - (tmax + tmin) / 2);
}

// "2025-10-01" + 3 → "2025-10-04". Works on plain dates, no timezones.
export function addDays(date: string, days: number): string {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

// Every date of a heat season, Oct 1 through May 31.
export function seasonDates(season: string): string[] {
	const start = Number(season.slice(0, 4));
	const out: string[] = [];
	for (let d = `${start}-10-01`; d <= `${start + 1}-05-31`; d = addDays(d, 1)) out.push(d);
	return out;
}
