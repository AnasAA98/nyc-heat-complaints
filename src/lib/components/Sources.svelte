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
			name: `PLUTO tax lot file, version ${meta.plutoVersion}`,
			publisher: 'Department of City Planning',
			href: open('64uk-42ks'),
			use: 'The number of homes on each tax lot, its owner and its census tract.',
			fetched: meta.fetchedAt.pluto
		},
		{
			name: 'Housing Maintenance Code Violations',
			publisher: 'Housing Preservation and Development',
			href: open('wvxf-dwi5'),
			use: 'Violations inspectors issued for failing to provide heat or hot water.',
			fetched: meta.fetchedAt.violations
		},
		{
			name: 'Housing Litigations',
			publisher: 'Housing Preservation and Development',
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

<ul>
	{#each SOURCES as s (s.name)}
		<li class="card">
			<p class="publisher">{s.publisher}</p>
			<a href={s.href}>{s.name}</a>
			<p class="use">{s.use}</p>
			<p class="when">Downloaded {nycDate(s.fetched)}</p>
		</li>
	{/each}
</ul>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}
	li {
		display: flex;
		flex-direction: column;
		padding: 18px;
		border-radius: 16px;
		box-shadow: none;
	}
	.publisher {
		margin: 0 0 6px;
		font-size: 11.5px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	a {
		font-size: 15.5px;
		line-height: 1.3;
		font-weight: 650;
		letter-spacing: -0.01em;
	}
	.use {
		margin: 8px 0 12px;
		font-size: 13.5px;
		line-height: 1.45;
		color: var(--ink-2);
	}
	.when {
		margin: auto 0 0;
		font-size: 12px;
		color: var(--ink-3);
	}
	@media (max-width: 860px) {
		ul {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 560px) {
		ul {
			grid-template-columns: 1fr;
		}
	}
</style>
