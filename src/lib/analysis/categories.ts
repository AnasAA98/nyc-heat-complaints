// How a 311 heat complaint was closed, read from its resolution_description.
// HPD uses ~31 distinct closing texts across 2020–2026. Rules run in order and the
// first match wins; the order matters because many texts share phrases
// (e.g. duplicates also say "verify the correction", violations say "corrected").

export const CATEGORIES = [
	'duplicate',
	'said_fixed',
	'no_access',
	'violation',
	'no_violation',
	'not_stated',
	'other'
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
	duplicate: 'Duplicate of an open complaint',
	said_fixed: 'Someone said it was fixed',
	no_access: "Inspector couldn't get in",
	violation: 'Violation issued',
	no_violation: 'No violation',
	not_stated: 'Outcome not stated',
	other: 'Other'
};

// Some closings for the first of several complaints about one building start with
// this sentence and then give that complaint's actual outcome.
const INITIAL_PREFIX =
	'More than one complaint was received for this building-wide condition.This complaint status is for the initial complaint.';

type Rule = [Category, RegExp];

const RULES: Rule[] = [
	['duplicate', /is a duplicate of a/],
	['other', /Violations were previously issued/],
	['violation', /Violations were issued|inspecting another apartment and a violation was issued/],
	['no_violation', /No violations were issued|did not violate the housing laws/],
	['other', /complaint conditions are still open/],
	['said_fixed', /had been restored|indicated that the condition was corrected|verified that the following conditions were corrected|verified that the complaint was addressed/],
	['no_access', /not able to gain access|unable to complete the inspection/],
	['not_stated', /conducted or attempted to conduct an inspection/],
	['other', /closed this complaint administratively/]
];

export function categorize(text: string | null | undefined): Category {
	if (!text || !text.trim()) return 'other';
	const body = text.startsWith(INITIAL_PREFIX) ? text.slice(INITIAL_PREFIX.length) : text;
	for (const [category, pattern] of RULES) {
		if (pattern.test(body)) return category;
	}
	// Fail loudly: a new HPD wording should be read and mapped, not silently bucketed.
	throw new Error(`Uncategorized resolution text: ${text.slice(0, 200)}`);
}
