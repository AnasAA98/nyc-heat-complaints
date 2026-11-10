<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { num, pct, seasonLabel, tick } from '#lib/format.ts';
	import Figure from './Figure.svelte';

	interface SeasonPoint {
		season: string;
		complaints: number;
		hdd: number;
		freezingDays: number;
		complaintsPerHdd: number;
	}
	interface Props {
		seasons: SeasonPoint[];
		hddBase: number;
		// Two seasons that were equally cold, if the data has such a pair.
		pair: { earlier: string; later: string; increase: number } | null;
	}
	let { seasons, hddBase, pair }: Props = $props();

	const MARGIN = { top: 16, right: 76, bottom: 44, left: 48 };
	const HEIGHT = 340;

	let width = $state(660);
	let hover = $state<number | null>(null);

	const xDomain = $derived.by(() => {
		const values = seasons.map((s) => s.hdd);
		return [Math.floor(Math.min(...values) / 250) * 250, Math.ceil(Math.max(...values) / 250) * 250];
	});
	const yMax = $derived(Math.ceil(Math.max(...seasons.map((s) => s.complaints)) / 100_000) * 100_000);
	const x = $derived(scaleLinear(xDomain, [MARGIN.left, width - MARGIN.right]));
	const y = $derived(scaleLinear([0, yMax], [HEIGHT - MARGIN.bottom, MARGIN.top]));
	const xTicks = $derived(x.ticks(5));
	const yTicks = $derived(y.ticks(4));

	// Put each label to the right of its dot unless that would collide with a
	// label already placed; then put it on the left.
	const labels = $derived.by(() => {
		const placed: { x: number; y: number; side: 'left' | 'right' }[] = [];
		return seasons.map((s) => {
			const px = x(s.hdd);
			const py = y(s.complaints);
			const clash = placed.some((p) => p.side === 'right' && Math.abs(p.y - py) < 15 && Math.abs(p.x - px) < 64);
			const side = clash ? 'left' : 'right';
			placed.push({ x: px, y: py, side });
			return side;
		});
	});

	function nearest(e: PointerEvent) {
		const box = (e.currentTarget as Element).getBoundingClientRect();
		const px = e.clientX - box.left;
		const py = e.clientY - box.top;
		let best = 0;
		let bestDistance = Infinity;
		seasons.forEach((s, i) => {
			const d = Math.hypot(x(s.hdd) - px, y(s.complaints) - py);
			if (d < bestDistance) [best, bestDistance] = [i, d];
		});
		hover = bestDistance < 60 ? best : null;
	}
</script>

<Figure
	id="seasons"
	title="Colder winters bring more complaints, but complaints rose faster than the cold"
	subtitle="Each dot is one heat season: how cold it was, and how many heat and hot water complaints were filed."
	source="NYC Open Data, 311 Service Requests; National Oceanic and Atmospheric Administration, Central Park weather station."
	note="Heating degree days add up how far each day's average temperature fell below {hddBase}°F, from Oct. 1 to May 31. A higher total means a colder season."
>
	<div class="chart" bind:clientWidth={width}>
		<svg
			{width}
			height={HEIGHT}
			role="img"
			aria-label="Scatter plot of six heat seasons. Complaints are in the table below."
			onpointermove={nearest}
			onpointerleave={() => (hover = null)}
		>
			{#each yTicks as t (t)}
				<line class="grid" class:base={t === 0} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} />
				<text class="axis-text" x={MARGIN.left - 8} y={y(t)} dy="0.32em" text-anchor="end">{tick(t)}</text>
			{/each}
			{#each xTicks as t (t)}
				<text class="axis-text" x={x(t)} y={HEIGHT - MARGIN.bottom + 18} text-anchor="middle">{num(t)}</text>
			{/each}
			<text class="axis-title" x={MARGIN.left} y={HEIGHT - 4}>Heating degree days →  colder</text>
			<text class="axis-title" x={0} y={8}>Complaints</text>

			{#if pair}
				{@const a = seasons.find((s) => s.season === pair.earlier)!}
				{@const b = seasons.find((s) => s.season === pair.later)!}
				{@const px = x((a.hdd + b.hdd) / 2)}
				{@const top = Math.min(y(a.complaints), y(b.complaints))}
				{@const bottom = Math.max(y(a.complaints), y(b.complaints))}
				<line class="pair" x1={px} x2={px} y1={top + 9} y2={bottom - 9} />
				<text class="note" text-anchor="end">
					<tspan x={px - 10} y={(top + bottom) / 2 - 3}>Equally cold,</tspan>
					<tspan x={px - 10} dy="1.25em">{pct(pair.increase)} more complaints</tspan>
				</text>
			{/if}

			{#each seasons as s, i (s.season)}
				<circle class="dot" class:on={hover === i} cx={x(s.hdd)} cy={y(s.complaints)} r="6" />
				<text
					class="label-text point-label"
					x={x(s.hdd) + (labels[i] === 'right' ? 11 : -11)}
					y={y(s.complaints)}
					dy="0.35em"
					text-anchor={labels[i] === 'right' ? 'start' : 'end'}
				>
					{seasonLabel(s.season)}
				</text>
			{/each}
		</svg>

		{#if hover !== null}
			{@const s = seasons[hover]}
			<div class="tip" class:flip={x(s.hdd) > width * 0.55} style:left="{x(s.hdd)}px" style:top="{y(s.complaints)}px">
				<span class="tip-head">{seasonLabel(s.season)}</span>
				<strong>{num(s.complaints)} complaints</strong>
				{num(s.hdd)} heating degree days<br />
				{s.freezingDays} days at or below freezing<br />
				{s.complaintsPerHdd.toFixed(0)} complaints per degree day
			</div>
		{/if}
	</div>

	{#snippet table()}
		<table class="data-table">
			<caption class="visually-hidden">Heat complaints and cold, by season</caption>
			<thead>
				<tr>
					<th scope="col">Season</th>
					<th scope="col">Complaints</th>
					<th scope="col">Heating degree days</th>
					<th scope="col">Days at or below freezing</th>
					<th scope="col">Complaints per degree day</th>
				</tr>
			</thead>
			<tbody>
				{#each seasons as s (s.season)}
					<tr>
						<th scope="row">{seasonLabel(s.season)}</th>
						<td>{num(s.complaints)}</td>
						<td>{num(s.hdd)}</td>
						<td>{s.freezingDays}</td>
						<td>{s.complaintsPerHdd.toFixed(1)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
</Figure>

<style>
	.chart {
		position: relative;
	}
	svg {
		display: block;
		overflow: visible;
	}
	.grid {
		stroke: var(--rule);
	}
	.grid.base {
		stroke: var(--axis);
	}
	.axis-title {
		font-size: 12px;
		fill: var(--ink-3);
	}
	.dot {
		fill: var(--blue);
		stroke: var(--surface);
		stroke-width: 2;
	}
	.dot.on {
		fill: var(--ink);
	}
	.point-label {
		font-weight: 600;
		fill: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.pair {
		stroke: var(--ink-2);
		stroke-width: 1;
	}
	.note {
		font-size: 12.5px;
		fill: var(--ink-2);
	}
	.tip {
		transform: translate(14px, -50%);
	}
	.tip.flip {
		transform: translate(calc(-100% - 14px), -50%);
	}
</style>
