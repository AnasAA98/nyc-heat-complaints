import type { Category } from './categories';
import { toMillis } from './season';

export const WINDOW_DAYS = 7;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface Complaint {
	bbl: string;
	created: string;
	closed: string | null;
	category: Category;
}

export interface Closing {
	bbl: string;
	created: string;
	closed: string;
	category: Category;
	// True if the same building filed a new heat complaint in the 7 days after this closing.
	cameBack: boolean;
}

// For every non-duplicate complaint with a valid close date, check whether the same
// building (BBL) filed another heat complaint after it closed, within WINDOW_DAYS.
// `followUps` may include complaints outside the seasons being measured
// (e.g. June 1–7) so closings near May 31 get a full window.
export function findClosings(measured: Complaint[], followUps: Complaint[]): Closing[] {
	const createdByBbl = new Map<string, number[]>();
	for (const c of followUps) {
		const list = createdByBbl.get(c.bbl) ?? [];
		list.push(toMillis(c.created));
		createdByBbl.set(c.bbl, list);
	}
	for (const list of createdByBbl.values()) list.sort((a, b) => a - b);

	const closings: Closing[] = [];
	for (const c of measured) {
		if (c.category === 'duplicate' || !c.closed) continue;
		const closedAt = toMillis(c.closed);
		if (Number.isNaN(closedAt) || closedAt < toMillis(c.created)) continue;
		const times = createdByBbl.get(c.bbl) ?? [];
		const next = firstAfter(times, closedAt);
		closings.push({
			bbl: c.bbl,
			created: c.created,
			closed: c.closed,
			category: c.category,
			cameBack: next !== undefined && next - closedAt <= WINDOW_MS
		});
	}
	return closings;
}

// Binary search: first value strictly greater than t.
function firstAfter(sorted: number[], t: number): number | undefined {
	let lo = 0;
	let hi = sorted.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (sorted[mid] <= t) lo = mid + 1;
		else hi = mid;
	}
	return sorted[lo];
}
