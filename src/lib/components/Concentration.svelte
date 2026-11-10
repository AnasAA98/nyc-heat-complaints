<script lang="ts">
	import { toUnits } from '#lib/analysis/round.ts';
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
		{ label: 'The 1% of buildings with the most complaints', fill: 'var(--seq-6)' },
		{ label: 'The next 9%', fill: 'var(--seq-3)' },
		{ label: 'The other 90%', fill: 'var(--seq-1)' }
	];
	const split = (top1: number, top10: number) => [top1, top10 - top1, 1 - top10];

	// Each grid is 100 squares. The same three groups of buildings fill each one,
	// first by their share of buildings, then of apartments, then of complaints.
	const grids = $derived(
		[
			{ label: 'Apartment buildings', of: 'of buildings', shares: split(0.01, 0.1) },
			{ label: 'Apartments', of: 'of apartments', shares: split(stats.top1ApartmentShare, stats.top10ApartmentShare) },
			{ label: 'Heat complaints', of: 'of complaints', shares: split(stats.top1Share, stats.top10Share) }
		].map((g) => {
			const units = toUnits(g.shares);
			return { ...g, units, squares: units.flatMap((n, k) => Array.from({ length: n }, () => k)) };
		})
	);
</script>

<Figure
	id="buildings"
	title="One percent of buildings, about half of the complaints"
	subtitle="The city's {num(buildings)} apartment buildings, ranked by heat complaints in {seasonLabel(stats.season)} and split into three groups. Each grid shows how much of the total each group holds."
	source="NYC Open Data, 311 Service Requests; Department of City Planning, PLUTO."
	note="Apartment buildings are tax lots with three or more homes, not counting public housing. Most had no heat complaint during the season. Each square is 1 percent."
>
	<ul class="legend" aria-label="Building groups">
		{#each GROUPS as g (g.label)}
			<li><span class="swatch" style:background={g.fill}></span>{g.label}</li>
		{/each}
	</ul>

	<div class="grids">
		{#each grids as g (g.label)}
			<div class="block">
				<p class="name">{g.label}</p>
				<div class="waffle" role="img" aria-label="{g.label}: {g.shares.map((s, k) => `${GROUPS[k].label}, ${pct(s)}`).join('; ')}">
					{#each g.squares as k, n (n)}<i style:background={GROUPS[k].fill}></i>{/each}
				</div>
				<p class="lead"><b>{pct(g.shares[0])}</b> {g.of} in the top 1%</p>
			</div>
		{/each}
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
				{#each grids as g (g.label)}
					<tr>
						<th scope="row">{g.label}</th>
						{#each g.shares as share, k (k)}<td>{pct(share, 1)}</td>{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
</Figure>

<style>
	.grids {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 32px;
		margin-top: 20px;
	}
	.name {
		margin: 0 0 10px;
		font-size: 14px;
		font-weight: 600;
	}
	.waffle {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 3px;
		max-width: 260px;
	}
	.waffle i {
		aspect-ratio: 1;
		border-radius: 3px;
	}
	.lead {
		margin: 12px 0 0;
		font-size: 13.5px;
		line-height: 1.35;
		color: var(--ink-2);
	}
	.lead b {
		display: block;
		font-size: 34px;
		line-height: 1;
		font-weight: 680;
		letter-spacing: -0.03em;
		color: var(--ink);
		margin-bottom: 4px;
	}
	@media (max-width: 640px) {
		.grids {
			grid-template-columns: 1fr;
			gap: 26px;
		}
		.block {
			display: grid;
			grid-template-columns: 132px 1fr;
			gap: 0 18px;
			align-items: center;
		}
		.name {
			grid-column: 1 / -1;
		}
	}
</style>
