// Downloads every 311 HEAT/HOT WATER complaint for the story's seasons from
// NYC Open Data (Socrata) into data/raw/. Re-running skips files already on disk;
// pass --refresh to download again.
//
// Each complaint's outcome comes from its resolution_description. Rather than
// download that ~300-character text for 1.5M rows, we:
//   1. ask the API for the distinct texts in each season (about 30),
//   2. label each one with categorize() — the same function the tests cover,
//   3. download rows one category at a time with `resolution_description IN (...)`,
//   4. check the category totals add up to the season total.

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { categorize, CATEGORIES, type Category } from '../src/lib/analysis/categories';
import { SEASONS } from '../src/lib/analysis/season';

const BASE = 'https://data.cityofnewyork.us/resource/erm2-nwe9';
const TYPES = "complaint_type IN ('HEAT/HOT WATER', 'Heat/Hot Water')";
const FIELDS = 'unique_key, bbl, created_date, closed_date, borough, incident_zip, incident_address';
const PAGE = 50_000;
const RAW = 'data/raw';
const refresh = process.argv.includes('--refresh');

// Download through June 7 so complaints closed near May 31 still get a full
// 7-day follow-up window. build-data.ts only measures Oct 1 – May 31.
function seasonRange(season: string): string {
	const start = Number(season.slice(0, 4));
	return `created_date BETWEEN '${start}-10-01T00:00:00' AND '${start + 1}-06-07T23:59:59'`;
}

function quote(text: string): string {
	return `'${text.replaceAll("'", "''")}'`;
}

async function soql(format: 'json' | 'csv', query: string): Promise<string> {
	const url = `${BASE}.${format}?${new URLSearchParams({ $query: query })}`;
	const headers: Record<string, string> = {};
	if (process.env.SOCRATA_APP_TOKEN) headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, { headers, signal: AbortSignal.timeout(10 * 60_000) });
			const body = await res.text();
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
			return body;
		} catch (err) {
			if (attempt === 3) throw err;
			console.warn(`  retry ${attempt} after error: ${(err as Error).message}`);
			await new Promise((r) => setTimeout(r, 5_000 * attempt));
		}
	}
}

async function count(where: string): Promise<number> {
	const [row] = JSON.parse(await soql('json', `SELECT count(*) AS n WHERE ${where}`));
	return Number(row.n);
}

async function fetchSeason(season: string) {
	const dir = join(RAW, season);
	if (existsSync(join(dir, 'done.json')) && !refresh) {
		console.log(`${season}: cached`);
		return;
	}
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	const range = `${TYPES} AND ${seasonRange(season)}`;

	const texts: { text: string | null; n: number }[] = JSON.parse(
		await soql('json', `SELECT resolution_description AS text, count(*) AS n WHERE ${range} GROUP BY text`)
	).map((r: { text?: string; n: string }) => ({ text: r.text ?? null, n: Number(r.n) }));

	const byCategory = new Map<Category, (string | null)[]>();
	for (const { text } of texts) {
		const c = categorize(text);
		byCategory.set(c, [...(byCategory.get(c) ?? []), text]);
	}
	writeFileSync(join(dir, 'texts.json'), JSON.stringify(texts, null, '\t'));

	let fetched = 0;
	for (const category of CATEGORIES) {
		const list = byCategory.get(category);
		if (!list) continue;
		const named = list.filter((t): t is string => t !== null);
		const conditions = [];
		if (named.length) conditions.push(`resolution_description IN (${named.map(quote).join(', ')})`);
		if (list.includes(null)) conditions.push('resolution_description IS NULL');
		const where = `${range} AND (${conditions.join(' OR ')})`;

		for (let page = 0; ; page++) {
			const csv = await soql(
				'csv',
				`SELECT ${FIELDS} WHERE ${where} ORDER BY unique_key LIMIT ${PAGE} OFFSET ${page * PAGE}`
			);
			const rows = csv.trimEnd().split('\n').length - 1; // minus header
			if (rows > 0) writeFileSync(join(dir, `${category}-${page}.csv`), csv);
			fetched += rows;
			console.log(`${season}: ${category} page ${page} (${rows} rows)`);
			if (rows < PAGE) break;
		}
	}

	const expected = await count(range);
	if (fetched !== expected) {
		throw new Error(`${season}: downloaded ${fetched} rows but the API reports ${expected}`);
	}
	writeFileSync(join(dir, 'done.json'), JSON.stringify({ rows: fetched, fetchedAt: new Date().toISOString() }));
	console.log(`${season}: ${fetched} rows, matches API total`);
}

mkdirSync(RAW, { recursive: true });
// Two seasons at a time keeps us polite to the API without taking all day.
const queue = [...SEASONS];
await Promise.all(
	[0, 1].map(async () => {
		for (let s = queue.shift(); s; s = queue.shift()) await fetchSeason(s);
	})
);
console.log('done:', readdirSync(RAW).join(', '));
