<script lang="ts">
	// Sticky bar: section links that track the reader's position, a reading
	// progress line, and a light/dark switch.
	interface Props {
		sections: { id: string; label: string }[];
	}
	let { sections }: Props = $props();

	let active = $state('');
	let progress = $state(0);
	let list: HTMLElement;

	$effect(() => {
		// A section is "current" while it crosses a band near the top of the screen.
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) if (entry.isIntersecting) active = entry.target.id;
			},
			{ rootMargin: '-30% 0px -65% 0px' }
		);
		for (const s of sections) {
			const el = document.getElementById(s.id);
			if (el) observer.observe(el);
		}
		const onScroll = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', onScroll);
		};
	});

	// Keep the current link visible when the links scroll sideways on a phone.
	$effect(() => {
		const link = active ? list?.querySelector<HTMLElement>(`[href="#${active}"]`) : null;
		if (link) list.scrollTo({ left: link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2, behavior: 'smooth' });
	});

	function toggleTheme() {
		const root = document.documentElement;
		const dark = root.dataset.theme
			? root.dataset.theme === 'dark'
			: window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.dataset.theme = dark ? 'light' : 'dark';
		try {
			localStorage.setItem('theme', root.dataset.theme);
		} catch {
			// Private windows can refuse storage; the choice then lasts for this visit.
		}
	}
</script>

<nav class="nav" aria-label="Sections of this story">
	<div class="inner">
		<a class="brand" href="#top">
			<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
				<rect x="2" y="4" width="3" height="12" rx="1.5" fill="var(--blue)" />
				<rect x="8.5" y="4" width="3" height="12" rx="1.5" fill="var(--orange)" />
				<rect x="15" y="4" width="3" height="12" rx="1.5" fill="var(--violet)" />
			</svg>
			<span>Heat Complaints</span>
		</a>
		<ul bind:this={list}>
			{#each sections as s (s.id)}
				<li>
					<a href="#{s.id}" class:active={active === s.id} aria-current={active === s.id ? 'true' : undefined}>{s.label}</a>
				</li>
			{/each}
		</ul>
		<button type="button" class="theme" onclick={toggleTheme} aria-label="Switch between light and dark colors">
			<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
				<circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5" />
				<path d="M10 2.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor" />
			</svg>
		</button>
	</div>
	<div class="progress" style:transform="scaleX({progress})"></div>
</nav>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 20;
		height: var(--nav);
		background: color-mix(in srgb, var(--page) 80%, transparent);
		backdrop-filter: saturate(1.6) blur(14px);
		-webkit-backdrop-filter: saturate(1.6) blur(14px);
		border-bottom: 1px solid var(--rule);
	}
	.inner {
		max-width: calc(var(--full) + 2 * var(--gutter));
		height: 100%;
		margin: 0 auto;
		padding: 0 var(--gutter);
		display: flex;
		align-items: center;
		gap: 18px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14.5px;
		font-weight: 650;
		letter-spacing: -0.01em;
		text-decoration: none;
		white-space: nowrap;
	}
	ul {
		flex: 1;
		min-width: 0;
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		justify-content: flex-end;
		gap: 2px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	ul::-webkit-scrollbar {
		display: none;
	}
	li a {
		display: block;
		padding: 7px 11px;
		border-radius: 999px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--ink-3);
		text-decoration: none;
		white-space: nowrap;
		transition:
			color 150ms,
			background 150ms;
	}
	li a:hover {
		color: var(--ink);
	}
	li a.active {
		color: var(--ink);
		background: var(--hover);
	}
	.theme {
		flex: none;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 1px solid var(--rule);
		background: var(--panel);
		color: var(--ink-2);
		cursor: pointer;
		transition:
			color 150ms,
			border-color 150ms;
	}
	.theme:hover {
		color: var(--ink);
		border-color: var(--axis);
	}
	.progress {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background: var(--blue);
		transform-origin: left;
	}
	@media (max-width: 760px) {
		.brand span {
			display: none;
		}
		.inner {
			gap: 10px;
		}
		ul {
			justify-content: flex-start;
		}
	}
</style>
