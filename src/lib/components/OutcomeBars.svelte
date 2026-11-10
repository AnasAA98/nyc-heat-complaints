<script lang="ts">
	import { CATEGORY_LABELS, type Category } from '#lib/analysis/categories.ts';
	import { num, pct, seasonLabel } from '#lib/format.ts';
	import { OUTCOME_COLOR, OUTCOMES, type Outcome } from '#lib/outcomes.ts';
	import Figure from './Figure.svelte';
	import Segmented from './Segmented.svelte';

	type Tally = { total: number } & Record<Category, number>;
	interface Props {
		areas: readonly string[];
		seasons: readonly string[];
		outcomes: Record<string, Record<string, Tally>>;
	}
	let { areas, seasons, outcomes }: Props = $props();

	// The two outcomes the story compares come first, then the rest.
	const SHOWN = OUTCOMES;
	type Shown = Outcome;
	const COLOR = OUTCOME_COLOR;

	let area = $state('Citywide');
	let tip = $state<{ x: number; y: number; season: string; category: Shown } | null>(null);
	let chart: HTMLElement;

	const rows = $derived(
		seasons.map((season) => {
			const t = outcomes[area][season];
			const base = t.total - t.duplicate;
			return {
				season,
				base,
				duplicate: t.duplicate,
				segments: SHOWN.map((c) => ({ category: c, n: t[c], share: t[c] / base }))
			};
		})
	);
	const share = (row: (typeof rows)[number], c: Shown) => row.segments.find((s) => s.category === c)!.share;

	function showTip(e: PointerEvent, season: string, category: Shown) {
		const box = chart.getBoundingClientRect();
		tip = { x: e.clientX - box.left, y: e.clientY - box.top, season, category };
	}
</script>

<Figure
	id="outcomes"
	title="How heat complaints were closed"
	subtitle="Share of complaints filed each heat season, by the outcome the city recorded. Repeat calls about an outage already reported are left out."
	source="NYC Open Data, 311 Service Requests. Outcomes are grouped from the closing message on each complaint."
	note="“Someone said it was fixed” means a tenant or other occupant told the housing agency the problem was corrected, by phone or when an inspector came. Heat season runs Oct. 1 to May 31."
>
	{#snippet controls()}
		<Segmented label="Show borough" options={areas} bind:value={area} />
	{/snippet}

	<ul class="legend" aria-label="Outcomes">
		{#each SHOWN as c (c)}
			<li><span class="swatch" style:background={COLOR[c]}></span>{CATEGORY_LABELS[c]}</li>
		{/each}
	</ul>

	<div
		class="chart"
		bind:this={chart}
		role="group"
		aria-label="How heat complaints were closed in each season, {area}. The full numbers are in the table below."
	>
		<div class="row head" aria-hidden="true">
			<span></span>
			<span></span>
			<span class="col"><span class="swatch" style:background={COLOR.said_fixed}></span>Said fixed</span>
			<span class="col"><span class="swatch" style:background={COLOR.violation}></span>Violation</span>
		</div>
		{#each rows as row (row.season)}
			<div class="row">
				<div class="season">{seasonLabel(row.season)}</div>
				<div class="bar">
					{#each row.segments as s (s.category)}
						{#if s.n > 0}
							<div
								class="seg"
								role="img"
								aria-label="{seasonLabel(row.season)}: {CATEGORY_LABELS[s.category]}, {pct(s.share)}"
								style:flex-grow={s.n}
								style:background={COLOR[s.category]}
								onpointermove={(e) => showTip(e, row.season, s.category)}
								onpointerleave={() => (tip = null)}
							></div>
						{/if}
					{/each}
				</div>
				<div class="value">{pct(share(row, 'said_fixed'))}</div>
				<div class="value">{pct(share(row, 'violation'))}</div>
			</div>
		{/each}

		{#if tip}
			{@const row = rows.find((r) => r.season === tip!.season)!}
			{@const seg = row.segments.find((s) => s.category === tip!.category)!}
			<div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">
				<span class="tip-head">{area}, {seasonLabel(row.season)}</span>
				<strong>{pct(seg.share, 1)} · {num(seg.n)} complaints</strong>
				<span class="swatch" style:background={COLOR[seg.category]}></span>{CATEGORY_LABELS[seg.category]}
			</div>
		{/if}
	</div>

	{#snippet table()}
		<table class="data-table">
			<caption class="visually-hidden">How heat complaints were closed, {area}</caption>
			<thead>
				<tr>
					<th scope="col">Season</th>
					{#each SHOWN as c (c)}<th scope="col">{CATEGORY_LABELS[c]}</th>{/each}
					<th scope="col">Total, without repeats</th>
					<th scope="col">Repeat calls</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.season)}
					<tr>
						<th scope="row">{seasonLabel(row.season)}</th>
						{#each row.segments as s (s.category)}
							<td>{num(s.n)} <span class="muted">({pct(s.share, 1)})</span></td>
						{/each}
						<td>{num(row.base)}</td>
						<td>{num(row.duplicate)}</td>
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
	.row {
		display: grid;
		grid-template-columns: 60px 1fr 74px 68px;
		align-items: center;
		gap: 10px;
		margin: 7px 0;
	}
	.head {
		margin-bottom: 2px;
		font-size: 12.5px;
		color: var(--ink-2);
	}
	.col {
		text-align: right;
		white-space: nowrap;
	}
	.col .swatch {
		margin-right: 4px;
	}
	.season {
		font-size: 13.5px;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}
	.bar {
		display: flex;
		gap: 2px; /* page-colored gap separates the segments */
		height: 24px;
	}
	.seg {
		flex-basis: 0;
		min-width: 0;
		transition: opacity 120ms;
	}
	.seg:last-child {
		border-radius: 0 4px 4px 0;
	}
	.bar:hover .seg:not(:hover) {
		opacity: 0.45;
	}
	.value {
		text-align: right;
		font-size: 14px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.tip {
		transform: translate(-50%, calc(-100% - 12px));
	}
	.muted {
		color: var(--ink-3);
	}
	@media (max-width: 520px) {
		.row {
			grid-template-columns: 52px 1fr 44px 40px;
			gap: 6px;
		}
		.head .col {
			font-size: 0;
		}
		.head .col .swatch {
			margin-right: 0;
		}
		.season {
			font-size: 12.5px;
		}
	}
</style>
