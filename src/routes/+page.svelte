<script lang="ts">
	import OutcomeBars from '#lib/components/OutcomeBars.svelte';
	import outcomes from '#lib/data/outcomes.json';
	import meta from '#lib/data/meta.json';

	const fmt = (n: number) => n.toLocaleString('en-US');
	const asOf = new Date(meta.fetchedAt.complaints).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'America/New_York'
	});
</script>

<svelte:head>
	<title>[TK headline]</title>
	<meta name="description" content="[TK one-line summary]" />
</svelte:head>

<main>
	<header>
		<p class="kicker">New York City · Heat season</p>
		<h1>[TK headline]</h1>
		<p class="dek">[TK 2–3 sentences on what you found]</p>
		<p class="byline">By [TK your name as you want it] · Data as of {asOf}</p>
	</header>

	<OutcomeBars areas={outcomes.areas} seasons={outcomes.seasons} outcomes={outcomes.outcomes} />

	<section>
		<h2>[TK buildings subhead]</h2>
		<p>[TK sentence on buildings where complaints came back after being closed as fixed]</p>
	</section>

	<section class="method">
		<h2>How I did this</h2>
		<p>
			The data comes from NYC Open Data's
			<a href="https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9">311 Service Requests</a>
			dataset, downloaded through its public API. I kept the {fmt(meta.rows.inSeason)} heat and hot water
			complaints filed during heat season (Oct. 1 to May 31) from 2020–21 through 2025–26.
		</p>
		<p>
			Each complaint ends with one of about 30 standard messages from the city's housing agency,
			HPD. I sorted every message into an outcome by hand;
			<a href="https://github.com/AnasAA98/nyc-heat-complaints/blob/main/data/resolution-categories.json">the full list is public</a>.
			"Someone said it was fixed" means a tenant or the person who called told HPD heat was back,
			by phone or at the door, not that an inspector confirmed it.
		</p>
		<p>
			A complaint "came back" if the same building, matched by tax lot number, filed another heat
			complaint within {meta.windowDays} days after it was closed. I left out {fmt(meta.rows.noValidBbl)}
			complaints with no usable building ID.
		</p>
		<h3>What this data can't tell you</h3>
		<ul>
			<li>A complaint is not an outage. Some buildings without heat never call; some tenants call many times.</li>
			<li>People report at different rates in different neighborhoods, and the way they report has shifted from phone to online.</li>
			<li>For about 1 in 10 complaints, the record says only that HPD "conducted or attempted" an inspection, without the result.</li>
			<li>A new complaint within {meta.windowDays} days may be about a new problem, not the same one.</li>
		</ul>
		<p class="small">
			Code and data pipeline: <a href="https://github.com/AnasAA98/nyc-heat-complaints">github.com/AnasAA98/nyc-heat-complaints</a>
		</p>
	</section>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 40px 16px 64px;
	}
	.kicker {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}
	h1 {
		font-family: var(--serif);
		font-size: clamp(28px, 5vw, 40px);
		line-height: 1.15;
		margin: 0 0 12px;
		text-wrap: balance;
	}
	.dek {
		font-family: var(--serif);
		font-size: 19px;
		line-height: 1.45;
		color: var(--ink-2);
		margin: 0 0 12px;
	}
	.byline {
		font-size: 13px;
		color: var(--ink-muted);
		margin: 0 0 28px;
	}
	section {
		margin-top: 36px;
	}
	h2 {
		font-size: 20px;
		margin: 0 0 8px;
	}
	h3 {
		font-size: 16px;
		margin: 20px 0 6px;
	}
	section p,
	li {
		font-family: var(--serif);
		font-size: 17px;
	}
	.method p,
	.method li {
		font-size: 15px;
		color: var(--ink-2);
	}
	.small {
		font-size: 13px !important;
	}
</style>
