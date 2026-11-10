// Downloads the datasets that put the 311 complaints in context. All are limited
// to New York City:
//
//   pluto        tax lots with homes: unit counts, year built, census tract
//   geo          neighborhood (NTA) boundaries and the tract → neighborhood table
//   violations   HPD heat and hot water violations (an inspector's finding)
//   litigation   heat and hot water cases HPD brought in housing court
//   too-hot      HPD violations whose text may describe an apartment that is too hot
//   weather      daily high and low at Central Park (NOAA)
//   channels     how complaints were filed (phone, online, mobile), by month
//
// Each step is cached in data/raw/<name>/; pass --refresh to download again.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HEAT_ORDERS, HOT_WATER_ORDERS } from '../src/lib/analysis/violations';
import { cached, count, downloadPaged, get, soql } from './lib/socrata';

const RAW = 'data/raw';
// Same window as the complaints: first season's Oct 1 through the last season's
// May 31, plus the 7 follow-up days.
const START = '2020-10-01';
const END = '2026-06-07';
const window = (field: string) => `${field} BETWEEN '${START}T00:00:00' AND '${END}T23:59:59'`;

async function pluto() {
	const dir = join(RAW, 'pluto');
	await cached(dir, 'pluto', async () => {
		const where = 'unitsres > 0';
		const rows = await downloadPaged({
			dataset: '64uk-42ks',
			dir,
			prefix: 'lots',
			fields:
				'bbl, address, zipcode, unitsres, yearbuilt, numbldgs, numfloors, bldgclass, ownername, ownertype, bct2020, latitude, longitude, version',
			where,
			orderBy: 'bbl',
			label: 'pluto'
		});
		const expected = await count('64uk-42ks', where);
		if (rows !== expected) throw new Error(`pluto: downloaded ${rows} rows, API reports ${expected}`);
		return { rows };
	});
}

async function geo() {
	const dir = join(RAW, 'geo');
	await cached(dir, 'geo', async () => {
		const boundaries = await soql('9nt8-h7nd', 'geojson', 'SELECT * LIMIT 1000');
		writeFileSync(join(dir, 'nta.geojson'), boundaries);
		const tracts = await soql(
			'hm78-6dwm',
			'json',
			'SELECT boroct2020, ntacode, ntaname, ntatype, boroname LIMIT 5000'
		);
		writeFileSync(join(dir, 'tract-nta.json'), tracts);
		return {
			neighborhoods: JSON.parse(boundaries).features.length,
			tracts: JSON.parse(tracts).length
		};
	});
}

async function violations() {
	const dir = join(RAW, 'violations');
	await cached(dir, 'violations', async () => {
		const orders = [...HEAT_ORDERS, ...HOT_WATER_ORDERS].map((o) => `'${o}'`).join(', ');
		const where = `ordernumber IN (${orders}) AND ${window('inspectiondate')}`;
		const rows = await downloadPaged({
			dataset: 'wvxf-dwi5',
			dir,
			prefix: 'violations',
			fields: 'violationid, bbl, inspectiondate, ordernumber, class, apartment, violationstatus',
			where,
			orderBy: 'violationid',
			label: 'violations'
		});
		const expected = await count('wvxf-dwi5', where);
		if (rows !== expected) throw new Error(`violations: downloaded ${rows}, API reports ${expected}`);
		return { rows };
	});
}

// The housing code has no violation for too much heat, so these are found by
// their wording. NYC Open Data's full-text search ($q) narrows 1.5 million rows
// of violation text to a few thousand candidates; build-data then applies the
// exact pattern (src/lib/analysis/tooHot.ts) and checks every match was read.
const TOO_HOT_SEARCHES = ['excessive', 'excessively', 'extreme', 'heat season', 'summer', 'summertime', 'summers', 'overheat', 'overheated', 'overheating'];
async function tooHot() {
	const dir = join(RAW, 'too-hot');
	await cached(dir, 'too-hot', async () => {
		const LIMIT = 50_000;
		const byId = new Map<string, Record<string, string>>();
		for (const term of TOO_HOT_SEARCHES) {
			const params = new URLSearchParams({
				$q: term,
				$where: window('inspectiondate'),
				$select: 'violationid, bbl, apartment, boro, inspectiondate, ordernumber, class, novdescription',
				$order: 'violationid',
				$limit: String(LIMIT)
			});
			const found = JSON.parse(await get(`https://data.cityofnewyork.us/resource/wvxf-dwi5.json?${params}`));
			if (found.length >= LIMIT) throw new Error(`too-hot: search "${term}" hit the ${LIMIT}-row limit`);
			for (const row of found) byId.set(row.violationid, row);
		}
		const rows = [...byId.values()].sort((a, b) => a.violationid.localeCompare(b.violationid));
		writeFileSync(join(dir, 'candidates.json'), JSON.stringify(rows));
		return { rows: rows.length, searches: TOO_HOT_SEARCHES };
	});
}

async function litigation() {
	const dir = join(RAW, 'litigation');
	await cached(dir, 'litigation', async () => {
		const where = `casetype IN ('Heat and Hot Water', 'Heat Supplemental Cases') AND ${window('caseopendate')}`;
		const rows = await downloadPaged({
			dataset: '59kj-x8nc',
			dir,
			prefix: 'cases',
			fields: 'litigationid, bbl, casetype, caseopendate, casestatus, casejudgement',
			where,
			orderBy: 'litigationid',
			label: 'litigation'
		});
		const expected = await count('59kj-x8nc', where);
		if (rows !== expected) throw new Error(`litigation: downloaded ${rows}, API reports ${expected}`);
		return { rows };
	});
}

async function weather() {
	const dir = join(RAW, 'weather');
	await cached(dir, 'weather', async () => {
		// NOAA's Central Park station, the city's weather record since 1869.
		const params = new URLSearchParams({
			dataset: 'daily-summaries',
			stations: 'USW00094728',
			startDate: START,
			endDate: END,
			dataTypes: 'TMAX,TMIN',
			units: 'standard',
			format: 'json'
		});
		const body = await get(`https://www.ncei.noaa.gov/access/services/data/v1?${params}`);
		const days = JSON.parse(body) as { DATE: string; TMAX?: string; TMIN?: string }[];
		const missing = days.filter((d) => d.TMAX === undefined || d.TMIN === undefined).length;
		writeFileSync(join(dir, 'central-park.json'), body);
		return { days: days.length, missing };
	});
}

// How each month's heat complaints reached 311. A small summary query, so the
// counts come straight from the API rather than from the row downloads.
async function channels() {
	const dir = join(RAW, 'channels');
	await cached(dir, 'channels', async () => {
		const body = await soql(
			'erm2-nwe9',
			'json',
			`SELECT date_trunc_ym(created_date) AS month, open_data_channel_type AS channel, count(*) AS n
			 WHERE complaint_type IN ('HEAT/HOT WATER', 'Heat/Hot Water') AND ${window('created_date')}
			 GROUP BY month, channel ORDER BY month LIMIT 5000`
		);
		writeFileSync(join(dir, 'by-month.json'), body);
		return { rows: JSON.parse(body).length };
	});
}

await Promise.all([pluto(), geo(), violations(), tooHot(), litigation(), weather(), channels()]);
