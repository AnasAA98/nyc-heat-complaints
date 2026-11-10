<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { area, line } from 'd3-shape';
	import { addDays } from '#lib/analysis/weather.ts';
	import { date, monthName, num, seasonLabel, tick } from '#lib/format.ts';
	import Figure from './Figure.svelte';
	import Segmented from './Segmented.svelte';

	interface WeatherSeason {
		season: string;
		start: string;
		days: number[][]; // [complaints, low °F, high °F] for each day from `start`
		complaints: number;
		hdd: number;
		freezingDays: number;
	}
	interface Props {
		seasons: WeatherSeason[];
	}
	let { seasons }: Props = $props();

	const FREEZING = 32;
	const MARGIN = { left: 40, right: 12 };
	// Two panels on one timeline, each with its own axis.
	const TEMP = { top: 22, height: 104 };
	const BARS = { top: TEMP.top + TEMP.height + 44, height: 196 };
	const HEIGHT = BARS.top + BARS.height + 30;

	// Fixed axes across seasons, so switching seasons compares like with like.
	const allDays = $derived(seasons.flatMap((s) => s.days));
	const maxComplaints = $derived(Math.ceil(Math.max(...allDays.map((d) => d[0])) / 1000) * 1000);
	const tempMin = $derived(Math.floor(Math.min(...allDays.map((d) => d[1])) / 10) * 10);
	const tempMax = $derived(Math.ceil(Math.max(...allDays.map((d) => d[2])) / 10) * 10);
	const COMPLAINT_STEP = 2000;
	const complaintTicks = $derived(
		Array.from({ length: Math.floor(maxComplaints / COMPLAINT_STEP) + 1 }, (_, i) => i * COMPLAINT_STEP)
	);
	const tempTicks = $derived([tempMin, FREEZING, 60, tempMax].filter((t, i, a) => a.indexOf(t) === i));

	// svelte-ignore state_referenced_locally (the latest season is only the starting value)
	let selected = $state(seasons.at(-1)!.season);
	let width = $state(900);
	let hover = $state<number | null>(null);

	const current = $derived(seasons.find((s) => s.season === selected)!);
	const days = $derived(current.days);
	const pitch = $derived((width - MARGIN.left - MARGIN.right) / days.length);
	const xAt = (i: number) => MARGIN.left + (i + 0.5) * pitch;
	const temp = $derived(scaleLinear([tempMin, tempMax], [TEMP.top + TEMP.height, TEMP.top]));
	const count = $derived(scaleLinear([0, maxComplaints], [BARS.top + BARS.height, BARS.top]));

	const rangePath = $derived(
		area<number[]>()
			.x((_, i) => xAt(i))
			.y0((d) => temp(d[1]))
			.y1((d) => temp(d[2]))(days)
	);
	const lowPath = $derived(
		line<number[]>()
			.x((_, i) => xAt(i))
			.y((d) => temp(d[1]))(days)
	);
	const dateAt = (i: number) => addDays(current.start, i);
	const months = $derived(
		days.flatMap((_, i) => (dateAt(i).endsWith('-01') ? [{ i, month: Number(dateAt(i).slice(5, 7)) - 1 }] : []))
	);
	const peak = $derived(days.reduce((best, d, i) => (d[0] > days[best][0] ? i : best), 0));
	const barWidth = $derived(Math.max(1, pitch - (pitch >= 3 ? 1 : 0)));

	const monthly = $derived(
		months.map(({ i, month }, k) => {
			const slice = days.slice(i, months[k + 1]?.i ?? days.length);
			return {
				month: monthName(month),
				days: slice.length,
				complaints: slice.reduce((a, d) => a + d[0], 0),
				avgLow: slice.reduce((a, d) => a + d[1], 0) / slice.length,
				coldest: Math.min(...slice.map((d) => d[1])),
				freezing: slice.filter((d) => d[1] <= FREEZING).length
			};
		})
	);

	function indexAt(e: PointerEvent) {
		const box = (e.currentTarget as Element).getBoundingClientRect();
		const i = Math.floor((e.clientX - box.left - MARGIN.left) / pitch);
		return Math.max(0, Math.min(days.length - 1, i));
	}
	// The chart doubles as a slider over the season's days, so it works from a keyboard.
	function onkeydown(e: KeyboardEvent) {
		const at = hover ?? peak;
		const next = { ArrowLeft: at - 1, ArrowRight: at + 1, PageUp: at + 7, PageDown: at - 7, Home: 0, End: days.length - 1 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		hover = Math.max(0, Math.min(days.length - 1, next));
	}
	const describe = (i: number) =>
		`${date(dateAt(i), { weekday: true })}: ${num(days[i][0])} complaints, low ${days[i][1]}°F, high ${days[i][2]}°F`;
</script>

<Figure
	title="Complaints rise when the temperature drops"
	subtitle="Each day of the heat season: the low and high temperature in Central Park, and the number of heat and hot water complaints made to 311."
	source="NYC Open Data, 311 Service Requests; National Oceanic and Atmospheric Administration, Central Park weather station."
	tableLabel="Show monthly numbers"
	id="cold"
>
	{#snippet controls()}
		<div class="control-row">
			<Segmented label="Heat season" options={seasons.map((s) => s.season)} bind:value={selected} format={seasonLabel} />
			<p class="summary">
				<strong>{num(current.complaints)}</strong> complaints ·
				<strong>{current.freezingDays}</strong> days at or below freezing
			</p>
		</div>
	{/snippet}

	<div
		class="chart"
		bind:clientWidth={width}
		role="slider"
		tabindex="0"
		aria-label="Day of the {seasonLabel(selected)} heat season. Use the arrow keys to read each day."
		aria-valuemin={0}
		aria-valuemax={days.length - 1}
		aria-valuenow={hover ?? peak}
		aria-valuetext={describe(hover ?? peak)}
		{onkeydown}
		onblur={() => (hover = null)}
	>
		<svg
			{width}
			height={HEIGHT}
			aria-hidden="true"
			onpointermove={(e) => (hover = indexAt(e))}
			onpointerleave={() => (hover = null)}
		>
			<!-- Temperature panel -->
			<text class="panel-title" x="0" y="11">Daily low and high in Central Park</text>
			{#each tempTicks as t (t)}
				<line class="grid" class:freezing={t === FREEZING} x1={MARGIN.left} x2={width - MARGIN.right} y1={temp(t)} y2={temp(t)} />
				<text class="axis-text" x={MARGIN.left - 8} y={temp(t)} dy="0.32em" text-anchor="end">{t}°</text>
			{/each}
			<path class="range" d={rangePath} />
			<path class="low" d={lowPath} />
			<text class="ref-label" x={MARGIN.left + 6} y={temp(FREEZING) + 13}>Freezing</text>

			<!-- Complaints panel -->
			<text class="panel-title" x="0" y={BARS.top - 14}>Heat complaints per day</text>
			{#each complaintTicks as t (t)}
				<line class="grid" class:base={t === 0} x1={MARGIN.left} x2={width - MARGIN.right} y1={count(t)} y2={count(t)} />
				<text class="axis-text" x={MARGIN.left - 8} y={count(t)} dy="0.32em" text-anchor="end">{tick(t)}</text>
			{/each}
			{#each days as d, i (i)}
				<rect
					class="bar"
					class:on={hover === i}
					x={xAt(i) - barWidth / 2}
					y={count(d[0])}
					width={barWidth}
					height={count(0) - count(d[0])}
				/>
			{/each}

			<!-- The season's busiest day, labeled directly -->
			<text
				class="peak-label"
				x={xAt(peak) + (xAt(peak) > width * 0.72 ? -8 : 8)}
				y={Math.max(BARS.top + 10, count(days[peak][0]) + 4)}
				text-anchor={xAt(peak) > width * 0.72 ? 'end' : 'start'}
			>
				{date(dateAt(peak), { year: false })}: {num(days[peak][0])}
			</text>

			<!-- Months -->
			{#each months as m (m.i)}
				<line class="month-tick" x1={xAt(m.i) - pitch / 2} x2={xAt(m.i) - pitch / 2} y1={count(0)} y2={count(0) + 5} />
				<text class="axis-text" x={xAt(m.i) - pitch / 2 + 4} y={count(0) + 18}>
					{monthName(m.month)}{m.month === 0 && pitch * 31 > 72 ? ` ${dateAt(m.i).slice(0, 4)}` : ''}
				</text>
			{/each}

			{#if hover !== null}
				<line class="crosshair" x1={xAt(hover)} x2={xAt(hover)} y1={TEMP.top} y2={count(0)} />
				<circle class="marker" cx={xAt(hover)} cy={temp(days[hover][1])} r="4" />
			{/if}
		</svg>

		{#if hover !== null}
			{@const d = days[hover]}
			<div class="tip" class:flip={xAt(hover) > width * 0.6} style:left="{xAt(hover)}px" style:top="{BARS.top - 6}px">
				<span class="tip-head">{date(dateAt(hover), { weekday: true })}</span>
				<strong>{num(d[0])} complaints</strong>
				Low {d[1]}°F · High {d[2]}°F
			</div>
		{/if}
	</div>

	{#snippet table()}
		<table class="data-table">
			<caption class="visually-hidden">Heat complaints and temperatures by month, {seasonLabel(selected)}</caption>
			<thead>
				<tr>
					<th scope="col">Month</th>
					<th scope="col">Complaints</th>
					<th scope="col">Per day</th>
					<th scope="col">Average low</th>
					<th scope="col">Coldest low</th>
					<th scope="col">Days at or below freezing</th>
				</tr>
			</thead>
			<tbody>
				{#each monthly as m (m.month)}
					<tr>
						<th scope="row">{m.month}</th>
						<td>{num(m.complaints)}</td>
						<td>{num(Math.round(m.complaints / m.days))}</td>
						<td>{m.avgLow.toFixed(0)}°F</td>
						<td>{m.coldest}°F</td>
						<td>{m.freezing}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
</Figure>

<style>
	.control-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px 20px;
	}
	.summary {
		margin: 0;
		font-size: 14px;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}
	.summary strong {
		color: var(--ink);
		font-weight: 650;
	}
	.chart {
		position: relative;
		border-radius: 4px;
	}
	svg {
		display: block;
		touch-action: pan-y;
	}
	.panel-title {
		font-size: 12.5px;
		font-weight: 600;
		fill: var(--ink-2);
	}
	.grid {
		stroke: var(--rule);
		stroke-width: 1;
	}
	.grid.base,
	.grid.freezing {
		stroke: var(--axis);
	}
	.range {
		fill: var(--gray-d);
	}
	.low {
		fill: none;
		stroke: var(--ink-2);
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.ref-label {
		font-size: 11.5px;
		fill: var(--ink-3);
	}
	.bar {
		fill: var(--blue);
	}
	.bar.on {
		fill: var(--ink);
	}
	.peak-label {
		font-size: 12.5px;
		font-weight: 600;
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--page);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.month-tick {
		stroke: var(--axis);
	}
	.crosshair {
		stroke: var(--ink-3);
		stroke-width: 1;
	}
	.marker {
		fill: var(--ink);
		stroke: var(--page);
		stroke-width: 2;
	}
	.tip {
		transform: translate(12px, -100%);
	}
	.tip.flip {
		transform: translate(calc(-100% - 12px), -100%);
	}
	@media (max-width: 560px) {
		.summary {
			font-size: 13px;
		}
	}
</style>
