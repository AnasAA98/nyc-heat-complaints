// The order and color of complaint outcomes, shared by every chart that shows
// them so a color always means the same thing. Duplicates are not an outcome:
// they are extra calls about a complaint that is already open.
export const OUTCOMES = ['said_fixed', 'violation', 'no_violation', 'no_access', 'not_stated', 'other'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_COLOR: Record<Outcome, string> = {
	said_fixed: 'var(--out-fixed)',
	violation: 'var(--out-violation)',
	no_violation: 'var(--out-no-violation)',
	no_access: 'var(--out-no-access)',
	not_stated: 'var(--out-not-stated)',
	other: 'var(--out-other)'
};
