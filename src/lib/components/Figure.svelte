<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '#lib/reveal.ts';

	// The card every graphic shares: a headline, a one-line explainer, optional
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

<div class="slot {width}">
	<figure class="card" {id} use:reveal>
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
			{#if note}<p>{note}</p>{/if}
			<p>Source: {source}</p>
		</figcaption>
	</figure>
</div>

<style>
	.slot {
		margin: 36px auto;
		padding: 0 var(--gutter);
		width: 100%;
	}
	.text {
		max-width: calc(var(--text) + 56px + 2 * var(--gutter));
	}
	.wide {
		max-width: calc(var(--wide) + 2 * var(--gutter));
	}
	.full {
		max-width: calc(var(--full) + 2 * var(--gutter));
	}
	figure {
		margin: 0;
		padding: 28px;
		scroll-margin-top: calc(var(--nav) + 16px);
	}
	header {
		margin-bottom: 18px;
	}
	h3 {
		font-size: 21px;
		line-height: 1.2;
		font-weight: 650;
		letter-spacing: -0.015em;
		margin: 0;
		text-wrap: balance;
	}
	.subtitle {
		margin: 6px 0 0;
		font-size: 15px;
		line-height: 1.45;
		color: var(--ink-2);
		max-width: 64ch;
		text-wrap: pretty;
	}
	.controls {
		margin-bottom: 20px;
	}
	details {
		margin-top: 16px;
		font-size: 13px;
	}
	summary {
		cursor: pointer;
		color: var(--ink-2);
		width: fit-content;
		padding: 6px 12px;
		margin-left: -12px;
		border-radius: 999px;
		font-weight: 500;
		transition: background 150ms;
	}
	summary:hover {
		color: var(--ink);
		background: var(--hover);
	}
	figcaption {
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px solid var(--rule);
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--ink-3);
	}
	figcaption p {
		margin: 0;
		max-width: 86ch;
	}
	figcaption p + p {
		margin-top: 4px;
	}
	@media (max-width: 560px) {
		.slot {
			padding: 0 12px;
			margin: 28px auto;
		}
		figure {
			padding: 20px 16px;
			border-radius: 16px;
		}
		h3 {
			font-size: 19px;
		}
	}
</style>
