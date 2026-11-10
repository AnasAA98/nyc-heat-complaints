<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '#lib/reveal.ts';

	// One number pulled out of the text, with the sentence that explains it.
	interface Props {
		value: string;
		tone?: 'blue' | 'orange' | 'violet';
		children: Snippet;
	}
	let { value, tone = 'blue', children }: Props = $props();
</script>

<aside class="callout {tone}" use:reveal>
	<b>{value}</b>
	<p>{@render children()}</p>
</aside>

<style>
	.callout {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 22px;
		max-width: var(--text);
		margin: 28px auto;
		padding: 20px 24px;
		border-radius: var(--radius-sm);
		border-left: 4px solid var(--accent);
		background: var(--wash);
	}
	.blue {
		--accent: var(--blue);
		--wash: var(--blue-wash);
	}
	.orange {
		--accent: var(--orange);
		--wash: var(--orange-wash);
	}
	.violet {
		--accent: var(--violet);
		--wash: var(--violet-wash);
	}
	b {
		font-size: clamp(34px, 5vw, 48px);
		line-height: 1;
		font-weight: 680;
		letter-spacing: -0.035em;
		white-space: nowrap;
	}
	p {
		margin: 0;
		font-size: 16.5px;
		line-height: 1.45;
		color: var(--ink);
		text-wrap: pretty;
	}
	@media (max-width: 560px) {
		.callout {
			grid-template-columns: 1fr;
			gap: 8px;
			margin: 24px var(--gutter);
		}
	}
</style>
