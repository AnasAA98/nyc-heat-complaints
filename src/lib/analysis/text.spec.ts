import { describe, expect, it } from 'vitest';
import { fixMojibake } from './text';

describe('fixMojibake', () => {
	it('repairs the double-encoded degree sign HPD uses', () => {
		expect(fixMojibake('above 55Ã\u0082Â° F')).toBe('above 55° F');
	});

	it('leaves normal text alone', () => {
		expect(fixMojibake("HPD's website")).toBe("HPD's website");
		expect(fixMojibake('above 55° F')).toBe('above 55° F');
	});
});
