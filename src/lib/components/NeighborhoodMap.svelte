<script lang="ts">
	import { geoMercator, geoPath } from 'd3-geo';
	import { onMount } from 'svelte';
	import { feature, merge, mesh } from 'topojson-client';
	import type { GeometryCollection, Topology } from 'topojson-specification';
	import topoJson from '#lib/data/nta-topo.json';
	import { num, ordinal, pct, seasonLabel } from '#lib/format.ts';
	import Figure from './Figure.svelte';
	import Segmented from './Segmented.svelte';

	interface Area {
		id: string;
		name: string;
		boro: string;
		rated: boolean;
		apartments: number;
		buildings: number;
		c: number[]; // complaints, per season
		nd: number[]; // ...without repeat calls
		sf: number[]; // closed after someone said it was fixed
		v: number[]; // closed with a violation
		b: number[]; // buildings with at least one complaint
		hv: number[]; // heat and hot water violations in HPD's records
		rate: number[] | null; // complaints per 1,000 apartments
	}
	interface Props {
		seasons: readonly string[];
		cityRate: number[];
		areas: Area[];
		minApartments: number;
		// Citywide totals, the same ones the article quotes.
		cityApartments: number;
		cityBuildings: number;
	}
	let { seasons, cityRate, areas, minApartments, cityApartments, cityBuildings }: Props = $props();

	// Fixed classes for every season, so the colors mean the same thing as you switch.
	const BREAKS = [25, 50, 100, 150, 250];
	const RAMP = [1, 2, 3, 4, 5, 6].map((n) => `var(--seq-${n})`);
	const colorFor = (rate: number) => RAMP[BREAKS.filter((b) => rate >= b).length];

	type Props_ = { nta2020: string; ntaname: string; boroname: string };
	const topo = topoJson as unknown as Topology;
	const object = topo.objects.nta as GeometryCollection<Props_>;
	const shapes = feature(topo, object);
	const boro = (geometry: unknown) => (geometry as { properties: Props_ }).properties.boroname;
	const hoodLines = mesh(topo, object, (a, b) => a !== b);
	const boroughLines = mesh(topo, object, (a, b) => a !== b && boro(a) !== boro(b));
	const BOROUGHS = ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island'];
	const boroughShapes = BOROUGHS.map((name) => ({
		name,
		shape: merge(
			topo,
			object.geometries.filter((g) => boro(g) === name) as Parameters<typeof merge>[1]
		)
	}));

	// svelte-ignore state_referenced_locally (the latest season is only the starting value)
	let season = $state(seasons.at(-1)!);
	let selectedId = $state<string | null>(null);
	let hoverId = $state<string | null>(null);
	let tip = $state({ x: 0, y: 0 });
	let query = $state('');
	let width = $state(640);
	let mounted = $state(false);
	let frame: HTMLElement;
	onMount(() => (mounted = true));

	const i = $derived(seasons.indexOf(season));
	const height = $derived(Math.round(width * 0.97));
	const byId = $derived(new Map(areas.map((a) => [a.id, a])));
	const rated = $derived(areas.filter((a) => a.rate));
	const ranked = $derived([...rated].sort((a, b) => b.rate![i] - a.rate![i]));
	const rankOf = $derived(new Map(ranked.map((a, k) => [a.id, k + 1])));
	const selected = $derived(selectedId ? (byId.get(selectedId) ?? null) : null);
	const label = (a: Area) => `${a.name}, ${a.boro}`;

	// Everything the detail panel shows, for a neighborhood or the whole city.
	const city = $derived.by(() => {
		const total = (key: 'c' | 'nd' | 'sf' | 'v' | 'b' | 'hv') =>
			seasons.map((_, k) => areas.reduce((sum, a) => sum + a[key][k], 0));
		return {
			apartments: cityApartments,
			buildings: cityBuildings,
			nd: total('nd'),
			sf: total('sf'),
			v: total('v'),
			b: total('b'),
			hv: total('hv'),
			rate: cityRate
		};
	});
	const panel = $derived(selected?.rate ? { ...selected, rate: selected.rate } : city);
	const panelMax = $derived(Math.max(...panel.rate, ...cityRate));

	const path = $derived(geoPath(geoMercator().fitSize([width, height], shapes)));
	const drawn = $derived(
		mounted
			? shapes.features.map((f) => {
					const area = byId.get(f.properties.nta2020);
					return { id: f.properties.nta2020, name: f.properties.ntaname, d: path(f) ?? '', area };
				})
			: []
	);
	const boroughLabels = $derived(
		mounted ? boroughShapes.map((b) => ({ name: b.name, at: path.centroid(b.shape) })) : []
	);

	function move(e: PointerEvent, id: string) {
		const box = frame.getBoundingClientRect();
		hoverId = id;
		tip = { x: e.clientX - box.left, y: e.clientY - box.top };
	}
	function pick(id: string) {
		const area = byId.get(id);
		selectedId = area?.rate ? (selectedId === id ? null : id) : selectedId;
		query = selectedId && area ? label(area) : '';
	}
	function search() {
		const match = rated.find((a) => label(a).toLowerCase() === query.trim().toLowerCase());
		if (match) selectedId = match.id;
	}
</script>

<Figure
	title="Where heat complaints are most common"
	subtitle="Heat and hot water complaints for every 1,000 apartments, by neighborhood. Click a neighborhood, or search for one."
	source="NYC Open Data, 311 Service Requests and HPD violations; Department of City Planning, PLUTO and 2020 Neighborhood Tabulation Areas."
	note="Counts buildings with three or more homes and leaves out public housing, whose tenants report to NYCHA instead of 311. Neighborhoods with fewer than {num(minApartments)} such apartments are not rated, and every figure in the panel covers those buildings only. Areas with many co-ops and condos tend to have lower rates because owners rarely file these complaints."
	width="full"
	tableLabel="Show every neighborhood"
	id="map"
>
	{#snippet controls()}
		<div class="control-row">
			<Segmented label="Heat season" options={seasons} bind:value={season} format={seasonLabel} />
			<label class="search">
				<span class="visually-hidden">Find a neighborhood</span>
				<input
					type="search"
					list="neighborhoods"
					placeholder="Find a neighborhood"
					bind:value={query}
					oninput={search}
					onchange={search}
				/>
				<datalist id="neighborhoods">
					{#each rated as a (a.id)}<option value={label(a)}></option>{/each}
				</datalist>
			</label>
		</div>
	{/snippet}

	<div class="layout">
		<div class="map">
			<div class="key-block" aria-hidden="true">
				<span class="unit">Complaints per 1,000 apartments</span>
				<div class="scale">
					<div class="ramp">
						{#each RAMP as color, k (color)}
							<span class="step" style:background={color}>
								{#if k > 0}<span class="break">{BREAKS[k - 1]}</span>{/if}
							</span>
						{/each}
					</div>
					<span class="none"><span class="swatch" style:background="var(--nodata)"></span>Not rated</span>
				</div>
			</div>

			<div class="frame" bind:this={frame} bind:clientWidth={width} style:aspect-ratio="1 / 0.97">
				{#if mounted}
					<svg
						{width}
						{height}
						role="img"
						aria-label="Map of New York City neighborhoods shaded by heat complaints per 1,000 apartments, {seasonLabel(season)}. Use the search box or the table below to read any neighborhood."
					>
						{#each drawn as shape (shape.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
							<path
								class="hood"
								class:clickable={!!shape.area?.rate}
								d={shape.d}
								fill={shape.area?.rate ? colorFor(shape.area.rate[i]) : 'var(--nodata)'}
								onpointermove={(e) => move(e, shape.id)}
								onpointerleave={() => (hoverId = null)}
								onclick={() => pick(shape.id)}
							/>
						{/each}
						<path class="hood-lines" d={path(hoodLines)} />
						<path class="borough-lines" d={path(boroughLines)} />
						{#each drawn.filter((s) => s.id === hoverId || s.id === selectedId) as shape (shape.id)}
							<path class="outline" class:selected={shape.id === selectedId} d={shape.d} />
						{/each}
						{#each boroughLabels as b (b.name)}
							<text class="borough-label" x={b.at[0]} y={b.at[1]} text-anchor="middle">{b.name}</text>
						{/each}
					</svg>
				{/if}

				{#if hoverId}
					{@const area = byId.get(hoverId)}
					{@const shape = drawn.find((s) => s.id === hoverId)}
					<div class="tip" class:flip={tip.x > width * 0.6} style:left="{tip.x}px" style:top="{tip.y}px">
						<span class="tip-head">{area ? area.boro : ''}</span>
						<strong>{area?.name ?? shape?.name}</strong>
						{#if area?.rate}
							{num(Math.round(area.rate[i]))} complaints per 1,000 apartments
						{:else}
							Not rated: park, airport or few apartments
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<aside class="panel" aria-live="polite">
			<p class="where">{selected ? selected.boro : 'All five boroughs'} · {seasonLabel(season)}</p>
			<h4>{selected ? selected.name : 'New York City'}</h4>

			<p class="hero">
				<span class="figure">{num(Math.round(panel.rate[i]))}</span>
				<span class="unit">complaints per 1,000 apartments</span>
			</p>
			{#if selected}
				<p class="context">
					{ordinal(rankOf.get(selected.id)!)} highest of {rated.length} neighborhoods.
					{#if panel.rate[i] >= cityRate[i]}
						{(panel.rate[i] / cityRate[i]).toFixed(1)} times the citywide rate of {num(Math.round(cityRate[i]))}.
					{:else}
						Below the citywide rate of {num(Math.round(cityRate[i]))}.
					{/if}
				</p>
			{:else}
				<p class="context">Across {num(panel.apartments)} apartments in {num(panel.buildings)} buildings.</p>
			{/if}

			<div class="trend" role="img" aria-label="Complaints per 1,000 apartments in each season: {seasons.map((s, k) => `${seasonLabel(s)}, ${Math.round(panel.rate[k])}`).join('; ')}">
				{#each seasons as s, k (s)}
					<div class="col" class:current={k === i}>
						<span class="val">{Math.round(panel.rate[k])}</span>
						<span class="track">
							<span class="fill" style:height="{(panel.rate[k] / panelMax) * 100}%"></span>
							{#if selected}<span class="city" style:bottom="{(cityRate[k] / panelMax) * 100}%"></span>{/if}
						</span>
						<span class="lab">’{s.slice(2, 4)}–{s.slice(5)}</span>
					</div>
				{/each}
			</div>
			{#if selected}<p class="key"><span class="city-key"></span>Citywide rate</p>{/if}

			<dl>
				<div>
					<dt>Buildings with at least one complaint</dt>
					<dd>{pct(panel.b[i] / panel.buildings)}</dd>
				</div>
				<div>
					<dt><span class="swatch" style:background="var(--orange)"></span>Closed after someone said it was fixed</dt>
					<dd>{panel.nd[i] ? pct(panel.sf[i] / panel.nd[i]) : '—'}</dd>
				</div>
				<div>
					<dt><span class="swatch" style:background="var(--violet)"></span>Closed with a violation</dt>
					<dd>{panel.nd[i] ? pct(panel.v[i] / panel.nd[i]) : '—'}</dd>
				</div>
				<div>
					<dt>Heat and hot water violations inspectors wrote</dt>
					<dd>{num(panel.hv[i])}</dd>
				</div>
			</dl>

			{#if selected}
				<button type="button" class="reset" onclick={() => ((selectedId = null), (query = ''))}>← Back to citywide</button>
			{:else}
				<p class="list-title">Highest rates, {seasonLabel(season)}</p>
				<ol class="top">
					{#each ranked.slice(0, 5) as a (a.id)}
						<li>
							<button type="button" onclick={() => pick(a.id)}>
								<span>{a.name}<small>{a.boro}</small></span>
								<b>{num(Math.round(a.rate![i]))}</b>
							</button>
						</li>
					{/each}
				</ol>
			{/if}
		</aside>
	</div>

	{#snippet table()}
		<table class="data-table">
			<caption class="visually-hidden">Heat complaints per 1,000 apartments by neighborhood, {seasonLabel(season)}</caption>
			<thead>
				<tr>
					<th scope="col">Neighborhood</th>
					<th scope="col">Borough</th>
					<th scope="col">Per 1,000 apartments</th>
					<th scope="col">Complaints</th>
					<th scope="col">Apartments</th>
				</tr>
			</thead>
			<tbody>
				{#each ranked as a (a.id)}
					<tr>
						<th scope="row">{a.name}</th>
						<td>{a.boro}</td>
						<td>{a.rate![i].toFixed(1)}</td>
						<td>{num(a.c[i])}</td>
						<td>{num(a.apartments)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
</Figure>

<style>
	.control-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px 20px;
	}
	.search input {
		width: 260px;
		max-width: 100%;
		font-size: 14px;
		padding: 7px 12px;
		height: 40px;
		border-radius: 999px;
		border: 1px solid var(--axis);
		background: var(--inset);
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr);
		gap: 32px;
		align-items: start;
	}
	.key-block {
		font-size: 12.5px;
		color: var(--ink-2);
		margin-bottom: 8px;
	}
	.key-block .unit {
		display: block;
		margin-bottom: 6px;
		font-weight: 550;
	}
	.scale {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}
	.ramp {
		display: flex;
		gap: 2px;
		padding-bottom: 18px; /* room for the numbers under the steps */
	}
	.step {
		position: relative;
		width: 40px;
		height: 10px;
	}
	.step:first-child {
		border-radius: 3px 0 0 3px;
	}
	.step:last-child {
		border-radius: 0 3px 3px 0;
	}
	.break {
		position: absolute;
		left: -1px;
		top: 13px;
		transform: translateX(-50%);
		font-size: 11.5px;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.none {
		white-space: nowrap;
		line-height: 10px;
	}
	.frame {
		position: relative;
		width: 100%;
	}
	svg {
		display: block;
		position: absolute;
		inset: 0;
	}
	.hood {
		transition: fill 200ms;
	}
	.hood.clickable {
		cursor: pointer;
	}
	.hood-lines {
		fill: none;
		stroke: var(--surface);
		stroke-width: 0.6;
		pointer-events: none;
	}
	.borough-lines {
		fill: none;
		stroke: var(--surface);
		stroke-width: 2;
		pointer-events: none;
	}
	.outline {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1.5;
		pointer-events: none;
	}
	.outline.selected {
		stroke-width: 2.5;
	}
	.borough-label {
		font-size: 11px;
		font-weight: 650;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--surface);
		stroke-width: 3px;
		stroke-linejoin: round;
		pointer-events: none;
	}
	.tip {
		transform: translate(14px, 14px);
	}
	.tip.flip {
		transform: translate(calc(-100% - 14px), 14px);
	}

	.panel {
		padding: 22px;
		border-radius: 16px;
		background: var(--inset);
	}
	.where {
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	h4 {
		margin: 4px 0 12px;
		font-size: 26px;
		line-height: 1.1;
		font-weight: 650;
		letter-spacing: -0.025em;
		text-wrap: balance;
	}
	.hero {
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.hero .figure {
		font-size: 56px;
		line-height: 0.95;
		font-weight: 680;
		letter-spacing: -0.04em;
		color: var(--blue);
	}
	.hero .unit {
		font-size: 13.5px;
		line-height: 1.25;
		color: var(--ink-2);
		max-width: 16ch;
	}
	.context {
		margin: 8px 0 0;
		font-size: 14px;
		color: var(--ink-2);
	}
	.trend {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		margin-top: 18px;
	}
	.col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		font-size: 11.5px;
		color: var(--ink-3);
		font-variant-numeric: tabular-nums;
	}
	.track {
		position: relative;
		width: 100%;
		max-width: 24px;
		height: 72px;
		display: flex;
		align-items: flex-end;
		border-bottom: 1px solid var(--axis);
	}
	.fill {
		width: 100%;
		background: var(--gray-b);
		border-radius: 4px 4px 0 0;
	}
	.current .fill {
		background: var(--blue);
	}
	.current .val,
	.current .lab {
		color: var(--ink);
		font-weight: 650;
	}
	.city {
		position: absolute;
		left: -4px;
		right: -4px;
		height: 2px;
		background: var(--ink);
		transform: translateY(1px);
	}
	.key {
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--ink-3);
	}
	.city-key {
		display: inline-block;
		width: 14px;
		height: 2px;
		background: var(--ink);
		vertical-align: middle;
		margin-right: 6px;
	}
	dl {
		margin: 16px 0 0;
		border-top: 1px solid var(--rule);
	}
	dl div {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
		padding: 8px 0;
		border-bottom: 1px solid var(--rule);
		font-size: 14px;
	}
	dt {
		color: var(--ink-2);
	}
	dd {
		margin: 0;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
	}
	.reset {
		margin-top: 14px;
		background: none;
		border: 0;
		padding: 4px 0;
		font-size: 14px;
		color: var(--ink-2);
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--axis);
		text-underline-offset: 3px;
	}
	.reset:hover {
		color: var(--ink);
	}
	.list-title {
		margin: 18px 0 4px;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	.top {
		list-style: none;
		margin: 0;
		padding: 0;
		counter-reset: rank;
	}
	.top button {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 7px 6px;
		margin: 0 -6px;
		width: calc(100% + 12px);
		background: none;
		border: 0;
		border-radius: 4px;
		text-align: left;
		font-size: 14px;
		cursor: pointer;
	}
	.top button:hover {
		background: var(--hover);
	}
	.top small {
		margin-left: 6px;
		font-size: 12.5px;
		color: var(--ink-3);
	}
	.top b {
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 820px) {
		.layout {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.search,
		.search input {
			width: 100%;
		}
	}
</style>
