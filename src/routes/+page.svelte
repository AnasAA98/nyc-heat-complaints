<script lang="ts">
	import Bento from '#lib/components/Bento.svelte';
	import BuildingLookup from '#lib/components/BuildingLookup.svelte';
	import Callout from '#lib/components/Callout.svelte';
	import ColdChart from '#lib/components/ColdChart.svelte';
	import Concentration from '#lib/components/Concentration.svelte';
	import HeroStrip from '#lib/components/HeroStrip.svelte';
	import NeighborhoodMap from '#lib/components/NeighborhoodMap.svelte';
	import OutcomeBars from '#lib/components/OutcomeBars.svelte';
	import ReturnDots from '#lib/components/ReturnDots.svelte';
	import SeasonScatter from '#lib/components/SeasonScatter.svelte';
	import SectionHead from '#lib/components/SectionHead.svelte';
	import SiteNav from '#lib/components/SiteNav.svelte';
	import Sources from '#lib/components/Sources.svelte';
	import { AUTHOR, REPO, TITLE } from '#lib/config.ts';
	import meta from '#lib/data/meta.json';
	import neighborhoods from '#lib/data/neighborhoods.json';
	import outcomes from '#lib/data/outcomes.json';
	import story from '#lib/data/story.json';
	import weather from '#lib/data/weather.json';
	import zips from '#lib/data/zips.json';
	import { big, date, num, nycDate, pct, seasonLabel } from '#lib/format.ts';

	// Every number in the text below is read from the data files, so the words
	// cannot drift from the charts. `pc` writes a share as "50 percent".
	const pc = (share: number) => `${Math.round(share * 100)} percent`;
	const list = (items: string[]) => `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

	const SECTIONS = [
		{ id: 's-why', label: 'Why' },
		{ id: 's-outcomes', label: 'Outcomes' },
		{ id: 's-followups', label: 'Follow-ups' },
		{ id: 's-weather', label: 'Weather' },
		{ id: 's-map', label: 'Map' },
		{ id: 's-buildings', label: 'Buildings' },
		{ id: 's-lookup', label: 'Find a building' },
		{ id: 'method', label: 'Method' }
	];

	const { complaints, outcomesAllSeasons: overall, outcomesBySeason, returns, buildings, enforcement } = story;
	const seasons = story.seasons;
	const n = seasons.length - 1;
	const first = seasonLabel(story.first);
	const last = seasonLabel(story.last);
	const lastEnd = `${story.last.slice(0, 2)}${story.last.slice(5)}-05-31`;

	// Seasons where an unusually large share closed because inspectors could not get in.
	const access = outcomesBySeason.map((o) => o.no_access);
	const highAccess = seasons.filter((_, k) => access[k] > 0.2);
	const usualAccess = access.filter((a) => a <= 0.2);

	const mid = returns.bySize.find((b) => b.band === '20–49')!;
	const pair = story.weather.closestPair;
	const w = story.weather.seasons;
	const coldest = [...w].sort((a, b) => b.hdd - a.hdd)[0].season === story.last;
	const roseEverySeason = complaints.bySeason.every((c, k, all) => k === 0 || c > all[k - 1]);
	const phone = story.channels.map((c) => c.phone);

	const hoods = story.neighborhoods;
	const topBoroughs = [...new Set(hoods.highest.map((h) => h.boro))];
	const boroName = (b: string) => (b === 'Bronx' ? 'the Bronx' : b);
	const where = topBoroughs.length === 1 ? `all in ${boroName(topBoroughs[0])}` : `in ${list(topBoroughs.map(boroName))}`;

	const latest = buildings.seasons[n];
	const top1 = buildings.seasons.map((s) => s.top1Share);
	const heavy = latest.heavy;
	const every = buildings.repeatEverySeason;
	const violationsWritten = (k: number) => enforcement.heatViolations[k] + enforcement.hotWaterViolations[k];

	// The housing agency's page on the heat and hot water rules.
	const HEAT_RULES = 'https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water-information.page';

	const description = `New Yorkers filed ${big(complaints.total)} heat and hot water complaints over six winters. About half were closed after someone said the heat was back. ${pc(overall.violation)} ended with a violation.`;
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={TITLE} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="article" />
	<meta name="twitter:card" content="summary" />
	<meta name="author" content={AUTHOR} />
</svelte:head>

<SiteNav sections={SECTIONS} />

<main id="top">
	<header class="hero container">
		<p class="pill"><i></i>New York City · Six heat seasons, {story.first.slice(0, 4)} to {lastEnd.slice(0, 4)}</p>
		<h1>{TITLE}</h1>
		<p class="dek">
			New Yorkers filed {big(complaints.total)} heat and hot water complaints over the last six winters. The most
			common ending: someone in the building told the city the heat was back. About {pc(overall.violation)} ended
			with a violation.
		</p>
		<p class="byline">By <b>{AUTHOR}</b><span>·</span>Data through {date(lastEnd)}</p>
	</header>

	<div class="container strip">
		<p class="strip-title">
			<b>Heat and hot water complaints per day</b>
			<span>Oct. 1 to May 31 of each season. Move over the chart to read a day.</span>
		</p>
		<HeroStrip seasons={weather.seasons} />
	</div>

	<div class="container">
		<Bento
			total={complaints.total}
			bySeason={complaints.bySeason}
			{seasons}
			outcomes={overall}
			{pair}
			growth={complaints.growth}
			top1Share={latest.top1Share}
			top1Buildings={latest.top1Buildings}
		/>
	</div>

	<section class="prose copy lede">
		<p>
			From Oct. 1 through May 31, New York City landlords must keep apartments at 68 degrees or warmer during the day
			whenever it is below 55 outside, and at 62 or warmer overnight. Hot water is required all year.
		</p>
		<p>
			When that fails, tenants are told to call 311. Each complaint goes to the Department of Housing Preservation
			and Development, the city’s housing agency, which may call the tenant, contact the owner or send an inspector.
		</p>
	</section>

	<section id="s-why" class="prose">
		<div class="why card">
			<p class="eyebrow">Why I looked into this</p>
			<p class="quote">
				This started in my own apartment in Queens, where I have been suffering from excessive heat. I called my
				super. I called building management. I called 311. None of them were able to help. I am still dealing
				with it.
			</p>
			<p>
				New York’s <a href={HEAT_RULES}>heat rules</a> set a minimum temperature for apartments and no maximum. That
				made me want to see how the system handles the heat complaints it is built for. So I downloaded the city’s
				record of every heat and hot water complaint from the last six winters, {big(complaints.total)} of them, and
				followed what happened to each one.
			</p>
			<p>
				This page is what I found: how complaints end, when they surge, where they come from and which buildings
				they keep coming from.
			</p>
			<p class="signed">{AUTHOR}</p>
		</div>
	</section>

	<section id="s-outcomes">
		<SectionHead number="01" label="Outcomes" title="How a complaint ends" />
		<div class="prose copy">
			<p>
				Many complaints are repeat calls. When several tenants report the same building-wide outage, the city marks
				the later calls as duplicates of the first. That describes {num(complaints.duplicates)} of the
				{big(complaints.total)} complaints, or {pc(complaints.duplicates / complaints.total)}. The chart sets those
				aside and shows what happened to the rest.
			</p>
		</div>

		<OutcomeBars areas={outcomes.areas} seasons={outcomes.seasons} outcomes={outcomes.outcomes} />

		<div class="prose copy">
			<p>
				Over six seasons, {pc(overall.said_fixed)} of complaints were closed after a tenant or another occupant told
				the agency the problem was fixed, either on the phone or when an inspector arrived. In {pc(overall.no_access)},
				an inspector could not get into the apartment or the building. In {pc(overall.not_stated)}, the record says
				only that an inspection was “conducted or attempted,” without a result.
			</p>
		</div>

		<Callout value={pct(overall.violation)} tone="violet">
			of complaints ended with a violation. In another {pc(overall.no_violation)}, an inspector looked and did not
			issue one.
		</Callout>

		<div class="prose copy">
			<p>
				A complaint closed on someone’s word is not a failure. It can mean the heat came back before anyone needed
				to inspect. But the record cannot show how long a building was cold, or whether it stayed warm.
			</p>
			{#if highAccess.length && usualAccess.length}
				<p>
					One shift stands out. In {highAccess.length === 1 ? seasonLabel(highAccess[0]) : list(highAccess.map(seasonLabel))},
					about {pc(Math.max(...highAccess.map((s) => access[seasons.indexOf(s)])))} of complaints were closed because
					an inspector could not get in. In the other seasons it was {Math.round(Math.min(...usualAccess) * 100)} to
					{pc(Math.max(...usualAccess))}. The data does not say why.
				</p>
			{/if}
		</div>
	</section>

	<section id="s-followups">
		<SectionHead number="02" label="Follow-ups" title="A closed complaint is often not the end" />
		<div class="prose copy">
			<p>
				What happens in the week after a complaint is closed? Often, another complaint. In buildings with 20 to 49
				apartments, {pc(mid.said_fixed.rate)} of complaints closed as fixed were followed by a new heat complaint from
				the same building within {returns.windowDays} days.
			</p>
			<p>
				That is not special to complaints closed on someone’s word. When a complaint in a building of the same size
				ended with a violation, a new one followed {pc(mid.violation.rate)} of the time. The pattern holds for
				buildings of every size.
			</p>
		</div>

		<ReturnDots bySize={returns.bySize} windowDays={returns.windowDays} />

		<div class="prose copy">
			<p>
				A follow-up complaint does not prove the same problem came back. It may come from another apartment, or be
				about hot water instead of heat. What the numbers do show is that closing a complaint, by any route, often
				did not end the calls from a building.
			</p>
		</div>
	</section>

	<section id="s-weather">
		<SectionHead number="03" label="Weather" title="Complaints follow the cold, but not only the cold" />
		<div class="prose copy">
			<p>
				Heat complaints track the weather closely. On days when the low in Central Park was at or below freezing,
				the city averaged {num(story.weather.freezingDayAverage)} complaints a day. On every other day of the heat
				season, it averaged {num(story.weather.otherDayAverage)}.
			</p>
			<p>
				The busiest day in six seasons was {date(story.weather.peak.date, { weekday: true })}. The low was
				{story.weather.peak.tmin} degrees, and {num(story.weather.peak.complaints)} complaints came in.
			</p>
		</div>

		<ColdChart seasons={weather.seasons} />

		<div class="prose copy">
			<p>
				Complaints {roseEverySeason ? 'have risen every season' : 'have risen'}, from {num(complaints.bySeason[0])} in
				{first} to {num(complaints.bySeason[n])} in {last}, an increase of {pc(complaints.growth - 1)}.
				{#if coldest}Last winter was the coldest of the six. But colder weather is only part of it.{/if}
			</p>
		</div>

		{#if pair}
			<Callout value="+{pct(pair.increase)}" tone="blue">
				more complaints in {seasonLabel(pair.later)} than in {seasonLabel(pair.earlier)}. By the standard measure,
				heating degree days, the two winters were equally cold.
			</Callout>
		{/if}

		<SeasonScatter seasons={w} hddBase={story.weather.hddBase} {pair} />

		<div class="prose copy">
			<p>
				The data cannot say why. More buildings may be losing heat. More tenants may know to call, or to keep
				calling. How people file also moves around: the share of complaints made by phone, rather than online or in
				the 311 app, ranged from {Math.round(Math.min(...phone) * 100)} to {pc(Math.max(...phone))} depending on
				the season.
			</p>
		</div>
	</section>

	<section id="s-map">
		<SectionHead number="04" label="Map" title="Where the complaints come from" />
		<div class="prose copy">
			<p>
				Across the city there were {num(Math.round(hoods.cityRate[n]))} heat complaints for every 1,000 apartments
				last season. In {hoods.aboveDoubleCity} of the {hoods.rated} neighborhoods measured, the rate was at least
				twice that.
			</p>
			<p>The five highest rates were {where}: {list(hoods.highest.map((h) => h.name))}.</p>
		</div>

		<NeighborhoodMap
			seasons={neighborhoods.seasons}
			cityRate={neighborhoods.cityRate}
			areas={neighborhoods.areas}
			minApartments={hoods.minApartments}
			cityApartments={story.apartments.homes}
			cityBuildings={story.apartments.buildings}
		/>
	</section>

	<section id="s-buildings">
		<SectionHead number="05" label="Buildings" title="The same buildings, winter after winter" />
		<div class="prose copy">
			<p>
				New York has about {num(Math.round(story.apartments.buildings / 1000) * 1000)} apartment buildings. Last
				season, {pc(1 - latest.shareWithComplaint)} of them had no heat complaint at all.
			</p>
			<p>
				The complaints came from a small share of the rest. One percent of apartment buildings, {num(latest.top1Buildings)}
				of them, accounted for {pc(latest.top1Share)} of all complaints. Those buildings hold
				{pc(latest.top1ApartmentShare)} of the city’s apartments. In each of the six seasons, the top 1 percent
				accounted for {Math.round(Math.min(...top1) * 100)} to {pc(Math.max(...top1))}.
			</p>
		</div>

		<Concentration stats={latest} buildings={story.apartments.buildings} />

		<div class="prose copy">
			<p>
				{num(heavy.buildings)} buildings had complaints on {buildings.heavyDays} or more separate days last season,
				up from {num(buildings.seasons[0].heavy.buildings)} in {first}. The city acted on most of them: inspectors
				issued a heat or hot water violation at {pc(heavy.withViolation / heavy.buildings)}, and the housing agency
				took the owners of {pc(heavy.withCase / heavy.buildings)} to court.
			</p>
		</div>

		<Callout value={num(every.buildings)} tone="blue">
			apartment buildings had complaints on at least {buildings.repeatDays} days in every one of the six seasons.
			Together they hold about {num(Math.round(every.apartments / 1000) * 1000)} apartments.
		</Callout>

		<div class="prose copy">
			<p>
				Inspectors issued violations at {num(every.withViolationAnySeason)} of those {num(every.buildings)} buildings
				at some point in the six years, and the city took {num(every.withCaseAnySeason)} of them to court. The
				complaints kept coming.
			</p>
		</div>
	</section>

	<section id="s-lookup">
		<SectionHead number="06" label="Find a building" title="Look up your own building" />
		<div class="prose copy">
			<p>
				Search {num(meta.lookup.buildings)} buildings: every apartment building in the city, and any smaller home
				with a heat complaint on record. Each one shows its complaints season by season, the violations inspectors
				issued and any heat case the city brought in court.
			</p>
		</div>

		<BuildingLookup {zips} seasons={story.seasons} total={meta.lookup.buildings} />
	</section>

	<section id="method" class="method">
		<SectionHead number="07" label="Method" title="How I did this" />
		<div class="prose copy">
			<p>
				Everything here comes from public records, almost all of it from NYC Open Data. The code that downloads,
				checks and analyzes the data is <a href={REPO}>on GitHub</a>, and it can rebuild every number on this page.
			</p>
		</div>

		<div class="container sources">
			<Sources {meta} />
		</div>

		<div class="prose copy small">
			<h3>The steps</h3>
			<ol>
				<li>
					I downloaded every 311 complaint labeled “HEAT/HOT WATER” that was filed from Oct. 1, 2020, to June 7, 2026:
					{num(meta.rows.downloaded)} rows. After each download, the script compares its row count with the count the
					city’s API reports and stops if they differ.
				</li>
				<li>
					I kept the {num(meta.rows.inSeason)} complaints filed during heat season, Oct. 1 to May 31. Timestamps are
					read as New York time straight from the text, so no time zone conversion can move a complaint across a
					season boundary.
				</li>
				<li>
					Each complaint ends with one of {meta.closingTexts} standard messages. I read each one and sorted it into an
					outcome; <a href="{REPO}/blob/main/data/resolution-categories.json">the full list is public</a>. If the city
					starts using a new message, the build stops until someone reads it.
				</li>
				<li>
					I matched complaints to buildings by tax lot number and to the city’s PLUTO file (version {meta.plutoVersion})
					for each lot’s number of homes and census tract. {num(meta.rows.noValidBbl)} complaints had no usable lot
					number and {num(meta.rows.notInPluto)} matched no residential lot. They are counted in the outcome chart but
					not in the building or neighborhood figures.
				</li>
				<li>
					Rates use apartments in buildings with three or more homes, and leave out public housing. Tenants of the
					New York City Housing Authority report heat problems to NYCHA, not through 311: only
					{num(meta.rows.inPublicHousing)} complaints came from its lots.
				</li>
				<li>
					A complaint counts as followed by another if the same tax lot had a new heat complaint within
					{meta.windowDays} days after the first was closed. I skipped {num(meta.rows.skippedOpenOrBadDates)} complaints
					that were still open or whose closing date came before the filing date.
				</li>
				<li>
					Violations are the housing agency’s own records of orders to provide heat (sections 27-2028 and 27-2029 of
					the housing code) or hot water (section 27-2031), counted by inspection date. Court cases are the agency’s
					“Heat and Hot Water” cases, counted by the date they were opened.
				</li>
			</ol>

			<h3>What this data can’t tell you</h3>
			<ul>
				<li>A complaint is not an outage. Some cold buildings never call. Some tenants call many times.</li>
				<li>
					Complaints and violations count different things. One building-wide outage can produce dozens of complaints
					and a single violation, so the two should not be read as a success rate.
				</li>
				<li>
					311 files heat and hot water under one label, so the complaint figures cannot separate them. Last season
					inspectors wrote {num(enforcement.heatViolations[n])} heat violations and
					{num(enforcement.hotWaterViolations[n])} hot water violations, {num(violationsWritten(n))} in all.
				</li>
				<li>
					For {pc(overall.not_stated)} of complaints the record says only that an inspection was conducted or
					attempted. The result is in a separate system.
				</li>
				<li>
					A “building” here is a tax lot. Large complexes can sit on one lot, and a new complaint from a lot may
					come from a different apartment or building than the last one.
				</li>
				<li>
					Per-apartment rates count co-ops and condos, whose owners rarely file these complaints, so neighborhoods
					with many of them look better than their rentals alone would.
				</li>
				<li>
					Some complaints from last season were still open when the data was downloaded on
					{nycDate(meta.fetchedAt.complaints)}. They appear under “Other.”
				</li>
			</ul>
		</div>
	</section>

	<footer class="container">
		<p>
			Reporting, analysis and graphics by {AUTHOR}. Built with Svelte, TypeScript and D3.
			<a href={REPO}>Code and data pipeline on GitHub</a>.
		</p>
		<a class="up" href="#top">Back to top ↑</a>
	</footer>
</main>

<style>
	main {
		padding-bottom: 56px;
	}
	.container {
		max-width: calc(var(--full) + 2 * var(--gutter));
		margin: 0 auto;
		padding: 0 var(--gutter);
	}
	.prose {
		max-width: calc(var(--text) + 2 * var(--gutter));
		margin: 0 auto;
		padding: 0 var(--gutter);
	}
	section {
		margin-top: 104px;
		scroll-margin-top: calc(var(--nav) + 24px);
	}

	/* Hero */
	.hero {
		padding-top: clamp(40px, 8vw, 96px);
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 24px;
		padding: 6px 14px 6px 10px;
		border-radius: 999px;
		border: 1px solid var(--rule);
		background: var(--panel);
		font-size: 13px;
		font-weight: 550;
		color: var(--ink-2);
	}
	.pill i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--blue);
		box-shadow: 0 0 0 4px var(--blue-wash);
	}
	h1 {
		max-width: 15ch;
		margin: 0 0 28px;
		font-size: clamp(42px, 8.2vw, 96px);
		line-height: 0.98;
		font-weight: 660;
		letter-spacing: -0.045em;
		text-wrap: balance;
	}
	.dek {
		max-width: 44ch;
		margin: 0 0 28px;
		font-size: clamp(19px, 2.3vw, 24px);
		line-height: 1.4;
		letter-spacing: -0.012em;
		color: var(--ink-2);
		text-wrap: pretty;
	}
	.byline {
		margin: 0;
		font-size: 14.5px;
		color: var(--ink-3);
	}
	.byline b {
		color: var(--ink);
		font-weight: 600;
	}
	.byline span {
		margin: 0 8px;
	}

	.strip {
		margin-top: clamp(40px, 6vw, 72px);
		margin-bottom: 20px;
	}
	.strip-title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
		margin: 0 0 4px;
		font-size: 14px;
		color: var(--ink-3);
	}
	.strip-title b {
		color: var(--ink);
		font-weight: 600;
	}

	/* Body text */
	.copy p,
	.copy li {
		font-family: var(--body);
		font-size: 18.5px;
		line-height: 1.65;
		letter-spacing: -0.008em;
		margin: 0 0 20px;
		text-wrap: pretty;
	}
	.copy a {
		font-weight: 550;
	}
	.lede {
		margin-top: 88px;
	}
	.lede p:first-child {
		font-size: clamp(21px, 2.5vw, 25px);
		line-height: 1.45;
		letter-spacing: -0.018em;
	}

	/* The personal note */
	#s-why {
		margin-top: 44px;
	}
	.why {
		padding: 30px 32px;
		border-left: 4px solid var(--orange);
	}
	.why p {
		margin: 0 0 14px;
		font-size: 16.5px;
		line-height: 1.6;
		color: var(--ink-2);
		text-wrap: pretty;
	}
	.why .eyebrow {
		margin-bottom: 14px;
		color: var(--ink-3);
		font-size: 12.5px;
	}
	.why a {
		color: var(--ink);
		font-weight: 550;
	}
	.why .quote {
		font-size: clamp(20px, 2.4vw, 23px);
		line-height: 1.42;
		font-weight: 520;
		letter-spacing: -0.018em;
		color: var(--ink);
	}
	.why .signed {
		margin: 18px 0 0;
		font-size: 14.5px;
		font-weight: 600;
		color: var(--ink);
	}
	.why .signed::before {
		content: '— ';
		color: var(--ink-3);
	}

	/* Method */
	.method h3 {
		font-size: 20px;
		line-height: 1.25;
		font-weight: 650;
		letter-spacing: -0.015em;
		margin: 44px 0 14px;
	}
	.sources {
		max-width: calc(var(--wide) + 2 * var(--gutter));
		margin-top: 28px;
	}
	.small li {
		font-size: 16px;
		line-height: 1.6;
		color: var(--ink-2);
		margin-bottom: 12px;
	}
	.small ol,
	.small ul {
		padding-left: 22px;
		margin: 0;
	}
	.small li::marker {
		color: var(--ink-3);
		font-weight: 600;
	}

	footer {
		margin-top: 88px;
		padding-top: 22px;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px 24px;
		font-size: 13.5px;
		color: var(--ink-3);
	}
	footer::before {
		content: '';
		flex-basis: 100%;
		border-top: 1px solid var(--rule);
		margin-bottom: 10px;
	}
	footer p {
		margin: 0;
		max-width: 60ch;
	}
	.up {
		white-space: nowrap;
	}

	@media (max-width: 560px) {
		section {
			margin-top: 72px;
		}
		.copy p,
		.copy li {
			font-size: 17.5px;
		}
		.lede {
			margin-top: 56px;
		}
		.why {
			padding: 22px 20px;
		}
		.small li {
			font-size: 15.5px;
		}
	}
</style>
