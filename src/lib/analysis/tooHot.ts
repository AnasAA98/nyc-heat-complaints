// Violations for an apartment that is too hot. The housing code has no rule for
// it, so inspectors write these under the general nuisance section (§ 27-2005)
// in their own words: "excessive heat", "heat on in summer", "radiators on
// during non heat season". This pattern finds the wordings that can mean too
// much heat; a person then reads every match (data/too-hot-violations.json),
// because some of them mean the opposite, like a boiler left on its summer
// setting in January.

export const TOO_HOT_PATTERN =
	/EXCESS\w*\s+(HEAT|TEMP)|EXC?EEDING HEAT|EXTREME HEAT|\bOVER\s*-?\s*HEAT|TOO HOT|NON\w*[\s-]*HEAT\s*SEASON|SUMMER/;

// Hot water hotter than the 130-degree limit inspectors cite is a different
// problem, and far more common. Those rows are left out before anyone reads
// them, unless they also say the apartment itself is hot ("excessive heat
// coming from hot water pipes").
const HOT_WATER = /(HOT|H0T)\s*-?\s*T?\s*W\w*R\b|HOTWATER|WATER\s+(TEMP|EXCEED)/;
const HOT_ROOM = /EXCESS\w*\s+HEAT|EXTREME HEAT|\bOVER\s*-?\s*HEAT/;

export function mightBeTooHot(text: string): boolean {
	const t = text.toUpperCase().replace(/\s+/g, ' ');
	return TOO_HOT_PATTERN.test(t) && (!HOT_WATER.test(t) || HOT_ROOM.test(t));
}

export interface TooHotReview {
	violationid: string;
	inspectiondate: string; // YYYY-MM-DD
	boro: string;
	text: string;
	tooHot: boolean;
	note?: string; // why, when the call is not obvious from the text
}
