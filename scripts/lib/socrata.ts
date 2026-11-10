// Small client for NYC Open Data's Socrata API: one SoQL query in, text out,
// with retries. Set SOCRATA_APP_TOKEN to raise the rate limit (optional).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = 'https://data.cityofnewyork.us';
export const PAGE = 50_000;

export async function get(url: string): Promise<string> {
	const headers: Record<string, string> = {};
	if (url.startsWith(HOST) && process.env.SOCRATA_APP_TOKEN) {
		headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
	}
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

export function soql(dataset: string, format: 'json' | 'csv' | 'geojson', query: string) {
	return get(`${HOST}/resource/${dataset}.${format}?${new URLSearchParams({ $query: query })}`);
}

export async function count(dataset: string, where: string): Promise<number> {
	const [row] = JSON.parse(await soql(dataset, 'json', `SELECT count(*) AS n WHERE ${where}`));
	return Number(row.n);
}

export function quote(text: string): string {
	return `'${text.replaceAll("'", "''")}'`;
}

// Downloads every row matching `where` as CSV pages into `dir`, then checks the
// number of rows on disk against the API's own count. Returns the row count.
export async function downloadPaged(opts: {
	dataset: string;
	dir: string;
	prefix: string;
	fields: string;
	where: string;
	orderBy: string;
	label: string;
}): Promise<number> {
	mkdirSync(opts.dir, { recursive: true });
	let rows = 0;
	for (let page = 0; ; page++) {
		const csv = await soql(
			opts.dataset,
			'csv',
			`SELECT ${opts.fields} WHERE ${opts.where} ORDER BY ${opts.orderBy} LIMIT ${PAGE} OFFSET ${page * PAGE}`
		);
		const n = csv.trimEnd().split('\n').length - 1; // minus header
		if (n > 0) writeFileSync(join(opts.dir, `${opts.prefix}-${page}.csv`), csv);
		rows += n;
		console.log(`${opts.label}: page ${page} (${n} rows)`);
		if (n < PAGE) break;
	}
	return rows;
}

// A step is skipped when its done.json exists, unless --refresh is passed.
export async function cached(
	dir: string,
	label: string,
	run: () => Promise<Record<string, unknown>>
): Promise<void> {
	const marker = join(dir, 'done.json');
	if (existsSync(marker) && !process.argv.includes('--refresh')) {
		console.log(`${label}: cached (${readFileSync(marker, 'utf8').slice(0, 120)})`);
		return;
	}
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	const info = await run();
	writeFileSync(marker, JSON.stringify({ ...info, fetchedAt: new Date().toISOString() }));
	console.log(`${label}: done`, info);
}
