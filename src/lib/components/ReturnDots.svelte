<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { num, pct } from '#lib/format.ts';
	import Figure from './Figure.svelte';

	type Cell = { rate: number; closings: number };
	interface Band {
		band: string;
		said_fixed: Cell;
		violation: Cell;
	}
	interface Props {
		bySize: Band[];
		windowDays: number;
	}
	let { bySize, windowDays }: Props = $props();

	const MARGIN = { top: 28, right: 46, bottom: 6, left: 122 };
	const ROW = 40;
	const TICKS = [0, 0.2, 0.4, 0.6, 0.8];

	let width = $state(660);
	let hover = $state<number | null>(null);

	const height = $derived(MARGIN.top + bySize.length * ROW + MARGIN.bottom);
	const x = $derived(scaleLinear([0, 0.8], [MARGIN.left, width - MARGIN.right]));
	const y = (i: number) => MARGIN.top + i * ROW + ROW / 2;
	const label = (band: string) => (band === '1–2' ? '1–2 homes' : `${band} apartments`);
</script>

<Figure
	id="followups"
	title="After a complaint closes, another often follows"
	subtitle="Share of closed complaints followed by a new heat complaint from the same building within {windowDays} days, by building size. All six seasons."
	source="NYC Open Data, 311 Service Requests; building sizes from the Department of City Planning's PLUTO tax lot file."
	note="A new complaint can come from a different apartment or be about a different problem. Bigger buildings have more tenants who can call, so compare within a row, not between rows."
>
	<ul class="legend" aria-label="Outcomes compared">
		<li><span class="swatch dot" style:background="var(--orange)"></span>Closed after someone said it was fixed</li>
		<li><span class="swatch dot" style:background="var(--violet)"></span>Closed with a violation</li>
	</ul>

	<div class="chart" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label="Dot plot. In every building size, complaints closed with a violation were followed by a new complaint at least as often as complaints closed as fixed. Numbers are in the table below.">
			{#each TICKS as t (t)}
				<line class="grid" x1={x(t)} x2={x(t)} y1={MARGIN.top - 6} y2={height - MARGIN.bottom} />
				<text class="axis-text" x={x(t)} y={12} text-anchor="middle">{pct(t)}</text>
			{/each}

			{#each bySize as b, i (b.band)}
				{@const lo = Math.min(b.said_fixed.rate, b.violation.rate)}
				{@const hi = Math.max(b.said_fixed.rate, b.violation.rate)}
				<g
					class="band"
					class:dim={hover !== null && hover !== i}
					onpointerenter={() => (hover = i)}
					onpointerleave={() => (hover = null)}
					role="presentation"
				>
					<rect class="hit" x="0" y={y(i) - ROW / 2} {width} height={ROW} />
					<text class="label-text" x={MARGIN.left - 14} y={y(i)} dy="0.35em" text-anchor="end">{label(b.band)}</text>
					<line class="link" x1={x(lo)} x2={x(hi)} y1={y(i)} y2={y(i)} />
					<circle class="dot" cx={x(b.said_fixed.rate)} cy={y(i)} r="6" fill="var(--orange)" />
					<circle class="dot" cx={x(b.violation.rate)} cy={y(i)} r="6" fill="var(--violet)" />
					<text class="value" x={x(lo) - 12} y={y(i)} dy="0.35em" text-anchor="end">{pct(lo)}</text>
					<text class="value" x={x(hi) + 12} y={y(i)} dy="0.35em">{pct(hi)}</text>
				</g>
			{/each}
		</svg>

		{#if hover !== null}
			{@const b = bySize[hover]}
			<div class="tip" style:left="{x((b.said_fixed.rate + b.violation.rate) / 2)}px" style:top="{y(hover) - ROW / 2}px">
				<span class="tip-head">Buildings with {label(b.band)}</span>
				<span><span class="swatch dot" style:background="var(--orange)"></span>{pct(b.said_fixed.rate, 1)} of {num(b.said_fixed.closings)} closed as fixed</span><br />
				<span><span class="swatch dot" style:background="var(--violet)"></span>{pct(b.violation.rate, 1)} of {num(b.violation.closings)} closed with a violation</span>
			</div>
		{/if}
	</div>

	{#snippet table()}
		<table class="data-table">
			<caption class="visually-hidden">Share of closed complaints followed by a new complaint within {windowDays} days</caption>
			<thead>
				<tr>
					<th scope="col">Building size</th>
					<th scope="col">Closed as fixed: followed by a new complaint</th>
					<th scope="col">Complaints closed as fixed</th>
					<th scope="col">Closed with a violation: followed by a new complaint</th>
					<th scope="col">Complaints closed with a violation</th>
				</tr>
			</thead>
			<tbody>
				{#each bySize as b (b.band)}
					<tr>
						<th scope="row">{label(b.band)}</th>
						<td>{pct(b.said_fixed.rate, 1)}</td>
						<td>{num(b.said_fixed.closings)}</td>
						<td>{pct(b.violation.rate, 1)}</td>
						<td>{num(b.violation.closings)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
</Figure>

<style>
	.legend {
		list-style: none;
		margin: 0 0 10px;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
		font-size: 13px;
		color: var(--ink-2);
	}
	.chart {
		position: relative;
	}
	svg {
		display: block;
		overflow: visible;
	}
	.grid {
		stroke: var(--rule);
		stroke-width: 1;
	}
	.link {
		stroke: var(--axis);
		stroke-width: 2;
	}
	.dot {
		stroke: var(--surface);
		stroke-width: 2;
	}
	.value {
		font-size: 12.5px;
		font-weight: 600;
		fill: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.hit {
		fill: transparent;
	}
	.band {
		transition: opacity 120ms;
	}
	.dim {
		opacity: 0.4;
	}
	.tip {
		transform: translate(-50%, calc(-100% - 2px));
	}
	@media (max-width: 480px) {
		.label-text {
			font-size: 11.5px;
		}
	}
</style>
