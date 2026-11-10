// Downloads every 311 HEAT/HOT WATER complaint for the story's seasons from
// NYC Open Data (Socrata) into data/raw/<season>/. Re-running skips seasons
// already on disk; pass --refresh to download again.
//
// Each complaint's outcome comes from its resolution_description. Rather than
// download that ~300-character text for 1.5M rows, we:
//   1. ask the API for the distinct texts in each season (about 30),
//   2. label each one with categorize() — the same function the tests cover,
//   3. download rows one category at a time with `resolution_description IN (...)`,
//   4. check the category totals add up to the season total.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { categorize, CATEGORIES, type Category } from '../src/lib/analysis/categories';
import { SEASONS } from '../src/lib/analysis/season';
import { cached, count, downloadPaged, quote, soql } from './lib/socrata';

const DATASET = 'erm2-nwe9';
const TYPES = "complaint_type IN ('HEAT/HOT WATER', 'Heat/Hot Water')";
const FIELDS = 'unique_key, bbl, created_date, closed_date, borough, incident_zip, incident_address';
const RAW = 'data/raw';

// Download through June 7 so complaints closed near May 31 still get a full
// 7-day follow-up window. build-data.ts only measures Oct 1 – May 31.
function seasonRange(season: string): string {
	const start = Number(season.slice(0, 4));
	return `created_date BETWEEN '${start}-10-01T00:00:00' AND '${start + 1}-06-07T23:59:59'`;
}

async function fetchSeason(season: string) {
	const dir = join(RAW, season);
	await cached(dir, season, async () => {
		const range = `${TYPES} AND ${seasonRange(season)}`;

		const texts: { text: string | null; n: number }[] = JSON.parse(
			await soql(DATASET, 'json', `SELECT resolution_description AS text, count(*) AS n WHERE ${range} GROUP BY text`)
		).map((r: { text?: string; n: string }) => ({ text: r.text ?? null, n: Number(r.n) }));

		const byCategory = new Map<Category, (string | null)[]>();
		for (const { text } of texts) {
			const c = categorize(text);
			byCategory.set(c, [...(byCategory.get(c) ?? []), text]);
		}
		writeFileSync(join(dir, 'texts.json'), JSON.stringify(texts, null, '\t'));

		let rows = 0;
		for (const category of CATEGORIES) {
			const list = byCategory.get(category);
			if (!list) continue;
			const named = list.filter((t): t is string => t !== null);
			const conditions = [];
			if (named.length) conditions.push(`resolution_description IN (${named.map(quote).join(', ')})`);
			if (list.includes(null)) conditions.push('resolution_description IS NULL');
			rows += await downloadPaged({
				dataset: DATASET,
				dir,
				prefix: category,
				fields: FIELDS,
				where: `${range} AND (${conditions.join(' OR ')})`,
				orderBy: 'unique_key',
				label: `${season} ${category}`
			});
		}

		const expected = await count(DATASET, range);
		if (rows !== expected) {
			throw new Error(`${season}: downloaded ${rows} rows but the API reports ${expected}`);
		}
		return { rows };
	});
}

// Two seasons at a time keeps us polite to the API without taking all day.
const queue = [...SEASONS];
await Promise.all(
	[0, 1].map(async () => {
		for (let s = queue.shift(); s; s = queue.shift()) await fetchSeason(s);
	})
);
