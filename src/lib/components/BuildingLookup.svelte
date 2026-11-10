<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { num, seasonLabel } from '#lib/format.ts';
	import Figure from './Figure.svelte';

	// One row of a ZIP file: address, homes, year built, buildings on the lot, then
	// per-season complaints, days with a complaint, HPD violations and court cases.
	type Row = [string, number, number, number, number[], number[], number[], number[]];
	interface ZipFile {
		zip: string;
		seasons: string[];
		buildings: Row[];
	}
	interface Props {
		zips: { zip: string; buildings: number }[];
		seasons: readonly string[];
	}
	let { zips, seasons }: Props = $props();

	const PAGE = 12;
	const known = $derived(new Set(zips.map((z) => z.zip)));
	const last = $derived(seasons.length - 1);

	let zip = $state('');
	let filter = $state('');
	let shown = $state(PAGE);
	let status = $state<'idle' | 'loading' | 'ready' | 'unknown' | 'error'>('idle');
	let data = $state<ZipFile | null>(null);

	// Each ZIP code is its own small file, fetched only when someone asks for it.
	async function load(value: string) {
		if (!known.has(value)) {
			status = 'unknown';
			data = null;
			return;
		}
		status = 'loading';
		try {
			const res = await fetch(asset(`data/zip/${value}.json` as AssetPath));
			if (!res.ok) throw new Error(String(res.status));
			const file: ZipFile = await res.json();
			if (zip !== value) return; // the reader typed something else meanwhile
			data = file;
			filter = '';
			shown = PAGE;
			status = 'ready';
		} catch {
			status = 'error';
		}
	}

	function onZip() {
		zip = zip.replace(/\D/g, '').slice(0, 5);
		if (zip.length === 5) load(zip);
		else {
			status = 'idle';
			data = null;
		}
	}

	const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
	const matches = $derived.by(() => {
		if (!data) return [];
		const needle = filter.trim().toLowerCase();
		return data.buildings
			.filter((b) => !needle || b[0].toLowerCase().includes(needle))
			.sort((a, b) => b[5][last] - a[5][last] || sum(b[5]) - sum(a[5]));
	});
</script>

<Figure
	title="Look up a building"
	subtitle="Enter a New York City ZIP code to see heat and hot water complaints for its apartment buildings."
	source="NYC Open Data, 311 Service Requests, HPD violations and HPD litigation; Department of City Planning, PLUTO."
	note="Complaints are reports from tenants, not confirmed outages, and include repeat calls. Covers buildings with three or more homes that had at least one complaint in the six seasons. Addresses are tax lots, which can hold more than one building."
	id="lookup"
>
	{#snippet controls()}
		<div class="inputs">
			<label>
				<span>ZIP code</span>
				<input
					type="text"
					inputmode="numeric"
					autocomplete="postal-code"
					placeholder="10468"
					maxlength="5"
					bind:value={zip}
					oninput={onZip}
				/>
			</label>
			{#if data}
				<label class="grow">
					<span>Street or address</span>
					<input type="search" placeholder="Filter, e.g. Creston" bind:value={filter} oninput={() => (shown = PAGE)} />
				</label>
			{/if}
		</div>
	{/snippet}

	<div class="results" aria-live="polite">
		{#if status === 'idle'}
			<p class="state">Type a five-digit ZIP code to begin.</p>
		{:else if status === 'loading'}
			<p class="state">Loading…</p>
		{:else if status === 'unknown'}
			<p class="state">No apartment buildings with heat complaints were found for {zip}. Check that it is a New York City ZIP code.</p>
		{:else if status === 'error'}
			<p class="state">The data for {zip} could not be loaded. Check your connection and try again.</p>
		{:else if data}
			<p class="count">
				{num(matches.length)}
				{matches.length === 1 ? 'building' : 'buildings'} in {data.zip}{filter.trim() ? ` matching “${filter.trim()}”` : ''},
				sorted by days with a complaint in {seasonLabel(seasons[last])}.
			</p>
			{#if matches.length}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr>
								<th scope="col">Address</th>
								<th scope="col">Days with a complaint, {seasonLabel(seasons[last])}</th>
								<th scope="col">Complaints, {seasonLabel(seasons[last])}</th>
								<th scope="col">Violations issued, {seasonLabel(seasons[last])}</th>
								<th scope="col">Complaint days, {seasonLabel(seasons[0])} to {seasonLabel(seasons[last])}</th>
							</tr>
						</thead>
						<tbody>
							{#each matches.slice(0, shown) as b (b)}
								{@const peak = Math.max(1, ...b[5])}
								<tr>
									<th scope="row">
										{b[0] || 'Address not listed'}
										<small>
											{num(b[1])} homes{b[2] ? ` · built ${b[2]}` : ''}{b[3] > 1 ? ` · ${b[3]} buildings` : ''}{sum(b[7])
												? ` · ${sum(b[7])} city court ${sum(b[7]) === 1 ? 'case' : 'cases'}`
												: ''}
										</small>
									</th>
									<td class="strong">{b[5][last]}</td>
									<td>{num(b[4][last])}</td>
									<td>{b[6][last]}</td>
									<td>
										<span class="spark" role="img" aria-label={seasons.map((s, k) => `${seasonLabel(s)}: ${b[5][k]} days`).join(', ')}>
											{#each b[5] as days, k (k)}
												<span class:now={k === last} style:height="{Math.max(days ? 8 : 2, (days / peak) * 100)}%"></span>
											{/each}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if matches.length > shown}
					<button type="button" class="more" onclick={() => (shown += 25)}>
						Show more ({num(matches.length - shown)} left)
					</button>
				{/if}
			{/if}
		{/if}
	</div>
</Figure>

<style>
	.inputs {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 16px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink-2);
	}
	.grow {
		flex: 1 1 220px;
		max-width: 360px;
	}
	input {
		font-size: 16px; /* 16px keeps iOS from zooming the page on focus */
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--axis);
		background: var(--panel);
		font-weight: 400;
	}
	label:first-child input {
		width: 7.5em;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
	}
	.results {
		min-height: 64px;
	}
	.state,
	.count {
		margin: 0 0 6px;
		font-size: 14px;
		color: var(--ink-2);
	}
	.data-table {
		width: 100%;
	}
	.data-table thead th {
		font-size: 12px;
		max-width: 120px;
	}
	.data-table tbody th {
		white-space: normal;
		min-width: 190px;
		font-weight: 600;
		font-size: 14px;
	}
	small {
		display: block;
		font-weight: 400;
		font-size: 12.5px;
		color: var(--ink-3);
	}
	.strong {
		font-weight: 650;
	}
	.spark {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 24px;
		vertical-align: middle;
	}
	.spark span {
		width: 7px;
		background: var(--gray-b);
		border-radius: 1.5px 1.5px 0 0;
	}
	.spark .now {
		background: var(--blue);
	}
	.more {
		margin-top: 12px;
		font-size: 14px;
		padding: 7px 14px;
		border-radius: 999px;
		border: 1px solid var(--axis);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}
	.more:hover {
		border-color: var(--ink-3);
		color: var(--ink);
	}
</style>
