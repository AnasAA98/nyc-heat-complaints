import { describe, expect, it } from 'vitest';
import { categorize } from './categories';
import realTexts from './fixtures/resolution-texts.json';

describe('categorize', () => {
	// Every closing text seen in 2020–2026, with the category reviewed by hand.
	it.each(realTexts)('maps real text to $category', ({ text, category }) => {
		expect(categorize(text)).toBe(category);
	});

	it('treats a blank resolution as other', () => {
		expect(categorize(null)).toBe('other');
		expect(categorize('  ')).toBe('other');
	});

	it('does not read "verify the correction" in a duplicate notice as fixed', () => {
		expect(
			categorize(
				'The complaint you filed is a duplicate of a condition already reported by another tenant. HPD may attempt to contact you to verify the correction of the condition.'
			)
		).toBe('duplicate');
	});

	it('does not read "has not corrected" in a violation notice as fixed', () => {
		expect(
			categorize(
				'Violations were issued. If the owner has not corrected the condition by the date provided, you may wish to bring a case in housing court.'
			)
		).toBe('violation');
	});

	it('throws on wording it has never seen', () => {
		expect(() => categorize('A brand new HPD message.')).toThrow(/Uncategorized/);
	});
});
