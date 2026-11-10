<script lang="ts">
	import { CATEGORY_LABELS, type Category } from '../analysis/categories';

	type Tally = { total: number } & Record<Category, number>;
	interface Props {
		areas: readonly string[];
		seasons: readonly string[];
		outcomes: Record<string, Record<string, Tally>>;
	}
	let { areas, seasons, outcomes }: Props = $props();

	// Display order: the two outcomes the story compares come first, then the rest.
	// Duplicates are left out: they are extra calls about a complaint already open.
	const SHOWN = ['said_fixed', 'violation', 'no_violation', 'no_access', 'not_stated', 'other'] as const;
	const COLOR: Record<(typeof SHOWN)[number], string> = {
		said_fixed: 'var(--said-fixed)',
		violation: 'var(--violation)',
		no_violation: 'var(--gray-a)',
		no_access: 'var(--gray-b)',
		not_stated: 'var(--gray-c)',
		other: 'var(--gray-d)'
	};
	// Inline % labels only where the segment is wide enough to hold them.
	const LABEL_MIN_SHARE = 0.07;

	let area = $state('Citywide');
	let tip = $state<{ x: number; y: number; season: string; category: (typeof SHOWN)[number] } | null>(
		null
	);

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

	const pct = (x: number) => `${Math.round(x * 100)}%`;
	const fmt = (n: number) => n.toLocaleString('en-US');
	const seasonLabel = (s: string) => s.replace('-', '–');

	function showTip(e: PointerEvent, season: string, category: (typeof SHOWN)[number]) {
		const box = (e.currentTarget as HTMLElement).closest('.chart')!.getBoundingClientRect();
		tip = { x: e.clientX - box.left, y: e.clientY - box.top, season, category };
	}
</script>

<figure class="viz">
	<div class="controls" role="group" aria-label="Show borough">
		{#each areas as a (a)}
			<button type="button" aria-pressed={area === a} onclick={() => (area = a)}>{a}</button>
		{/each}
	</div>

	<ul class="legend" aria-label="Legend">
		{#each SHOWN as c (c)}
			<li><span class="swatch" style:background={COLOR[c]}></span>{CATEGORY_LABELS[c]}</li>
		{/each}
	</ul>

	<div class="chart" role="group" aria-label="How heat complaints were closed, by season, {area}. Full numbers in the table below.">
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
							>
								{#if (s.category === 'said_fixed' || s.category === 'violation') && s.share >= LABEL_MIN_SHARE}
									<span class="inline">{pct(s.share)}</span>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}

		{#if tip}
			{@const row = rows.find((r) => r.season === tip!.season)!}
			{@const seg = row.segments.find((s) => s.category === tip!.category)!}
			<div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">
				<div class="tip-head">{area}, {seasonLabel(row.season)}</div>
				<div><span class="swatch" style:background={COLOR[seg.category]}></span>{CATEGORY_LABELS[seg.category]}</div>
				<div class="tip-num">{fmt(seg.n)} complaints · {pct(seg.share)}</div>
			</div>
		{/if}
	</div>


	<details>
		<summary>Show the numbers</summary>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th scope="col">Season</th>
						{#each SHOWN as c (c)}<th scope="col">{CATEGORY_LABELS[c]}</th>{/each}
						<th scope="col">Total (excl. duplicates)</th>
						<th scope="col">Duplicates</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.season)}
						<tr>
							<th scope="row">{seasonLabel(row.season)}</th>
							{#each row.segments as s (s.category)}<td>{fmt(s.n)} <span class="muted">({pct(s.share)})</span></td>{/each}
							<td>{fmt(row.base)}</td>
							<td>{fmt(row.duplicate)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>

	<figcaption>
		Share of heat and hot water complaints filed Oct. 1 – May 31 each season, by how the city closed
		them. Excludes duplicate complaints about a condition already reported in the same building.
	</figcaption>
</figure>

<style>
	.viz {
		margin: 0;
		padding: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 14px;
	}
	.controls button {
		font: inherit;
		font-size: 14px;
		padding: 5px 12px;
		border-radius: 999px;
		border: 1px solid var(--axis);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}
	.controls button[aria-pressed='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--surface);
	}
	.legend {
		list-style: none;
		margin: 0 0 12px;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		font-size: 13px;
		color: var(--ink-2);
	}
	.swatch {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		margin-right: 6px;
		vertical-align: -1px;
	}
	.chart {
		position: relative;
	}
	.row {
		display: grid;
		grid-template-columns: 64px 1fr;
		align-items: center;
		gap: 8px;
		margin: 6px 0;
	}
	.season {
		font-size: 13px;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
	}
	.bar {
		display: flex;
		gap: 2px; /* surface gap between segments */
		height: 24px;
	}
	.seg {
		flex-basis: 0;
		min-width: 0;
		display: flex;
		align-items: center;
		padding-left: 6px;
	}
	.seg:first-child {
		border-radius: 0;
	}
	.seg:last-child {
		border-radius: 0 4px 4px 0;
	}
	.inline {
		font-size: 12px;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
	}
	.tip {
		position: absolute;
		transform: translate(-50%, calc(-100% - 12px));
		pointer-events: none;
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		border-radius: 6px;
		padding: 8px 10px;
		font-size: 13px;
		white-space: nowrap;
		z-index: 2;
	}
	.tip-head {
		color: var(--ink-muted);
		font-size: 12px;
	}
	.tip-num {
		font-weight: 600;
	}
	figcaption {
		margin-top: 12px;
		font-size: 13px;
		color: var(--ink-muted);
	}
	details {
		margin-top: 12px;
		font-size: 13px;
	}
	summary {
		cursor: pointer;
		color: var(--ink-2);
	}
	.table-wrap {
		overflow-x: auto;
		margin-top: 8px;
	}
	table {
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	th,
	td {
		text-align: right;
		padding: 4px 8px;
		border-bottom: 1px solid var(--grid);
	}
	th:first-child {
		text-align: left;
	}
	thead th {
		font-weight: 600;
		color: var(--ink-2);
		white-space: normal;
		vertical-align: bottom;
		min-width: 80px;
	}
	.muted {
		color: var(--ink-muted);
	}
</style>
