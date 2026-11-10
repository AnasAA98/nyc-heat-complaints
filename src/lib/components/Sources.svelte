<script lang="ts">
	import { nycDate } from '#lib/format.ts';

	interface Props {
		meta: { fetchedAt: Record<string, string>; plutoVersion: string };
	}
	let { meta }: Props = $props();

	const open = (id: string) => `https://data.cityofnewyork.us/d/${id}`;
	const SOURCES = $derived([
		{
			name: '311 Service Requests from 2020 to Present',
			publisher: 'NYC Open Data',
			href: open('erm2-nwe9'),
			use: 'Every heat and hot water complaint, when it was filed and closed, and the message it was closed with.',
			fetched: meta.fetchedAt.complaints
		},
		{
			name: `Primary Land Use Tax Lot Output (PLUTO), version ${meta.plutoVersion}`,
			publisher: 'Department of City Planning',
			href: open('64uk-42ks'),
			use: 'The number of homes on each tax lot, its owner type and its census tract.',
			fetched: meta.fetchedAt.pluto
		},
		{
			name: 'Housing Maintenance Code Violations',
			publisher: 'Department of Housing Preservation and Development',
			href: open('wvxf-dwi5'),
			use: 'Violations inspectors issued for failing to provide heat or hot water.',
			fetched: meta.fetchedAt.violations
		},
		{
			name: 'Housing Litigations',
			publisher: 'Department of Housing Preservation and Development',
			href: open('59kj-x8nc'),
			use: 'Heat and hot water cases the agency brought against owners in housing court.',
			fetched: meta.fetchedAt.litigation
		},
		{
			name: '2020 Neighborhood Tabulation Areas',
			publisher: 'Department of City Planning',
			href: open('9nt8-h7nd'),
			use: 'Neighborhood names and boundaries, joined to tax lots through the city’s census tract table.',
			fetched: meta.fetchedAt.geo
		},
		{
			name: 'Daily Summaries, Central Park station',
			publisher: 'National Oceanic and Atmospheric Administration',
			href: 'https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily',
			use: 'Each day’s high and low temperature.',
			fetched: meta.fetchedAt.weather
		}
	]);
</script>

<h3>The data</h3>
<ul>
	{#each SOURCES as s (s.name)}
		<li>
			<a href={s.href}>{s.name}</a>
			<span class="publisher">{s.publisher}</span>
			<span class="use">{s.use} Downloaded {nycDate(s.fetched)}.</span>
		</li>
	{/each}
</ul>

<style>
	h3 {
		font-family: var(--sans);
		font-size: 18px;
		line-height: 1.3;
		font-weight: 700;
		margin: 32px 0 10px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--rule);
	}
	li {
		padding: 10px 0;
		border-bottom: 1px solid var(--rule);
		font-size: 15px;
		line-height: 1.45;
	}
	a {
		font-weight: 650;
		color: var(--ink);
	}
	.publisher {
		font-size: 13px;
		color: var(--ink-3);
		margin-left: 6px;
	}
	.use {
		display: block;
		color: var(--ink-2);
	}
</style>
