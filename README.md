# What Happens After You Call 311 About the Heat

An interactive data story about New York City's heat and hot water complaints: how they end, when they surge, where they come from and which buildings they keep coming from.

It follows 1.48 million complaints filed to 311 over six heat seasons (October 2020 to May 2026), joined to five other public datasets. Everything is limited to New York City.

## What it shows

- **How complaints end.** About half were closed after someone in the building said the problem was fixed. About 6 percent ended with a violation.
- **What happens next.** In buildings of every size, a closed complaint was often followed by a new one from the same building within seven days.
- **The weather.** Complaints track the temperature, but two equally cold winters (2021-22 and 2024-25) had very different totals.
- **The map.** Complaints per 1,000 apartments for 190 neighborhoods, by season.
- **The buildings.** One percent of apartment buildings accounted for about half of all complaints, season after season.
- **Too hot.** The rules set no maximum temperature. A read of every matching violation found 327 for an apartment that was too hot, against 45,019 for too little heat, and only 12 of the 327 were written during heat season.
- **A lookup.** Search 196,640 buildings by ZIP code and address.

Every number in the article text is read from the generated data files, so the words cannot drift from the charts.

## Data

| Dataset | Publisher | ID | Used for |
| --- | --- | --- | --- |
| 311 Service Requests from 2020 to Present | NYC Open Data | `erm2-nwe9` | Every complaint and the message it was closed with |
| PLUTO tax lot file | Department of City Planning | `64uk-42ks` | Homes per lot, owner, census tract |
| Housing Maintenance Code Violations | HPD | `wvxf-dwi5` | Heat and hot water violations, and the text of violations for too much heat |
| Housing Litigations | HPD | `59kj-x8nc` | Heat cases brought in housing court |
| 2020 Neighborhood Tabulation Areas | Department of City Planning | `9nt8-h7nd`, `hm78-6dwm` | Neighborhood names and boundaries |
| Daily Summaries, Central Park | NOAA | `USW00094728` | Daily high and low temperature |

## Run it

Requires Node 22.

```sh
npm ci
npm run dev        # http://localhost:5173
npm test           # unit tests for the analysis code
npm run check      # type-check
npm run build      # static site in build/
npm run og         # redraws the link preview image, static/og.png (needs Google Chrome)
```

The generated data is committed, so the site builds without downloading anything.

## Rebuild the data

```sh
npm run fetch        # downloads everything into data/raw/ (about 25 minutes, 250 MB)
npm run build-data   # writes src/lib/data/ and static/data/zip/
```

`fetch` skips anything already downloaded; add `-- --refresh` to download again. Set `SOCRATA_APP_TOKEN` to raise the API rate limit (optional).

After each download the script compares its row count with the count the API reports and stops if they differ. If the city starts using a closing message the code has not seen, the build stops until someone reads it and assigns it an outcome. The same goes for violations that may describe too much heat: every match is listed, with a yes or no, in `data/too-hot-violations.json`, and a new one stops the build.

## How it is organized

```
scripts/
  fetch-complaints.ts   311 complaints, one season at a time
  fetch-context.ts      PLUTO, boundaries, violations, court cases, weather
  build-data.ts         joins everything and writes the JSON the page reads
  build-og.ts           draws the link preview image
  lib/                  Socrata client, CSV reader
src/lib/
  analysis/             pure functions with tests: outcome categories, heat
                        seasons, follow-ups, building sizes, degree days
  components/           one Svelte component per figure
  data/                 generated JSON (committed)
src/routes/+page.svelte the article
static/data/zip/        building lookup, one file per ZIP code, loaded on demand
data/resolution-categories.json   every closing message and its outcome
data/too-hot-violations.json      every possible too-hot violation, read by hand
```

## Method notes

- Heat season is Oct. 1 to May 31. Timestamps are read as New York time straight from the text, so no time zone conversion can move a complaint across a season boundary.
- Per-apartment rates use buildings with three or more homes and leave out public housing, whose tenants report to NYCHA rather than 311.
- A "building" is a tax lot. A lot can hold more than one building.
- A complaint is a report from a tenant, not a confirmed outage.

Built with SvelteKit, TypeScript and D3. Deploys as a static site.
