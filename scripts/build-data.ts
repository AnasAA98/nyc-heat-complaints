// Turns the raw downloads in data/raw/ into the small JSON files the page reads:
//
//   src/lib/data/outcomes.json        how complaints were closed, by borough and season
//   src/lib/data/weather.json         daily complaints next to Central Park temperatures
//   src/lib/data/neighborhoods.json   complaints per 1,000 apartments, by neighborhood
//   src/lib/data/buildings.json       concentration, repeat buildings, follow-ups by size
//   src/lib/data/story.json           every number quoted in the article text
//   src/lib/data/meta.json            sources, download dates, what was left out
//   static/data/zip/<zip>.json        building lookup, loaded on demand
//   data/resolution-categories.json   every closing text and the outcome it maps to

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	isApartmentBuilding,
	isPublicHousing,
	SIZE_BANDS,
	sizeBand,
	titleCase,
	topShare,
	type SizeBand
} from '../src/lib/analysis/buildings';
import { CATEGORIES, categorize, type Category } from '../src/lib/analysis/categories';
import { findClosings, WINDOW_DAYS, type Complaint } from '../src/lib/analysis/cameBack';
import { seasonOf, SEASONS, type Season } from '../src/lib/analysis/season';
import { fixMojibake } from '../src/lib/analysis/text';
import { violationKind } from '../src/lib/analysis/violations';
import { HDD_BASE, heatingDegreeDays, seasonDates } from '../src/lib/analysis/weather';
import { readCsvDir } from './lib/csv';

const RAW = 'data/raw';
const OUT = 'src/lib/data';
const LOOKUP = 'static/data/zip';

// A neighborhood needs at least this many apartments for its rate to be shown.
const MIN_APARTMENTS = 1000;
// "Heavy" buildings: complaints on at least this many days of one season.
const HEAVY_DAYS = 30;
// "Repeat" buildings: complaints on at least this many days, season after season.
const REPEAT_DAYS = 20;

const AREAS = ['Citywide', 'Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island'] as const;
type Area = (typeof AREAS)[number];
const BOROUGHS: Record<string, Area> = {
	BRONX: 'Bronx',
	BROOKLYN: 'Brooklyn',
	MANHATTAN: 'Manhattan',
	QUEENS: 'Queens',
	'STATEN ISLAND': 'Staten Island'
};

const S = SEASONS.length;
const seasonIndex = (s: Season) => SEASONS.indexOf(s);
const zeros = () => new Array<number>(S).fill(0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round = (x: number, places = 4) => Number(x.toFixed(places));

function done(name: string): { fetchedAt: string; rows?: number } {
	const marker = join(RAW, name, 'done.json');
	if (!existsSync(marker)) throw new Error(`${name} not downloaded; run npm run fetch`);
	return JSON.parse(readFileSync(marker, 'utf8'));
}

// A usable BBL is 10 digits: borough 1–5, a non-zero block, then the lot.
const isValidBbl = (bbl: string) => /^[1-5]\d{9}$/.test(bbl) && bbl.slice(1, 6) !== '00000';

// ---- 1. Complaints ---------------------------------------------------------

interface Row extends Complaint {
	season: Season | null;
	area: Area | null;
	day: string; // YYYY-MM-DD, NYC local
}

const rows: Row[] = [];
const seen = new Set<string>();
const complaintsFetched: string[] = [];
const textCounts = new Map<string, Partial<Record<Season, number>>>();

for (const season of SEASONS) {
	complaintsFetched.push(done(season).fetchedAt);
	for (const { text, n } of JSON.parse(readFileSync(join(RAW, season, 'texts.json'), 'utf8'))) {
		const key = text ?? '';
		textCounts.set(key, { ...textCounts.get(key), [season]: n });
	}
	for (const { file, row } of readCsvDir(join(RAW, season))) {
		if (seen.has(row.unique_key)) continue;
		seen.add(row.unique_key);
		rows.push({
			bbl: row.bbl.trim(),
			created: row.created_date,
			closed: row.closed_date || null,
			category: file.replace(/-\d+\.csv$/, '') as Category,
			season: seasonOf(row.created_date),
			area: BOROUGHS[row.borough] ?? null,
			day: row.created_date.slice(0, 10)
		});
	}
}
seen.clear();

const measured = rows.filter((r) => r.season !== null);
console.log(`complaints: ${rows.length} downloaded, ${measured.length} in heat season`);

// ---- 2. Violations and court cases, by building and season ----------------

const heatViolations = new Map<string, number[]>(); // bbl → count per season
const hotWaterViolations = new Map<string, number[]>();
const cases = new Map<string, number[]>();
const violationTotals = { heat: zeros(), hot_water: zeros(), noBbl: 0, outOfSeason: 0 };
const caseTotals = { opened: zeros(), noBbl: 0, outOfSeason: 0 };

const bump = (map: Map<string, number[]>, bbl: string, i: number) => {
	const list = map.get(bbl) ?? zeros();
	list[i]++;
	map.set(bbl, list);
};

for (const { row } of readCsvDir(join(RAW, 'violations'))) {
	const season = seasonOf(row.inspectiondate);
	const kind = violationKind(row.ordernumber);
	if (!season || !kind) {
		violationTotals.outOfSeason++;
		continue;
	}
	violationTotals[kind][seasonIndex(season)]++;
	if (!isValidBbl(row.bbl)) {
		violationTotals.noBbl++;
		continue;
	}
	bump(kind === 'heat' ? heatViolations : hotWaterViolations, row.bbl, seasonIndex(season));
}

for (const { row } of readCsvDir(join(RAW, 'litigation'))) {
	const season = seasonOf(row.caseopendate);
	if (!season) {
		caseTotals.outOfSeason++;
		continue;
	}
	caseTotals.opened[seasonIndex(season)]++;
	if (!isValidBbl(row.bbl)) {
		caseTotals.noBbl++;
		continue;
	}
	bump(cases, row.bbl, seasonIndex(season));
}

// ---- 3. Tax lots (PLUTO) and neighborhoods --------------------------------

interface Neighborhood {
	id: string;
	name: string;
	boro: string;
	residential: boolean; // false for parks, airports, cemeteries
	apartments: number;
	buildings: number;
}

const tractToNta = new Map<string, string>();
const neighborhoods = new Map<string, Neighborhood>();
for (const t of JSON.parse(readFileSync(join(RAW, 'geo', 'tract-nta.json'), 'utf8'))) {
	tractToNta.set(t.boroct2020, t.ntacode);
	if (!neighborhoods.has(t.ntacode)) {
		neighborhoods.set(t.ntacode, {
			id: t.ntacode,
			name: t.ntaname,
			boro: t.boroname,
			residential: t.ntatype === '0',
			apartments: 0,
			buildings: 0
		});
	}
}

interface Lot {
	units: number;
	band: SizeBand;
	apartment: boolean; // 3+ homes and not public housing: the base for rates
	publicHousing: boolean;
	year: number;
	numBuildings: number;
	address: string;
	zip: string;
	nta: string | null;
}

// Keep only lots some record points at; tally the rest straight into totals.
const wanted = new Set<string>();
for (const r of rows) if (isValidBbl(r.bbl)) wanted.add(r.bbl);
for (const map of [heatViolations, hotWaterViolations, cases]) for (const bbl of map.keys()) wanted.add(bbl);

const lots = new Map<string, Lot>();
const city = {
	lots: 0,
	units: 0,
	apartmentBuildings: 0,
	apartments: 0,
	publicHousingLots: 0,
	publicHousingUnits: 0,
	byBand: Object.fromEntries(SIZE_BANDS.map((b) => [b, { buildings: 0, units: 0 }])) as Record<
		SizeBand,
		{ buildings: number; units: number }
	>
};
let plutoVersion = '';

for (const { row } of readCsvDir(join(RAW, 'pluto'))) {
	const bbl = row.bbl.split('.')[0];
	const units = Number(row.unitsres);
	const publicHousing = isPublicHousing(row.ownername);
	const apartment = isApartmentBuilding(units) && !publicHousing;
	const nta = tractToNta.get(row.bct2020) ?? null;
	plutoVersion ||= row.version;

	city.lots++;
	city.units += units;
	if (publicHousing) {
		city.publicHousingLots++;
		city.publicHousingUnits += units;
	} else {
		city.byBand[sizeBand(units)].buildings++;
		city.byBand[sizeBand(units)].units += units;
	}
	if (apartment) {
		city.apartmentBuildings++;
		city.apartments += units;
		const n = nta ? neighborhoods.get(nta) : undefined;
		if (n) {
			n.apartments += units;
			n.buildings++;
		}
	}
	// Kept for the building lookup: every apartment building, plus any other lot
	// that a complaint, violation or court case points at.
	if (wanted.has(bbl) || apartment) {
		lots.set(bbl, {
			units,
			band: sizeBand(units),
			apartment,
			publicHousing,
			year: Number(row.yearbuilt) || 0,
			numBuildings: Number(row.numbldgs) || 1,
			address: titleCase(row.address),
			zip: row.zipcode,
			nta
		});
	}
}
console.log(`pluto ${plutoVersion}: ${city.lots} residential lots, ${city.apartmentBuildings} apartment buildings`);

// ---- 4. How complaints were closed, by borough and season -----------------

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

// ---- 5. Daily complaints and the weather ----------------------------------

const temps = new Map<string, { tmax: number; tmin: number }>();
for (const d of JSON.parse(readFileSync(join(RAW, 'weather', 'central-park.json'), 'utf8'))) {
	temps.set(d.DATE, { tmax: Number(d.TMAX), tmin: Number(d.TMIN) });
}

const perDay = new Map<string, number>();
for (const r of measured) perDay.set(r.day, (perDay.get(r.day) ?? 0) + 1);

const LOW_BUCKETS = [
	{ label: '20°F or colder', max: 20 },
	{ label: '21–32°F', max: 32 },
	{ label: '33–40°F', max: 40 },
	{ label: '41–50°F', max: 50 },
	{ label: 'Above 50°F', max: Infinity }
];
const buckets = LOW_BUCKETS.map((b) => ({ label: b.label, days: 0, complaints: 0 }));
const freezing = { days: 0, complaints: 0 };
const aboveFreezing = { days: 0, complaints: 0 };
let peak = { date: '', complaints: 0, tmin: 0, tmax: 0 };

const weather = SEASONS.map((season) => {
	const dates = seasonDates(season);
	let hdd = 0;
	let freezingDays = 0;
	const days = dates.map((date) => {
		const t = temps.get(date);
		if (!t) throw new Error(`no temperature for ${date}`);
		const n = perDay.get(date) ?? 0;
		hdd += heatingDegreeDays(t.tmax, t.tmin);
		const bucket = buckets[LOW_BUCKETS.findIndex((b) => t.tmin <= b.max)];
		bucket.days++;
		bucket.complaints += n;
		const side = t.tmin <= 32 ? freezing : aboveFreezing;
		side.days++;
		side.complaints += n;
		if (t.tmin <= 32) freezingDays++;
		if (n > peak.complaints) peak = { date, complaints: n, tmin: t.tmin, tmax: t.tmax };
		return [n, t.tmin, t.tmax];
	});
	const complaints = sum(days.map((d) => d[0]));
	return {
		season,
		start: dates[0],
		days, // [complaints, low °F, high °F] for each day from `start`
		complaints,
		hdd: Math.round(hdd),
		freezingDays,
		complaintsPerHdd: round(complaints / hdd, 1)
	};
});

// The two seasons closest in cold: the fairest like-for-like comparison.
// Only reported if they are within half a percent of each other.
let closestPair: { earlier: Season; later: Season; hdd: number[]; increase: number } | null = null;
let smallestGap = Infinity;
for (let a = 0; a < weather.length; a++) {
	for (let b = a + 1; b < weather.length; b++) {
		const gap = Math.abs(weather[a].hdd - weather[b].hdd) / weather[a].hdd;
		if (gap < smallestGap && gap <= 0.005) {
			smallestGap = gap;
			closestPair = {
				earlier: weather[a].season,
				later: weather[b].season,
				hdd: [weather[a].hdd, weather[b].hdd],
				increase: round(weather[b].complaints / weather[a].complaints - 1)
			};
		}
	}
}

// How complaints were filed, by season (from a summary query, see fetch-context.ts).
const CHANNELS = ['PHONE', 'ONLINE', 'MOBILE'] as const;
const channelCounts = SEASONS.map(() => ({ PHONE: 0, ONLINE: 0, MOBILE: 0, other: 0, total: 0 }));
for (const r of JSON.parse(readFileSync(join(RAW, 'channels', 'by-month.json'), 'utf8'))) {
	const season = seasonOf(r.month);
	if (!season) continue;
	const cell = channelCounts[seasonIndex(season)];
	const key = (CHANNELS as readonly string[]).includes(r.channel) ? (r.channel as (typeof CHANNELS)[number]) : 'other';
	cell[key] += Number(r.n);
	cell.total += Number(r.n);
}
const channels = SEASONS.map((season, i) => {
	const c = channelCounts[i];
	// The summary was downloaded separately; it should agree with the row downloads.
	if (c.total !== outcomes.Citywide[season].total) {
		console.warn(`channels: ${season} has ${c.total} complaints, rows have ${outcomes.Citywide[season].total}`);
	}
	return {
		season,
		phone: round(c.PHONE / c.total),
		online: round(c.ONLINE / c.total),
		mobile: round(c.MOBILE / c.total),
		other: round(c.other / c.total)
	};
});

// ---- 6. Buildings: one record per tax lot with a complaint -----------------

interface Building {
	c: number[]; // complaints per season
	nd: number[]; // non-duplicate complaints
	sf: number[]; // closed as "someone said it was fixed"
	v: number[]; // closed with a violation
	days: Set<string>[]; // distinct days with a complaint
	d: number[]; // ...as counts
}
const buildings = new Map<string, Building>();
let noValidBbl = 0;
let notInPluto = 0;

for (const r of measured) {
	if (!isValidBbl(r.bbl)) {
		noValidBbl++;
		continue;
	}
	if (!lots.has(r.bbl)) notInPluto++;
	let b = buildings.get(r.bbl);
	if (!b) {
		b = { c: zeros(), nd: zeros(), sf: zeros(), v: zeros(), days: SEASONS.map(() => new Set()), d: zeros() };
		buildings.set(r.bbl, b);
	}
	const i = seasonIndex(r.season as Season);
	b.c[i]++;
	if (r.category !== 'duplicate') b.nd[i]++;
	if (r.category === 'said_fixed') b.sf[i]++;
	if (r.category === 'violation') b.v[i]++;
	b.days[i].add(r.day);
}
for (const b of buildings.values()) b.d = b.days.map((set) => set.size);

// Apartment buildings only (3+ homes, not public housing) from here on.
const apartmentBuildings = [...buildings.entries()].filter(([bbl]) => lots.get(bbl)?.apartment);
const hasViolation = (bbl: string, i: number) =>
	(heatViolations.get(bbl)?.[i] ?? 0) + (hotWaterViolations.get(bbl)?.[i] ?? 0) > 0;

const complaintsBySize = Object.fromEntries(SIZE_BANDS.map((b) => [b, 0])) as Record<SizeBand, number>;
let complaintsInApartmentBuildings = 0;
let complaintsInPublicHousing = 0;
for (const [bbl, b] of buildings) {
	const lot = lots.get(bbl);
	if (!lot) continue;
	const n = sum(b.c);
	if (lot.publicHousing) complaintsInPublicHousing += n;
	else complaintsBySize[lot.band] += n;
	if (lot.apartment) complaintsInApartmentBuildings += n;
}

const buildingSeasons = SEASONS.map((season, i) => {
	const active = apartmentBuildings.filter(([, b]) => b.c[i] > 0);
	const counts = active.map(([, b]) => b.c[i]);
	const heavy = active.filter(([, b]) => b.d[i] >= HEAVY_DAYS);
	const top1Count = Math.ceil(city.apartmentBuildings * 0.01);
	const top1 = [...active].sort((a, b) => b[1].c[i] - a[1].c[i]).slice(0, top1Count);
	return {
		season,
		complaints: sum(counts),
		withComplaint: active.length,
		shareWithComplaint: round(active.length / city.apartmentBuildings),
		// Share of the season's complaints from the top 1% / 10% of ALL apartment buildings.
		top1Share: round(topShare(counts, 0.01, city.apartmentBuildings)),
		top10Share: round(topShare(counts, 0.1, city.apartmentBuildings)),
		top1Buildings: top1Count,
		// ...and the share of the city's apartments those same buildings hold.
		top1ApartmentShare: round(sum(top1.map(([bbl]) => lots.get(bbl)!.units)) / city.apartments),
		top10ApartmentShare: round(
			sum(
				[...active]
					.sort((a, b) => b[1].c[i] - a[1].c[i])
					.slice(0, Math.ceil(city.apartmentBuildings * 0.1))
					.map(([bbl]) => lots.get(bbl)!.units)
			) / city.apartments
		),
		top1MedianUnits: top1.map(([bbl]) => lots.get(bbl)!.units).sort((a, b) => a - b)[Math.floor(top1.length / 2)],
		withViolation: active.filter(([bbl]) => hasViolation(bbl, i)).length,
		heavy: {
			buildings: heavy.length,
			apartments: sum(heavy.map(([bbl]) => lots.get(bbl)!.units)),
			complaints: sum(heavy.map(([, b]) => b.c[i])),
			withViolation: heavy.filter(([bbl]) => hasViolation(bbl, i)).length,
			withCase: heavy.filter(([bbl]) => (cases.get(bbl)?.[i] ?? 0) > 0).length
		}
	};
});

// Buildings with complaints on REPEAT_DAYS+ days in k or more of the six seasons.
const repeatSeasons = apartmentBuildings.map(([, b]) => b.d.filter((d) => d >= REPEAT_DAYS).length);
const repeat = Object.fromEntries(
	Array.from({ length: S }, (_, k) => [k + 1, repeatSeasons.filter((n) => n >= k + 1).length])
);
const everySeason = apartmentBuildings.filter(([, b]) => b.d.every((d) => d >= REPEAT_DAYS));
const repeatEverySeason = {
	buildings: everySeason.length,
	apartments: sum(everySeason.map(([bbl]) => lots.get(bbl)!.units)),
	complaints: sum(everySeason.map(([, b]) => sum(b.c))),
	withViolationAnySeason: everySeason.filter(([bbl]) => SEASONS.some((_, i) => hasViolation(bbl, i))).length,
	withCaseAnySeason: everySeason.filter(([bbl]) => sum(cases.get(bbl) ?? []) > 0).length
};

// ---- 7. Did complaints come back within 7 days, by building size? ---------

const withBbl = rows.filter((r) => isValidBbl(r.bbl));
const closings = findClosings(
	withBbl.filter((r) => r.season !== null),
	withBbl
);

const RETURN_CATEGORIES = ['said_fixed', 'violation', 'no_violation', 'no_access', 'not_stated'] as const;
type Return = { closings: number; cameBack: number };
const emptyReturns = () =>
	Object.fromEntries(RETURN_CATEGORIES.map((c) => [c, { closings: 0, cameBack: 0 }])) as Record<
		(typeof RETURN_CATEGORIES)[number],
		Return
	>;
const returnsBySize = Object.fromEntries(SIZE_BANDS.map((b) => [b, emptyReturns()])) as Record<
	SizeBand,
	ReturnType<typeof emptyReturns>
>;
const returnsOverall = emptyReturns();
const returnsBySeason = SEASONS.map(() => emptyReturns());

for (const c of closings) {
	if (!(RETURN_CATEGORIES as readonly string[]).includes(c.category)) continue;
	const category = c.category as (typeof RETURN_CATEGORIES)[number];
	const cells = [returnsOverall[category], returnsBySeason[seasonIndex(seasonOf(c.created) as Season)][category]];
	const lot = lots.get(c.bbl);
	if (lot && !lot.publicHousing) cells.push(returnsBySize[lot.band][category]);
	for (const cell of cells) {
		cell.closings++;
		if (c.cameBack) cell.cameBack++;
	}
}

// ---- 8. Neighborhoods ------------------------------------------------------

const hoodStats = new Map<
	string,
	{ c: number[]; nd: number[]; sf: number[]; v: number[]; b: number[]; hv: number[] }
>();
let noNeighborhood = 0;
for (const [bbl, b] of apartmentBuildings) {
	const nta = lots.get(bbl)!.nta;
	if (!nta) {
		noNeighborhood += sum(b.c);
		continue;
	}
	let h = hoodStats.get(nta);
	if (!h) {
		h = { c: zeros(), nd: zeros(), sf: zeros(), v: zeros(), b: zeros(), hv: zeros() };
		hoodStats.set(nta, h);
	}
	for (let i = 0; i < S; i++) {
		h.c[i] += b.c[i];
		h.nd[i] += b.nd[i];
		h.sf[i] += b.sf[i];
		h.v[i] += b.v[i];
		if (b.c[i] > 0) h.b[i]++;
	}
}
// HPD violations (the agency's own records), for apartment buildings.
for (const map of [heatViolations, hotWaterViolations]) {
	for (const [bbl, counts] of map) {
		const lot = lots.get(bbl);
		const h = lot?.apartment && lot.nta ? hoodStats.get(lot.nta) : undefined;
		if (h) for (let i = 0; i < S; i++) h.hv[i] += counts[i];
	}
}

const hoodList = [...neighborhoods.values()]
	.map((n) => {
		const h = hoodStats.get(n.id);
		const rated = n.residential && n.apartments >= MIN_APARTMENTS;
		return {
			id: n.id,
			name: n.name,
			boro: n.boro,
			rated,
			apartments: n.apartments,
			buildings: n.buildings,
			c: h?.c ?? zeros(),
			nd: h?.nd ?? zeros(),
			sf: h?.sf ?? zeros(),
			v: h?.v ?? zeros(),
			b: h?.b ?? zeros(),
			hv: h?.hv ?? zeros(),
			// Complaints per 1,000 apartments, per season.
			rate: rated ? (h?.c ?? zeros()).map((c) => round((c / n.apartments) * 1000, 1)) : null
		};
	})
	.sort((a, b) => a.name.localeCompare(b.name));

const cityRate = buildingSeasons.map((s) => round((s.complaints / city.apartments) * 1000, 1));

// ---- 9. Building lookup, one file per ZIP code -----------------------------

// As many buildings as possible: every apartment building (three or more homes)
// whether or not it had a complaint, plus any smaller home or public housing lot
// with a complaint, a violation or a court case on record.
rmSync(LOOKUP, { recursive: true, force: true });
mkdirSync(LOOKUP, { recursive: true });
const byZip = new Map<string, { row: unknown[]; days: number }[]>();
let lookupActive = 0;
for (const [bbl, lot] of lots) {
	if (!/^\d{5}$/.test(lot.zip) || !lot.address) continue;
	const b = buildings.get(bbl);
	const violations = SEASONS.map(
		(_, i) => (heatViolations.get(bbl)?.[i] ?? 0) + (hotWaterViolations.get(bbl)?.[i] ?? 0)
	);
	const courtCases = cases.get(bbl) ?? zeros();
	const active = !!b || sum(violations) > 0 || sum(courtCases) > 0;
	if (!active && !lot.apartment) continue;

	// Compact row: address, homes, year built, buildings on the lot. Lots with
	// anything on record add per-season complaints, complaint-days, HPD heat and
	// hot water violations, and HPD court cases; a final 1 marks public housing.
	const row: unknown[] = [lot.address, lot.units, lot.year, lot.numBuildings];
	if (active) {
		row.push(b?.c ?? zeros(), b?.d ?? zeros(), violations, courtCases);
		if (lot.publicHousing) row.push(1);
		lookupActive++;
	}
	const list = byZip.get(lot.zip) ?? [];
	list.push({ row, days: sum(b?.d ?? []) });
	byZip.set(lot.zip, list);
}
const zipIndex: { zip: string; buildings: number }[] = [];
let lookupBytes = 0;
for (const [zip, list] of [...byZip.entries()].sort()) {
	list.sort(
		(a, b) => b.days - a.days || String(a.row[0]).localeCompare(String(b.row[0]), 'en', { numeric: true })
	);
	const body = JSON.stringify({ zip, seasons: SEASONS, buildings: list.map((l) => l.row) });
	writeFileSync(join(LOOKUP, `${zip}.json`), body);
	lookupBytes += body.length;
	zipIndex.push({ zip, buildings: list.length });
}

// ---- 10. Numbers quoted in the article -------------------------------------

const cw = outcomes.Citywide;
const all = SEASONS.reduce((acc, s) => {
	for (const k of Object.keys(acc) as (keyof Tally)[]) acc[k] += cw[s][k];
	return acc;
}, emptyTally());
const shares = (t: Tally) => {
	const base = t.total - t.duplicate;
	return Object.fromEntries(
		CATEGORIES.filter((c) => c !== 'duplicate').map((c) => [c, round(t[c] / base)])
	) as Record<Exclude<Category, 'duplicate'>, number>;
};
const first = SEASONS[0];
const last = SEASONS[S - 1];
const rate = (r: Return) => round(r.cameBack / r.closings);
const ratedHoods = hoodList.filter((h) => h.rate);
const byLatestRate = [...ratedHoods].sort((a, b) => b.rate![S - 1] - a.rate![S - 1]);

const story = {
	seasons: SEASONS,
	first,
	last,
	complaints: {
		total: all.total,
		duplicates: all.duplicate,
		nonDuplicate: all.total - all.duplicate,
		bySeason: SEASONS.map((s) => cw[s].total),
		nonDuplicateBySeason: SEASONS.map((s) => cw[s].total - cw[s].duplicate),
		growth: round(cw[last].total / cw[first].total, 2)
	},
	outcomesAllSeasons: shares(all),
	outcomesBySeason: SEASONS.map((s) => shares(cw[s])),
	outcomesLatestByBorough: Object.fromEntries(
		AREAS.filter((a) => a !== 'Citywide').map((a) => [a, shares(outcomes[a][last])])
	),
	weather: {
		hddBase: HDD_BASE,
		seasons: weather.map(({ season, complaints, hdd, freezingDays, complaintsPerHdd }) => ({
			season,
			complaints,
			hdd,
			freezingDays,
			complaintsPerHdd
		})),
		freezingDayAverage: Math.round(freezing.complaints / freezing.days),
		otherDayAverage: Math.round(aboveFreezing.complaints / aboveFreezing.days),
		freezingDays: freezing.days,
		otherDays: aboveFreezing.days,
		byLow: buckets.map((b) => ({ ...b, average: Math.round(b.complaints / b.days) })),
		closestPair,
		peak
	},
	channels,
	apartments: {
		buildings: city.apartmentBuildings,
		homes: city.apartments,
		shareOfComplaints: round(complaintsInApartmentBuildings / (measured.length - noValidBbl - notInPluto)),
		complaintsInPublicHousing
	},
	neighborhoods: {
		rated: ratedHoods.length,
		minApartments: MIN_APARTMENTS,
		cityRate,
		highest: byLatestRate.slice(0, 5).map((h) => ({ name: h.name, boro: h.boro, rate: h.rate![S - 1] })),
		lowest: byLatestRate.slice(-5).map((h) => ({ name: h.name, boro: h.boro, rate: h.rate![S - 1] })),
		aboveDoubleCity: byLatestRate.filter((h) => h.rate![S - 1] >= 2 * cityRate[S - 1]).length
	},
	buildings: {
		seasons: buildingSeasons,
		heavyDays: HEAVY_DAYS,
		repeatDays: REPEAT_DAYS,
		repeat,
		repeatEverySeason
	},
	enforcement: {
		heatViolations: violationTotals.heat,
		hotWaterViolations: violationTotals.hot_water,
		casesOpened: caseTotals.opened
	},
	returns: {
		windowDays: WINDOW_DAYS,
		overall: Object.fromEntries(RETURN_CATEGORIES.map((c) => [c, rate(returnsOverall[c])])),
		latest: Object.fromEntries(RETURN_CATEGORIES.map((c) => [c, rate(returnsBySeason[S - 1][c])])),
		bySize: SIZE_BANDS.map((band) => ({
			band,
			...Object.fromEntries(
				RETURN_CATEGORIES.map((c) => [c, { rate: rate(returnsBySize[band][c]), closings: returnsBySize[band][c].closings }])
			)
		}))
	}
};

// ---- 11. Write -------------------------------------------------------------

const nonDuplicateWithBbl = withBbl.filter((r) => r.season !== null && r.category !== 'duplicate').length;
const meta = {
	fetchedAt: {
		complaints: complaintsFetched.sort()[0],
		pluto: done('pluto').fetchedAt,
		violations: done('violations').fetchedAt,
		litigation: done('litigation').fetchedAt,
		weather: done('weather').fetchedAt,
		channels: done('channels').fetchedAt,
		geo: done('geo').fetchedAt
	},
	plutoVersion,
	closingTexts: textCounts.size,
	windowDays: WINDOW_DAYS,
	seasons: SEASONS,
	rows: {
		downloaded: rows.length,
		inSeason: measured.length,
		unspecifiedBorough,
		noValidBbl,
		notInPluto,
		inApartmentBuildings: complaintsInApartmentBuildings,
		inPublicHousing: complaintsInPublicHousing,
		noNeighborhood,
		nonDuplicateWithBbl,
		closingsChecked: closings.length,
		skippedOpenOrBadDates: nonDuplicateWithBbl - closings.length
	},
	violations: { ...violationTotals, rows: done('violations').rows },
	cases: { ...caseTotals, rows: done('litigation').rows },
	city: { ...city, complaintsBySize },
	lookup: {
		zips: zipIndex.length,
		buildings: sum(zipIndex.map((z) => z.buildings)),
		withRecords: lookupActive,
		bytes: lookupBytes
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
const write = (path: string, data: unknown, pretty = true) =>
	writeFileSync(path, JSON.stringify(data, null, pretty ? '\t' : undefined) + '\n');
write(join(OUT, 'outcomes.json'), { areas: AREAS, seasons: SEASONS, outcomes });
write(join(OUT, 'weather.json'), { seasons: weather }, false);
write(join(OUT, 'neighborhoods.json'), { seasons: SEASONS, cityRate, areas: hoodList }, false);
write(join(OUT, 'zips.json'), zipIndex, false);
write(join(OUT, 'story.json'), story);
write(join(OUT, 'meta.json'), meta);
write('data/resolution-categories.json', categoryTable);
for (const stale of ['came-back.json', 'buildings.json']) rmSync(join(OUT, stale), { force: true });

console.log(JSON.stringify({ rows: meta.rows, lookup: meta.lookup }, null, 2));
