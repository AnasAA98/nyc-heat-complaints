// NYC heat season runs October 1 through May 31. A season is named by its two
// calendar years, e.g. "2025-26" = Oct 1, 2025 – May 31, 2026.
//
// 311 timestamps are NYC local time with no offset ("2025-10-01T07:15:00.000").
// We read the year and month straight from the string so no timezone conversion
// can shift a complaint across a season boundary.

export const SEASONS = ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] as const;
export type Season = (typeof SEASONS)[number];

export function seasonStartYear(timestamp: string): number | null {
	const year = Number(timestamp.slice(0, 4));
	const month = Number(timestamp.slice(5, 7));
	if (!year || !month) return null;
	if (month >= 10) return year;
	if (month <= 5) return year - 1;
	return null; // June–September: not heat season
}

export function seasonOf(timestamp: string): Season | null {
	const start = seasonStartYear(timestamp);
	if (start === null) return null;
	const name = `${start}-${String(start + 1).slice(2)}`;
	return (SEASONS as readonly string[]).includes(name) ? (name as Season) : null;
}

// Both timestamps share the same (missing) offset, so parsing them the same way
// keeps differences correct to within the one-hour daylight-saving shift.
export function toMillis(timestamp: string): number {
	return Date.parse(timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`);
}
