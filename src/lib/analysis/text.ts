// Some HPD texts were encoded as UTF-8 more than once, so "°" arrives as "ÃÂ°".
// Undo it by re-reading the characters as bytes and decoding as UTF-8, repeating
// while that still produces valid text.
export function fixMojibake(text: string): string {
	let current = text;
	for (let i = 0; i < 3 && /[ÃÂ]/.test(current); i++) {
		const codes = Array.from(current, (ch) => ch.charCodeAt(0));
		if (codes.some((c) => c > 0xff)) break;
		try {
			current = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(codes));
		} catch {
			break;
		}
	}
	return current;
}
