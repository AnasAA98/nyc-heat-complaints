<script lang="ts" generics="T extends string">
	// A row of pill buttons where exactly one is on. Built on native radio inputs,
	// so arrow keys, focus and screen readers work without extra code.
	interface Props {
		label: string;
		options: readonly T[];
		value: T;
		format?: (option: T) => string;
	}
	let { label, options, value = $bindable(), format = (o) => o }: Props = $props();
	const name = $props.id();
</script>

<fieldset>
	<legend class="visually-hidden">{label}</legend>
	{#each options as option (option)}
		<label>
			<input type="radio" {name} value={option} bind:group={value} />
			<span>{format(option)}</span>
		</label>
	{/each}
</fieldset>

<style>
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	label {
		cursor: pointer;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	span {
		display: block;
		font-size: 14px;
		line-height: 1;
		padding: 7px 12px;
		border-radius: 999px;
		border: 1px solid var(--axis);
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
		transition:
			background 120ms,
			color 120ms,
			border-color 120ms;
	}
	label:hover span {
		border-color: var(--ink-3);
		color: var(--ink);
	}
	input:checked + span {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--surface);
	}
	input:focus-visible + span {
		outline: 2px solid var(--blue);
		outline-offset: 2px;
	}
</style>
