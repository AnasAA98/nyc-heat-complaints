// Draws the preview image that shows up when the link is shared (static/og.png,
// 1200 × 630). The numbers and the chart come from the same generated data as
// the page. Needs Google Chrome; set CHROME to its path if it is not in the
// usual place.
//
//   npm run og

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import story from '../src/lib/data/story.json' with { type: 'json' };
import weather from '../src/lib/data/weather.json' with { type: 'json' };
import { AUTHOR, TITLE } from '../src/lib/config';

const W = 1200;
const H = 630;
const OUT = 'static/og.png';

const CHROME =
	process.env.CHROME ??
	[
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser'
	].find(existsSync);
if (!CHROME) throw new Error('Google Chrome not found; set CHROME to its path');

// Every day of six heat seasons as one strip, the same chart as the top of the page.
const CHART = { x: 72, y: 436, w: W - 144, h: 124, gap: 10 };
const seasons = weather.seasons;
const totalDays = seasons.reduce((n, s) => n + s.days.length, 0);
const pitch = (CHART.w - CHART.gap * (seasons.length - 1)) / totalDays;
const max = Math.max(...seasons.flatMap((s) => s.days.map((d) => d[0])));
let x = CHART.x;
const bars = seasons
	.map((s) => {
		const path = s.days
			.map((d, i) => {
				const h = (d[0] / max) * CHART.h;
				return `M${(x + i * pitch).toFixed(2)} ${CHART.y + CHART.h}v${-h.toFixed(2)}h${pitch.toFixed(2)}v${h.toFixed(2)}z`;
			})
			.join('');
		x += s.days.length * pitch + CHART.gap;
		return path;
	})
	.join('');

const millions = (story.complaints.total / 1e6).toFixed(2).replace(/0$/, '');
const font = resolve('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');

const html = `<!doctype html>
<meta charset="utf-8">
<style>
	@font-face { font-family: Geist; src: url('file://${font}') format('woff2'); font-weight: 100 900; }
	html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
	body { background: #0d0d0d; color: #f0efec; font-family: Geist, sans-serif; position: relative; }
	.top { position: absolute; left: 72px; top: 60px; margin: 0; display: flex; align-items: center; gap: 12px;
		font-size: 22px; font-weight: 550; color: #9a9890; }
	.top i { width: 12px; height: 12px; border-radius: 50%; background: #3987e5; box-shadow: 0 0 0 5px #12223a; }
	h1 { position: absolute; left: 72px; top: 112px; width: 1060px; margin: 0; font-size: 90px; line-height: 1;
		font-weight: 660; letter-spacing: -0.045em; }
	.stat { position: absolute; left: 72px; top: 330px; margin: 0; font-size: 28px; font-weight: 500; color: #c3c2b7;
		letter-spacing: -0.01em; }
	.stat b { color: #f0efec; font-weight: 650; }
	svg { position: absolute; inset: 0; }
</style>
<p class="top"><i></i>New York City · Heat and hot water complaints to 311</p>
<h1>${TITLE}</h1>
<p class="stat"><b>${millions} million complaints</b> over six winters · by ${AUTHOR}</p>
<svg width="${W}" height="${H}"><path d="${bars}" fill="#3987e5"/></svg>`;

const dir = mkdtempSync(join(tmpdir(), 'og-'));
try {
	writeFileSync(join(dir, 'og.html'), html);
	execFileSync(CHROME, [
		'--headless',
		'--disable-gpu',
		'--hide-scrollbars',
		'--force-device-scale-factor=1',
		`--window-size=${W},${H}`,
		`--screenshot=${resolve(OUT)}`,
		`file://${join(dir, 'og.html')}`
	]);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
console.log(`wrote ${OUT} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB)`);
