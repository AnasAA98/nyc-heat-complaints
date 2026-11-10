<script lang="ts">
	import BuildingLookup from '#lib/components/BuildingLookup.svelte';
	import ColdChart from '#lib/components/ColdChart.svelte';
	import Concentration from '#lib/components/Concentration.svelte';
	import NeighborhoodMap from '#lib/components/NeighborhoodMap.svelte';
	import OutcomeBars from '#lib/components/OutcomeBars.svelte';
	import ReturnDots from '#lib/components/ReturnDots.svelte';
	import SeasonScatter from '#lib/components/SeasonScatter.svelte';
	import Sources from '#lib/components/Sources.svelte';
	import { AUTHOR, REPO, TITLE } from '#lib/config.ts';
	import meta from '#lib/data/meta.json';
	import neighborhoods from '#lib/data/neighborhoods.json';
	import outcomes from '#lib/data/outcomes.json';
	import story from '#lib/data/story.json';
	import weather from '#lib/data/weather.json';
	import zips from '#lib/data/zips.json';
	import { big, date, num, nycDate, seasonLabel } from '#lib/format.ts';

	// Every number in the text below is read from the data files, so the words
	// cannot drift from the charts. `pc` writes a share as "50 percent".
	const pc = (share: number) => `${Math.round(share * 100)} percent`;
	const list = (items: string[]) => `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

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

<article>
	<header class="prose top">
		<p class="kicker">New York City · Heat season</p>
		<h1>{TITLE}</h1>
		<p class="dek">
			New Yorkers filed {big(complaints.total)} heat and hot water complaints over the last six winters. The most
			common ending: someone in the building told the city the heat was back. About {pc(overall.violation)} ended
			with a violation.
		</p>
		<p class="byline">
			By <span class="author">{AUTHOR}</span>
			<span class="sep">·</span> Data through {date(lastEnd)}
		</p>
	</header>

	<div class="prose stats" role="list">
		<div role="listitem">
			<b>{big(complaints.total).replace(' million', 'M')}</b>
			<span>heat and hot water complaints in six heat seasons</span>
		</div>
		<div role="listitem">
			<b class="word">{Math.round(overall.said_fixed * 100)}%</b>
			<span><i class="swatch" style:background="var(--orange)"></i>closed after someone said the problem was fixed</span>
		</div>
		<div role="listitem">
			<b class="word">{Math.round(overall.violation * 100)}%</b>
			<span><i class="swatch" style:background="var(--violet)"></i>closed with a violation</span>
		</div>
	</div>

	<section class="prose copy">
		<p>
			From Oct. 1 through May 31, New York City landlords must keep apartments at 68 degrees or warmer during the day
			whenever it is below 55 outside, and at 62 or warmer overnight. Hot water is required all year.
		</p>
		<p>
			When that fails, tenants are told to call 311. Each complaint goes to the Department of Housing Preservation
			and Development, the city’s housing agency, which may call the tenant, contact the owner or send an inspector.
		</p>
		<p>
			This page follows those complaints through the city’s own records: how they end, when they surge, where they
			come from and which buildings they keep coming from.
		</p>
	</section>

	<section>
		<div class="prose copy">
			<h2>How a complaint ends</h2>
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
			<p>
				An inspector issued a violation in {pc(overall.violation)} of complaints, and inspected without issuing one
				in {pc(overall.no_violation)}.
			</p>
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

	<section>
		<div class="prose copy">
			<h2>A closed complaint is often not the end</h2>
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

	<section>
		<div class="prose copy">
			<h2>Complaints follow the cold</h2>
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
			<h3>But the cold does not explain all of it</h3>
			<p>
				Complaints {roseEverySeason ? 'have risen every season' : 'have risen'}, from {num(complaints.bySeason[0])} in
				{first} to {num(complaints.bySeason[n])} in {last}, an increase of {pc(complaints.growth - 1)}.
				{#if coldest}Last winter was the coldest of the six. But colder weather is only part of it.{/if}
			</p>
			{#if pair}
				<p>
					The winters of {seasonLabel(pair.earlier)} and {seasonLabel(pair.later)} were equally cold by the standard
					measure, heating degree days. The later one had {pc(pair.increase)} more complaints.
				</p>
			{/if}
		</div>

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

	<section>
		<div class="prose copy">
			<h2>Where the complaints come from</h2>
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
		/>
	</section>

	<section>
		<div class="prose copy">
			<h2>The same buildings, winter after winter</h2>
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
			<p>
				For some buildings it is every winter. {num(every.buildings)} apartment buildings had complaints on at least
				{buildings.repeatDays} days in each of the six seasons. Together they hold about
				{num(Math.round(every.apartments / 1000) * 1000)} apartments. Inspectors issued violations at
				{num(every.withViolationAnySeason)} of them at some point in those years, and the city took
				{num(every.withCaseAnySeason)} to court. The complaints kept coming.
			</p>
		</div>

		<BuildingLookup {zips} seasons={story.seasons} />
	</section>

	<section class="prose copy method" id="method">
		<h2>How I did this</h2>
		<p>
			Everything here comes from public records, almost all of it from NYC Open Data. The code that downloads,
			checks and analyzes the data is <a href={REPO}>on GitHub</a>, and it can rebuild every number on this page.
		</p>

		<Sources {meta} />

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
	</section>

	<footer class="prose">
		<p class="credit">
			Reporting, analysis and graphics by {AUTHOR}. Built with Svelte, TypeScript and D3.
			<a href={REPO}>Code and data pipeline on GitHub</a>.
		</p>
	</footer>
</article>

<style>
	article {
		padding: 56px 0 72px;
	}
	.prose {
		max-width: calc(var(--text) + 2 * var(--gutter));
		margin: 0 auto;
		padding: 0 var(--gutter);
	}
	section {
		margin-top: 12px;
	}

	.kicker {
		margin: 0 0 14px;
		font-size: 13px;
		font-weight: 650;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	h1 {
		font-family: var(--serif);
		font-size: clamp(34px, 6.2vw, 54px);
		line-height: 1.06;
		font-weight: 680;
		letter-spacing: -0.015em;
		margin: 0 0 18px;
		text-wrap: balance;
	}
	.dek {
		font-family: var(--serif);
		font-size: clamp(19px, 2.6vw, 22px);
		line-height: 1.42;
		color: var(--ink-2);
		margin: 0 0 20px;
		text-wrap: pretty;
	}
	.byline {
		margin: 0;
		font-size: 14px;
		color: var(--ink-3);
	}
	.author {
		color: var(--ink);
		font-weight: 650;
	}
	.sep {
		margin: 0 4px;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		margin-top: 32px;
		margin-bottom: 36px;
	}
	.stats > div {
		padding: 16px 16px 14px 0;
		border-top: 1px solid var(--ink);
		border-bottom: 1px solid var(--rule);
	}
	.stats > div + div {
		padding-left: 16px;
		border-left: 1px solid var(--rule);
	}
	.stats b {
		display: block;
		font-size: clamp(30px, 5.4vw, 44px);
		line-height: 1;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin-bottom: 8px;
	}
	.stats span {
		display: block;
		font-size: 13.5px;
		line-height: 1.35;
		color: var(--ink-2);
	}

	/* Body text */
	.copy p,
	.copy li {
		font-family: var(--serif);
		font-size: 19px;
		line-height: 1.6;
		margin: 0 0 18px;
		text-wrap: pretty;
	}
	h2 {
		font-family: var(--serif);
		font-size: clamp(25px, 3.6vw, 31px);
		line-height: 1.15;
		font-weight: 680;
		letter-spacing: -0.01em;
		margin: 56px 0 16px;
		text-wrap: balance;
	}
	h3 {
		font-family: var(--sans);
		font-size: 18px;
		line-height: 1.3;
		font-weight: 700;
		margin: 32px 0 10px;
	}
	.method {
		margin-top: 72px;
		border-top: 1px solid var(--ink);
	}
	.method h2 {
		margin-top: 28px;
	}
	.method p,
	.method li {
		font-family: var(--sans);
		font-size: 15.5px;
		line-height: 1.55;
		color: var(--ink-2);
		margin-bottom: 12px;
	}
	.method ol,
	.method ul {
		padding-left: 22px;
		margin: 0 0 8px;
	}

	footer {
		margin-top: 48px;
	}
	.credit {
		margin: 0;
		border-top: 1px solid var(--rule);
		padding-top: 16px;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--ink-3);
	}

	@media (max-width: 560px) {
		article {
			padding-top: 32px;
		}
		.copy p,
		.copy li {
			font-size: 18px;
		}
		.method p,
		.method li {
			font-size: 15px;
		}
		.stats {
			grid-template-columns: 1fr;
		}
		.stats > div,
		.stats > div + div {
			display: flex;
			align-items: baseline;
			gap: 14px;
			padding: 12px 0;
			border-left: 0;
			border-top: 0;
		}
		.stats > div:first-child {
			border-top: 1px solid var(--ink);
		}
		.stats b {
			min-width: 96px;
			margin: 0;
			font-size: 30px;
		}
	}
</style>
