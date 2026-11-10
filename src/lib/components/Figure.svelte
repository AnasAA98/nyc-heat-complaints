<script lang="ts">
	import type { Snippet } from 'svelte';

	// The frame every graphic shares: a headline, a one-line explainer, optional
	// controls above the chart, the chart, then notes and the source line.
	interface Props {
		title: string;
		subtitle?: string;
		source: string;
		note?: string;
		width?: 'text' | 'wide' | 'full';
		id?: string;
		controls?: Snippet;
		children: Snippet;
		table?: Snippet;
		tableLabel?: string;
	}
	let {
		title,
		subtitle,
		source,
		note,
		width = 'wide',
		id,
		controls,
		children,
		table,
		tableLabel = 'Show the numbers'
	}: Props = $props();
</script>

<figure class="figure {width}" {id}>
	<header>
		<h3>{title}</h3>
		{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
	</header>

	{#if controls}<div class="controls">{@render controls()}</div>{/if}

	<div class="body">{@render children()}</div>

	{#if table}
		<details>
			<summary>{tableLabel}</summary>
			<div class="table-wrap">{@render table()}</div>
		</details>
	{/if}

	<figcaption>
		{#if note}<p class="note">{note}</p>{/if}
		<p class="source">Source: {source}</p>
	</figcaption>
</figure>

<style>
	.figure {
		margin: 40px auto;
		padding: 0 var(--gutter);
		width: 100%;
	}
	.text {
		max-width: calc(var(--text) + 2 * var(--gutter));
	}
	.wide {
		max-width: calc(var(--wide) + 2 * var(--gutter));
	}
	.full {
		max-width: calc(var(--full) + 2 * var(--gutter));
	}
	header {
		border-top: 1px solid var(--ink);
		padding-top: 12px;
		margin-bottom: 14px;
	}
	h3 {
		font-family: var(--sans);
		font-size: 18px;
		line-height: 1.25;
		font-weight: 700;
		margin: 0;
		text-wrap: balance;
	}
	.subtitle {
		margin: 4px 0 0;
		font-size: 15px;
		line-height: 1.4;
		color: var(--ink-2);
		max-width: 62ch;
	}
	.controls {
		margin-bottom: 16px;
	}
	details {
		margin-top: 14px;
		font-size: 13px;
	}
	summary {
		cursor: pointer;
		color: var(--ink-2);
		width: fit-content;
	}
	summary:hover {
		color: var(--ink);
	}
	figcaption {
		margin-top: 14px;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--ink-3);
	}
	figcaption p {
		margin: 0;
		max-width: 80ch;
	}
	.note {
		margin-bottom: 4px;
	}
</style>
