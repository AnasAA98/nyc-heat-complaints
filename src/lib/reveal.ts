// Svelte action: fades an element up the first time it scrolls into view.
// Without JavaScript nothing is hidden, because the class is only added here.
export function reveal(node: HTMLElement) {
	if (typeof IntersectionObserver === 'undefined') return;
	// Anything already on screen at load is shown as is.
	if (node.getBoundingClientRect().top < window.innerHeight) return;
	node.classList.add('reveal');
	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry.isIntersecting) return;
			node.classList.add('in');
			observer.disconnect();
		},
		{ rootMargin: '0px 0px -8% 0px' }
	);
	observer.observe(node);
	return { destroy: () => observer.disconnect() };
}
