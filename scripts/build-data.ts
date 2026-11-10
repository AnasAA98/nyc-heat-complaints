// Turns the raw downloads in data/raw/ into the small JSON files the page reads
// (src/lib/data/) plus a public table of every closing text and its category
// (data/resolution-categories.json).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORIES, categorize, type Category } from '../src/lib/analysis/categories';
import { findClosings, WINDOW_DAYS, type Complaint } from '../src/lib/analysis/cameBack';
import { seasonOf, SEASONS, type Season } from '../src/lib/analysis/season';
import { fixMojibake } from '../src/lib/analysis/text';

const RAW = 'data/raw';
const OUT = 'src/lib/data';

const AREAS = ['Citywide', 'Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island'] as const;
type Area = (typeof AREAS)[number];
const BOROUGHS: Record<string, Area> = {
	BRONX: 'Bronx',
	BROOKLYN: 'Brooklyn',
	MANHATTAN: 'Manhattan',
	QUEENS: 'Queens',
	'STATEN ISLAND': 'Staten Island'
};

interface Row extends Complaint {
	key: string;
	season: Season | null;
	area: Area | null;
	zip: string;
	address: string;
}

// Minimal CSV line parser: handles quoted fields and "" escapes.
function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') field += line[i++];
			else if (ch === '"') quoted = false;
			else field += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ',') {
			out.push(field);
			field = '';
		} else field += ch;
	}
	out.push(field);
	return out;
}

// A usable BBL is 10 digits: borough 1–5, a non-zero block, then the lot.
const isValidBbl = (bbl: string) => /^[1-5]\d{9}$/.test(bbl) && bbl.slice(1, 6) !== '00000';

// ---- Load ----------------------------------------------------------------

const rows = new Map<string, Row>();
const fetchedAt: string[] = [];
const textCounts = new Map<string, Partial<Record<Season, number>>>();

for (const season of SEASONS) {
	const dir = join(RAW, season);
	if (!existsSync(join(dir, 'done.json'))) throw new Error(`${season} not downloaded; run npm run fetch`);
	fetchedAt.push(JSON.parse(readFileSync(join(dir, 'done.json'), 'utf8')).fetchedAt);

	for (const { text, n } of JSON.parse(readFileSync(join(dir, 'texts.json'), 'utf8'))) {
		const key = text ?? '';
		textCounts.set(key, { ...textCounts.get(key), [season]: n });
	}

	for (const file of readdirSync(dir).filter((f) => f.endsWith('.csv'))) {
		const category = file.replace(/-\d+\.csv$/, '') as Category;
		const [header, ...lines] = readFileSync(join(dir, file), 'utf8').trimEnd().split('\n');
		const cols = parseCsvLine(header);
		const at = (name: string) => cols.indexOf(name);
		for (const line of lines) {
			const f = parseCsvLine(line);
			const created = f[at('created_date')];
			rows.set(f[at('unique_key')], {
				key: f[at('unique_key')],
				bbl: f[at('bbl')].trim(),
				created,
				closed: f[at('closed_date')] || null,
				category,
				season: seasonOf(created),
				area: BOROUGHS[f[at('borough')]] ?? null,
				zip: f[at('incident_zip')],
				address: f[at('incident_address')].replace(/\s+/g, ' ').trim()
			});
		}
	}
}

const all = [...rows.values()];
const measured = all.filter((r) => r.season !== null);
console.log(`loaded ${all.length} rows, ${measured.length} in Oct 1 – May 31 of the six seasons`);

// ---- Part 1: how complaints were closed ----------------------------------

type Tally = { total: number } & Record<Category, number>;
const emptyTally = (): Tally =>
	Object.fromEntries([['total', 0], ...CATEGORIES.map((c) => [c, 0])]) as Tally;

const outcomes = Object.fromEntries(
	AREAS.map((a) => [a, Object.fromEntries(SEASONS.map((s) => [s, emptyTally()]))])
) as Record<Area, Record<Season, Tally>>;

let unspecifiedBorough = 0;
for (const r of measured) {
	const season = r.season as Season;
	for (const area of ['Citywide', r.area] as const) {
		if (!area) continue;
		outcomes[area][season].total++;
		outcomes[area][season][r.category]++;
	}
	if (!r.area) unspecifiedBorough++;
}

// ---- Part 2: did complaints come back within 7 days? ---------------------

const withBbl = all.filter((r) => isValidBbl(r.bbl));
const measuredWithBbl = withBbl.filter((r) => r.season !== null);
const closings = findClosings(measuredWithBbl, withBbl);

type Return = { closings: number; cameBack: number };
const cameBack = Object.fromEntries(
	SEASONS.map((s) => [
		s,
		Object.fromEntries(CATEGORIES.filter((c) => c !== 'duplicate').map((c) => [c, { closings: 0, cameBack: 0 }]))
	])
) as Record<Season, Record<Exclude<Category, 'duplicate'>, Return>>;

// Per building, per season: "fixed" closings followed by a new complaint within 7 days.
const buildings = new Map<string, { bySeason: Partial<Record<Season, number>>; total: number }>();

for (const c of closings) {
	const season = seasonOf(c.created) as Season;
	const t = cameBack[season][c.category as Exclude<Category, 'duplicate'>];
	t.closings++;
	if (c.cameBack) t.cameBack++;
	if (c.category === 'said_fixed' && c.cameBack) {
		const b = buildings.get(c.bbl) ?? { bySeason: {}, total: 0 };
		b.bySeason[season] = (b.bySeason[season] ?? 0) + 1;
		b.total++;
		buildings.set(c.bbl, b);
	}
}

// Most common address / ZIP / borough seen for each BBL, for labeling.
const labels = new Map<string, Map<string, number>>();
for (const r of measuredWithBbl) {
	const label = `${r.address}|${r.zip}|${r.area ?? ''}`;
	const m = labels.get(r.bbl) ?? new Map<string, number>();
	m.set(label, (m.get(label) ?? 0) + 1);
	labels.set(r.bbl, m);
}
const labelOf = (bbl: string) => {
	const [address, zip, borough] = [...labels.get(bbl)!.entries()].sort((a, b) => b[1] - a[1])[0][0].split('|');
	return { address, zip, borough };
};

const repeatBuildings = [...buildings.entries()].map(([bbl, b]) => ({
	bbl,
	...labelOf(bbl),
	total: b.total,
	seasons: SEASONS.filter((s) => b.bySeason[s]).length,
	bySeason: SEASONS.map((s) => b.bySeason[s] ?? 0)
}));

const buildingSummary = {
	buildingsWithAnyComplaint: Object.fromEntries(
		SEASONS.map((s) => [s, new Set(measuredWithBbl.filter((r) => r.season === s).map((r) => r.bbl)).size])
	),
	buildingsWithFixedThenBack: Object.fromEntries(
		SEASONS.map((s) => [s, repeatBuildings.filter((b) => b.bySeason[SEASONS.indexOf(s)] > 0).length])
	),
	bySeasonCount: Object.fromEntries(
		[1, 2, 3, 4, 5, 6].map((k) => [k, repeatBuildings.filter((b) => b.seasons >= k).length])
	),
	top: repeatBuildings.sort((a, b) => b.total - a.total || b.seasons - a.seasons).slice(0, 50)
};

// ---- Write ---------------------------------------------------------------

const noBbl = measured.filter((r) => !isValidBbl(r.bbl)).length;
const nonDupMeasuredWithBbl = measuredWithBbl.filter((r) => r.category !== 'duplicate');
const meta = {
	source: 'NYC Open Data, 311 Service Requests from 2020 to Present (erm2-nwe9)',
	complaintTypes: ['HEAT/HOT WATER', 'Heat/Hot Water'],
	fetchedAt: fetchedAt.sort()[0],
	windowDays: WINDOW_DAYS,
	seasons: SEASONS,
	rows: {
		downloaded: all.length,
		inSeason: measured.length,
		unspecifiedBorough,
		noValidBbl: noBbl,
		nonDuplicateWithBbl: nonDupMeasuredWithBbl.length,
		closingsChecked: closings.length,
		skippedOpenOrBadDates: nonDupMeasuredWithBbl.length - closings.length
	}
};

const categoryTable = [...textCounts.entries()]
	.map(([text, bySeason]) => ({
		text: text ? fixMojibake(text) : '(blank)',
		category: categorize(text || null),
		// Counts cover the download window (Oct 1 – Jun 7), not just heat season.
		downloadedBySeason: bySeason
	}))
	.sort((a, b) => a.category.localeCompare(b.category));

mkdirSync(OUT, { recursive: true });
const write = (path: string, data: unknown) => writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
write(join(OUT, 'outcomes.json'), { areas: AREAS, seasons: SEASONS, outcomes });
write(join(OUT, 'came-back.json'), cameBack);
write(join(OUT, 'buildings.json'), buildingSummary);
write(join(OUT, 'meta.json'), meta);
write('data/resolution-categories.json', categoryTable);
console.log(JSON.stringify(meta, null, 2));
