<script lang="ts">
	import { CATEGORY_LABELS } from '#lib/analysis/categories.ts';
	import { toUnits } from '#lib/analysis/round.ts';
	import { big, pct, seasonLabel } from '#lib/format.ts';
	import { OUTCOME_COLOR, OUTCOMES } from '#lib/outcomes.ts';

	// The story's four headline numbers, each linking to the section behind it.
	interface Props {
		total: number;
		bySeason: number[];
		seasons: readonly string[];
		outcomes: Record<(typeof OUTCOMES)[number], number>;
		pair: { earlier: string; later: string; increase: number } | null;
		growth: number;
		top1Share: number;
		top1Buildings: number;
	}
	let { total, bySeason, seasons, outcomes, pair, growth, top1Share, top1Buildings }: Props = $props();

	const ORDER = OUTCOMES;
	const COLOR = OUTCOME_COLOR;
	// 100 squares, one per complaint, in whole numbers that add up to 100.
	const units = $derived(toUnits(ORDER.map((c) => outcomes[c])));
	const squares = $derived(ORDER.flatMap((c, k) => Array.from({ length: units[k] }, () => c)));
	const peakSeason = $derived(Math.max(...bySeason));
</script>

<div class="bento">
	<a class="card hundred" href="#s-outcomes">
		<p class="eyebrow">Of every 100 complaints</p>
		<div class="split">
			<div class="grid" role="img" aria-label="One hundred squares, one per complaint, colored by how the complaint was closed: {ORDER.map((c, k) => `${units[k]} ${CATEGORY_LABELS[c]}`).join(', ')}.">
				{#each squares as c, k (k)}<i style:background={COLOR[c]}></i>{/each}
			</div>
			<ul>
				{#each ORDER as c, k (c)}
					<li class:lead={c === 'said_fixed' || c === 'violation'}>
						<b>{units[k]}</b>
						<span><span class="swatch" style:background={COLOR[c]}></span>{CATEGORY_LABELS[c]}</span>
					</li>
				{/each}
			</ul>
		</div>
		<p class="fine">Six heat seasons, not counting repeat calls about the same outage.</p>
	</a>

	<a class="card total" href="#s-weather">
		<p class="eyebrow">Six heat seasons</p>
		<p class="big">{big(total).replace(' million', 'M')}</p>
		<p class="label">heat and hot water complaints to 311</p>
		<div class="cols" aria-hidden="true">
			{#each bySeason as n, k (k)}
				<span class:now={k === bySeason.length - 1} style:height="{(n / peakSeason) * 100}%" title="{seasonLabel(seasons[k])}: {n.toLocaleString('en-US')}"></span>
			{/each}
		</div>
		<p class="fine">{seasonLabel(seasons[0])} to {seasonLabel(seasons.at(-1)!)}, up {pct(growth - 1)}</p>
	</a>

	{#if pair}
		<a class="card stat" href="#seasons">
			<p class="eyebrow">Same cold, more calls</p>
			<p class="big">+{pct(pair.increase)}</p>
			<p class="label">
				more complaints in {seasonLabel(pair.later)} than in {seasonLabel(pair.earlier)}, an equally cold winter
			</p>
		</a>
	{/if}

	<a class="card stat" href="#s-buildings">
		<p class="eyebrow">A small share of buildings</p>
		<p class="big">{pct(top1Share)}</p>
		<p class="label">of complaints came from 1% of apartment buildings, {top1Buildings.toLocaleString('en-US')} in all</p>
	</a>
</div>

<style>
	.bento {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}
	.card {
		display: flex;
		flex-direction: column;
		padding: 22px;
		text-decoration: none;
		transition:
			transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1),
			border-color 200ms;
	}
	.card:hover {
		transform: translateY(-2px);
		border-color: var(--axis);
	}
	.hundred {
		grid-column: span 2;
		grid-row: span 2;
	}
	.total {
		grid-column: span 2;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		gap: 22px;
		align-items: center;
		margin: 16px 0;
		flex: 1;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 3px;
	}
	.grid i {
		aspect-ratio: 1;
		border-radius: 3px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: grid;
		grid-template-columns: 44px 1fr;
		align-items: baseline;
		padding: 5px 0;
		font-size: 13.5px;
		line-height: 1.3;
		color: var(--ink-2);
	}
	li b {
		font-size: 17px;
		font-weight: 650;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	li.lead b {
		font-size: 26px;
		letter-spacing: -0.02em;
	}
	li.lead {
		color: var(--ink);
		font-weight: 550;
	}
	.big {
		margin: 10px 0 2px;
		font-size: clamp(40px, 5vw, 60px);
		line-height: 1;
		font-weight: 680;
		letter-spacing: -0.04em;
	}
	.label {
		margin: 6px 0 0;
		font-size: 14.5px;
		line-height: 1.4;
		color: var(--ink-2);
	}
	.fine {
		margin: auto 0 0;
		padding-top: 12px;
		font-size: 12.5px;
		color: var(--ink-3);
	}
	.total {
		position: relative;
	}
	.total .label,
	.total .fine {
		max-width: calc(100% - 130px);
	}
	.cols {
		position: absolute;
		right: 22px;
		top: 22px;
		height: 84px;
		display: flex;
		align-items: flex-end;
		gap: 5px;
	}
	.cols span {
		width: 14px;
		background: var(--gray-b);
		border-radius: 4px 4px 0 0;
	}
	.cols .now {
		background: var(--blue);
	}

	@media (max-width: 900px) {
		.bento {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 560px) {
		.bento {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.hundred,
		.total {
			grid-column: auto;
		}
		.split {
			grid-template-columns: 1fr;
		}
		.grid {
			max-width: 240px;
		}
	}
</style>
