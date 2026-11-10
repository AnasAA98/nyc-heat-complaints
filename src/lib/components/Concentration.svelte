<script lang="ts">
	import { num, pct, seasonLabel } from '#lib/format.ts';
	import Figure from './Figure.svelte';

	interface SeasonStats {
		season: string;
		top1Buildings: number;
		top1Share: number;
		top10Share: number;
		top1ApartmentShare: number;
		top10ApartmentShare: number;
	}
	interface Props {
		stats: SeasonStats;
		buildings: number;
	}
	let { stats, buildings }: Props = $props();

	// Buildings are ranked by complaints, then split into three groups.
	const GROUPS = [
		{ label: 'The 1% of buildings with the most complaints', fill: 'var(--seq-6)', ink: 'var(--seq-6-ink)' },
		{ label: 'The next 9%', fill: 'var(--seq-3)', ink: 'var(--seq-3-ink)' },
		{ label: 'The other 90%', fill: 'var(--seq-1)', ink: 'var(--seq-1-ink)' }
	];
	// A share needs about this much of the bar before its label fits inside.
	const LABEL_MIN = 0.075;

	const split = (top1: number, top10: number) => [top1, top10 - top1, 1 - top10];
	const rows = $derived([
		{ label: 'Apartment buildings', shares: split(0.01, 0.1) },
		{ label: 'Apartments', shares: split(stats.top1ApartmentShare, stats.top10ApartmentShare) },
		{ label: 'Heat complaints', shares: split(stats.top1Share, stats.top10Share) }
	]);
</script>

<Figure
	id="buildings"
	title="One percent of buildings, about half of the complaints"
	subtitle="The city's {num(buildings)} apartment buildings, ranked by heat complaints in {seasonLabel(stats.season)} and split into three groups."
	source="NYC Open Data, 311 Service Requests; Department of City Planning, PLUTO."
	note="Apartment buildings are tax lots with three or more homes, not counting public housing. Most had no heat complaint during the season."
	width="text"
>
	<ul class="legend" aria-label="Building groups">
		{#each GROUPS as g (g.label)}
			<li><span class="swatch" style:background={g.fill}></span>{g.label}</li>
		{/each}
	</ul>

	<div class="rows">
		{#each rows as row (row.label)}
			<div class="row">
				<div class="label">{row.label}</div>
				<div class="bar" role="img" aria-label="{row.label}: {row.shares.map((s, k) => `${GROUPS[k].label}, ${pct(s)}`).join('; ')}">
					{#each row.shares as share, k (k)}
						<div class="seg" style:flex-grow={share} style:background={GROUPS[k].fill} style:color={GROUPS[k].ink} title="{GROUPS[k].label}: {pct(share, 1)}">
							{#if share >= LABEL_MIN}<span>{pct(share)}</span>{/if}
						</div>
					{/each}
				</div>
				<div class="lead"><b>{pct(row.shares[0])}</b></div>
			</div>
		{/each}
		<div class="row foot" aria-hidden="true">
			<div></div>
			<div></div>
			<div class="lead">in the top 1%</div>
		</div>
	</div>

	{#snippet table()}
		<table class="data-table">
			<caption class="visually-hidden">Share of buildings, apartments and complaints in each group</caption>
			<thead>
				<tr>
					<th scope="col"></th>
					{#each GROUPS as g (g.label)}<th scope="col">{g.label}</th>{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.label)}
					<tr>
						<th scope="row">{row.label}</th>
						{#each row.shares as share, k (k)}<td>{pct(share, 1)}</td>{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
</Figure>

<style>
	.legend {
		list-style: none;
		margin: 0 0 14px;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		font-size: 13px;
		color: var(--ink-2);
	}
	.row {
		display: grid;
		grid-template-columns: 138px 1fr 52px;
		align-items: center;
		gap: 12px;
		margin: 10px 0;
	}
	.label {
		font-size: 14px;
		color: var(--ink-2);
	}
	.bar {
		display: flex;
		gap: 2px;
		height: 30px;
	}
	.seg {
		flex-basis: 0;
		min-width: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.seg:last-child {
		border-radius: 0 4px 4px 0;
	}
	.lead {
		text-align: right;
		font-size: 12px;
		color: var(--ink-3);
		line-height: 1.2;
	}
	.lead b {
		font-size: 17px;
		font-weight: 700;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.foot {
		margin-top: -4px;
	}
	@media (max-width: 520px) {
		.row {
			grid-template-columns: 1fr 52px;
			gap: 4px 12px;
		}
		.label {
			grid-column: 1 / -1;
			font-size: 13px;
		}
		.foot div:first-child {
			display: none;
		}
	}
</style>
