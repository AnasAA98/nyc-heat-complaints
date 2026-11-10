<script lang="ts">
	import { area, curveStepAfter } from 'd3-shape';
	import { addDays } from '#lib/analysis/weather.ts';
	import { date, num, seasonLabel } from '#lib/format.ts';

	// The whole dataset in one strip: every day of six heat seasons, as bars.
	interface WeatherSeason {
		season: string;
		start: string;
		days: number[][]; // [complaints, low °F, high °F]
	}
	interface Props {
		seasons: WeatherSeason[];
	}
	let { seasons }: Props = $props();

	const HEIGHT = 168;
	const TOP = 30;
	const BOTTOM = 26;
	const GAP = 14; // the summers between seasons are left out

	let width = $state(1180);
	let hover = $state<{ s: number; d: number } | null>(null);

	const totalDays = $derived(seasons.reduce((n, s) => n + s.days.length, 0));
	const pitch = $derived((width - GAP * (seasons.length - 1)) / totalDays);
	const max = $derived(Math.max(...seasons.flatMap((s) => s.days.map((d) => d[0]))));
	const y = (n: number) => HEIGHT - BOTTOM - (n / max) * (HEIGHT - BOTTOM - TOP);

	// Where each season starts along the strip.
	const offsets = $derived.by(() => {
		let x = 0;
		return seasons.map((s) => {
			const start = x;
			x += s.days.length * pitch + GAP;
			return start;
		});
	});
	const paths = $derived(
		seasons.map((s, k) => {
			const points = [...s.days.map((d, i) => [offsets[k] + i * pitch, d[0]]), [offsets[k] + s.days.length * pitch, 0]];
			return area<number[]>()
				.x((p) => p[0])
				.y0(y(0))
				.y1((p) => y(p[1]))
				.curve(curveStepAfter)(points);
		})
	);
	const peak = $derived.by(() => {
		let best = { s: 0, d: 0, n: 0 };
		seasons.forEach((season, s) => season.days.forEach((day, d) => day[0] > best.n && (best = { s, d, n: day[0] })));
		return best;
	});
	const xOf = (s: number, d: number) => offsets[s] + (d + 0.5) * pitch;

	function onmove(e: PointerEvent) {
		const px = e.clientX - (e.currentTarget as Element).getBoundingClientRect().left;
		const s = offsets.findLastIndex((o) => px >= o - GAP / 2);
		if (s < 0) return (hover = null);
		const d = Math.max(0, Math.min(seasons[s].days.length - 1, Math.floor((px - offsets[s]) / pitch)));
		hover = { s, d };
	}
</script>

<div class="strip" bind:clientWidth={width}>
	<svg
		{width}
		height={HEIGHT}
		role="img"
		aria-label="Heat complaints per day across six heat seasons, {seasonLabel(seasons[0].season)} to {seasonLabel(seasons.at(-1)!.season)}. Complaints spike each winter; the highest day was {date(addDays(seasons[peak.s].start, peak.d))} with {num(peak.n)} complaints."
		onpointermove={onmove}
		onpointerleave={() => (hover = null)}
	>
		<line class="base" x1="0" x2={width} y1={y(0)} y2={y(0)} />
		{#each paths as d, k (k)}
			<path class="area" {d} />
			<text class="season" x={offsets[k]} y={HEIGHT - 6}>{seasonLabel(seasons[k].season)}</text>
		{/each}

		<line class="leader" x1={xOf(peak.s, peak.d)} x2={xOf(peak.s, peak.d)} y1={y(peak.n) - 4} y2={y(peak.n) - 12} />
		<text class="peak" x={xOf(peak.s, peak.d)} y={y(peak.n) - 17} text-anchor={xOf(peak.s, peak.d) > width - 150 ? 'end' : 'middle'}>
			{date(addDays(seasons[peak.s].start, peak.d))}: {num(peak.n)} complaints
		</text>

		{#if hover}
			<line class="cross" x1={xOf(hover.s, hover.d)} x2={xOf(hover.s, hover.d)} y1={TOP - 8} y2={y(0)} />
		{/if}
	</svg>
	{#if hover}
		{@const day = seasons[hover.s].days[hover.d]}
		<div class="tip" class:flip={xOf(hover.s, hover.d) > width * 0.7} style:left="{xOf(hover.s, hover.d)}px">
			<span class="tip-head">{date(addDays(seasons[hover.s].start, hover.d), { weekday: true })}</span>
			<strong>{num(day[0])} complaints</strong>
			Low {day[1]}°F
		</div>
	{/if}
</div>

<style>
	.strip {
		position: relative;
	}
	svg {
		display: block;
		touch-action: pan-y;
	}
	.area {
		fill: var(--blue);
	}
	.base {
		stroke: var(--axis);
	}
	.season {
		font-size: 12px;
		fill: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.peak {
		font-size: 12.5px;
		font-weight: 600;
		fill: var(--ink);
	}
	.leader,
	.cross {
		stroke: var(--ink-3);
		stroke-width: 1;
	}
	.tip {
		top: 0;
		transform: translate(12px, 0);
	}
	.tip.flip {
		transform: translate(calc(-100% - 12px), 0);
	}
	@media (max-width: 640px) {
		.season {
			font-size: 10.5px;
		}
	}
</style>
