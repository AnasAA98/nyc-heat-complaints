<script lang="ts">
	// A numbered section opener: small label, then the headline.
	interface Props {
		number: string;
		label: string;
		title: string;
	}
	let { number, label, title }: Props = $props();
</script>

<div class="head">
	<p class="eyebrow"><span>{number}</span>{label}</p>
	<h2>{title}</h2>
</div>

<style>
	.head {
		max-width: calc(var(--text) + 2 * var(--gutter));
		margin: 0 auto;
		padding: 0 var(--gutter);
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.eyebrow span {
		display: inline-grid;
		place-items: center;
		min-width: 30px;
		height: 22px;
		padding: 0 7px;
		border-radius: 999px;
		background: var(--ink);
		color: var(--page);
		font-size: 11.5px;
		letter-spacing: 0.04em;
		font-variant-numeric: tabular-nums;
	}
	h2 {
		margin: 14px 0 18px;
		font-size: clamp(30px, 4.6vw, 44px);
		line-height: 1.06;
		font-weight: 650;
		letter-spacing: -0.03em;
		text-wrap: balance;
	}
</style>
