// Turns shares into whole units that add up exactly to `total` (largest-remainder
// method), for charts that draw one square per unit.
export function toUnits(shares: number[], total = 100): number[] {
	const sum = shares.reduce((a, b) => a + b, 0);
	if (sum === 0) return shares.map(() => 0);
	const exact = shares.map((s) => (s / sum) * total);
	const units = exact.map(Math.floor);
	let left = total - units.reduce((a, b) => a + b, 0);
	const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
	for (const { i } of byRemainder) {
		if (left-- <= 0) break;
		units[i]++;
	}
	return units;
}
