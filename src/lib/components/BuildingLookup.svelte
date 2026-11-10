<script lang="ts">
	import { asset } from '$app/paths';
	import type { AssetPath } from '$app/types';
	import { num, seasonLabel } from '#lib/format.ts';
	import Figure from './Figure.svelte';

	// One row of a ZIP file: address, homes, year built, buildings on the lot.
	// Lots with anything on record add per-season complaints, days with a
	// complaint, HPD violations and HPD court cases; a final 1 marks public housing.
	type Row = [string, number, number, number, number[]?, number[]?, number[]?, number[]?, number?];
	interface ZipFile {
		zip: string;
		seasons: string[];
		buildings: Row[];
	}
	interface Props {
		zips: { zip: string; buildings: number }[];
		seasons: readonly string[];
		total: number;
	}
	let { zips, seasons, total }: Props = $props();

	const PAGE = 10;
	const SORTS = { days: 'Most days with a complaint', complaints: 'Most complaints', address: 'Address, A to Z' };
	const known = $derived(new Set(zips.map((z) => z.zip)));
	const none = $derived(seasons.map(() => 0));

	let zip = $state('');
	let filter = $state('');
	// svelte-ignore state_referenced_locally (the latest season is only the starting value)
	let season = $state(seasons.length - 1);
	let sort = $state<keyof typeof SORTS>('days');
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

	const sum = (xs: number[] = []) => xs.reduce((a, b) => a + b, 0);
	const hasRecord = (b: Row) => b.length > 4;
	const matches = $derived.by(() => {
		if (!data) return [];
		const needle = filter.trim().toLowerCase();
		const rows = data.buildings.filter((b) => !needle || b[0].toLowerCase().includes(needle));
		if (sort === 'address') return rows.sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
		const column = sort === 'days' ? 5 : 4;
		const value = (b: Row) => b[column]?.[season] ?? 0;
		return rows.sort((a, b) => value(b) - value(a) || sum(b[5]) - sum(a[5]));
	});
	const withRecords = $derived(data ? data.buildings.filter(hasRecord).length : 0);
</script>

<Figure
	id="lookup"
	title="Find a building"
	subtitle="{num(total)} buildings across the five boroughs. Enter a ZIP code, then narrow by street or address."
	source="NYC Open Data, 311 Service Requests, HPD violations and HPD litigation; Department of City Planning, PLUTO."
	note="Complaints are reports from tenants, not confirmed outages, and include repeat calls. Covers every building with three or more homes, plus smaller homes that had a complaint, violation or court case. An address is a tax lot, which can hold more than one building. Public housing tenants report to NYCHA, so its buildings show few 311 complaints."
>
	{#snippet controls()}
		<div class="inputs">
			<label class="zip">
				<span>ZIP code</span>
				<input type="text" inputmode="numeric" autocomplete="postal-code" placeholder="10468" maxlength="5" bind:value={zip} oninput={onZip} />
			</label>
			<label class="grow">
				<span>Street or address</span>
				<input type="search" placeholder={data ? 'e.g. Creston Avenue' : 'Enter a ZIP code first'} disabled={!data} bind:value={filter} oninput={() => (shown = PAGE)} />
			</label>
			<label>
				<span>Season</span>
				<select bind:value={season}>
					{#each seasons as s, k (s)}<option value={k}>{seasonLabel(s)}</option>{/each}
				</select>
			</label>
			<label>
				<span>Sort by</span>
				<select bind:value={sort}>
					{#each Object.entries(SORTS) as [key, text] (key)}<option value={key}>{text}</option>{/each}
				</select>
			</label>
		</div>
	{/snippet}

	<div class="results" aria-live="polite">
		{#if status === 'idle'}
			<p class="state">Type a five-digit ZIP code to begin.</p>
		{:else if status === 'loading'}
			<p class="state">Loading…</p>
		{:else if status === 'unknown'}
			<p class="state">No buildings found for {zip}. Check that it is a New York City ZIP code.</p>
		{:else if status === 'error'}
			<p class="state">The data for {zip} could not be loaded. Check your connection and try again.</p>
		{:else if data}
			<p class="count">
				<b>{num(matches.length)}</b>
				{matches.length === 1 ? 'building' : 'buildings'}{filter.trim() ? ` matching “${filter.trim()}”` : ''} in {data.zip}
				<span>· {num(withRecords)} of the ZIP code’s buildings have a heat complaint, violation or court case on record</span>
			</p>

			<ul class="list">
				{#each matches.slice(0, shown) as b (b)}
					{@const days = b[5] ?? none}
					{@const peak = Math.max(1, ...days)}
					<li>
						<div class="who">
							<p class="address">{b[0]}</p>
							<p class="meta">
								{num(b[1])} {b[1] === 1 ? 'home' : 'homes'}{b[2] ? ` · built ${b[2]}` : ''}{b[3] > 1 ? ` · ${b[3]} buildings on the lot` : ''}{b[8] ? ' · public housing' : ''}
								{#if sum(b[7])}<span class="chip">{sum(b[7])} city court {sum(b[7]) === 1 ? 'case' : 'cases'}</span>{/if}
							</p>
						</div>
						{#if hasRecord(b)}
							<div class="spark" role="img" aria-label="Days with a complaint: {seasons.map((s, k) => `${seasonLabel(s)}, ${days[k]}`).join('; ')}">
								{#each days as d, k (k)}
									<span class:now={k === season} style:height="{Math.max(d ? 10 : 3, (d / peak) * 100)}%"></span>
								{/each}
							</div>
							<dl>
								<div><dt>Days with a complaint</dt><dd>{days[season]}</dd></div>
								<div><dt>Complaints</dt><dd>{num(b[4]?.[season] ?? 0)}</dd></div>
								<div><dt>Violations</dt><dd>{b[6]?.[season] ?? 0}</dd></div>
							</dl>
							<details>
								<summary>All six seasons</summary>
								<div class="table-wrap">
									<table class="data-table">
										<thead>
											<tr>
												<th scope="col">Season</th>
												<th scope="col">Days with a complaint</th>
												<th scope="col">Complaints</th>
												<th scope="col">Violations</th>
												<th scope="col">Court cases</th>
											</tr>
										</thead>
										<tbody>
											{#each seasons as s, k (s)}
												<tr>
													<th scope="row">{seasonLabel(s)}</th>
													<td>{days[k]}</td>
													<td>{num(b[4]?.[k] ?? 0)}</td>
													<td>{b[6]?.[k] ?? 0}</td>
													<td>{b[7]?.[k] ?? 0}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</details>
						{:else}
							<p class="clean">No heat complaints, violations or court cases on record in six seasons.</p>
						{/if}
					</li>
				{/each}
			</ul>

			{#if matches.length > shown}
				<button type="button" class="more" onclick={() => (shown += 20)}>Show more ({num(matches.length - shown)} left)</button>
			{:else if !matches.length}
				<p class="state">Nothing matches. Addresses are written the city’s way, like “72-10 41 Avenue” or “2800 Creston Avenue.”</p>
			{/if}
		{/if}
	</div>
</Figure>

<style>
	.inputs {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--ink-3);
	}
	.grow {
		flex: 1 1 220px;
	}
	input,
	select {
		height: 44px;
		font-size: 16px; /* 16px keeps iOS from zooming the page on focus */
		padding: 0 14px;
		border-radius: 12px;
		border: 1px solid var(--axis);
		background: var(--inset);
		font-weight: 450;
		color: var(--ink);
	}
	input:disabled {
		opacity: 0.6;
	}
	.zip input {
		width: 7.2em;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.results {
		min-height: 72px;
	}
	.state {
		margin: 0;
		padding: 22px;
		border-radius: var(--radius-sm);
		background: var(--inset);
		font-size: 14.5px;
		color: var(--ink-2);
		text-align: center;
	}
	.count {
		margin: 0 0 12px;
		font-size: 14.5px;
		color: var(--ink);
	}
	.count span {
		color: var(--ink-3);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 92px auto;
		align-items: center;
		gap: 6px 24px;
		padding: 16px 18px;
		border-radius: var(--radius-sm);
		background: var(--inset);
	}
	.address {
		margin: 0;
		font-size: 16px;
		font-weight: 650;
		letter-spacing: -0.01em;
	}
	.meta {
		margin: 2px 0 0;
		font-size: 13px;
		color: var(--ink-3);
	}
	.chip {
		display: inline-block;
		margin-left: 6px;
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--violet-wash);
		color: var(--ink);
		font-size: 12px;
		font-weight: 550;
		white-space: nowrap;
	}
	.spark {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 36px;
	}
	.spark span {
		flex: 1;
		background: var(--gray-b);
		border-radius: 2px 2px 0 0;
	}
	.spark .now {
		background: var(--blue);
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(3, 92px);
		gap: 8px;
	}
	dl div {
		display: flex;
		flex-direction: column-reverse;
		text-align: right;
	}
	dt {
		font-size: 11.5px;
		line-height: 1.25;
		color: var(--ink-3);
	}
	dd {
		margin: 0;
		font-size: 22px;
		line-height: 1.1;
		font-weight: 650;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	dl div:first-child dd {
		color: var(--blue);
	}
	details {
		grid-column: 1 / -1;
		font-size: 13px;
	}
	summary {
		cursor: pointer;
		width: fit-content;
		color: var(--ink-3);
		font-weight: 500;
	}
	summary:hover {
		color: var(--ink);
	}
	.clean {
		grid-column: 2 / -1;
		margin: 0;
		font-size: 13.5px;
		color: var(--ink-3);
		text-align: right;
		max-width: 300px;
		justify-self: end;
	}
	.more {
		display: block;
		margin: 14px auto 0;
		font-size: 14px;
		font-weight: 550;
		padding: 10px 18px;
		border-radius: 999px;
		border: 1px solid var(--axis);
		background: transparent;
		cursor: pointer;
		transition:
			background 150ms,
			border-color 150ms;
	}
	.more:hover {
		background: var(--hover);
		border-color: var(--ink-3);
	}
	@media (max-width: 720px) {
		.grow {
			order: 4;
			flex-basis: 100%;
		}
		li {
			grid-template-columns: minmax(0, 1fr) 72px;
			padding: 14px;
		}
		dl {
			grid-column: 1 / -1;
			grid-template-columns: repeat(3, 1fr);
		}
		dl div {
			text-align: left;
		}
		.clean {
			grid-column: 1 / -1;
			text-align: left;
			justify-self: start;
		}
	}
</style>
