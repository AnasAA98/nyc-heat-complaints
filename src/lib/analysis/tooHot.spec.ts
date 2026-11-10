import { describe, expect, it } from 'vitest';
import { mightBeTooHot } from './tooHot';

// Wordings copied from HPD violation records.
const NUISANCE = '§ 27-2005 ADM CODE & 309 M/D LAW ABATE THE NUISANCE CONSISTING OF';

describe('mightBeTooHot', () => {
	it('finds the ways inspectors describe too much heat', () => {
		for (const text of [
			'EXCESSIVE HEAT AT RADIATOR IN THE ENTIRE APARTMENT',
			'HEAT ON IN SUMMER IN THE ENTIRE APARTMENT',
			'RADIATORS ARE HOT AND ARE ON DURING NON HEAT SEASON',
			'WARM RADIATOR ON DURING SUMMER, NON-HEAT SEASON',
			'OF EXCESSIVE HEAT DURING NONE HEAT SEASON',
			'HEATING SYSTEM ON IN SUMMER CAUSING EXCESSIVE TEMPERATURE THROUGHOUT',
			'EXEEDING HEAT IN ENTIRE APARTMENT, HEATER ON IN NON HEAT SEASON',
			'EXTREME HEAT FROM BASEBOARD RADITORS',
			'EXCESSIVE HEAT COMING FROM HOT WATER PIPES RUNING UNDER FLOOR'
		]) {
			expect(mightBeTooHot(`${NUISANCE} ${text}`), text).toBe(true);
		}
	});

	it('leaves out hot water that is too hot', () => {
		expect(
			mightBeTooHot(`${NUISANCE} SCALDING HOT WATER EXCEEDING TH MAXIMUM OF 130 F DEGREES`)
		).toBe(false);
		expect(
			mightBeTooHot(`${NUISANCE} HOTWATER EXCEEDING MAXIMUM ALLOW TEMPERATURE OF 130.F DEGREES`)
		).toBe(false);
		expect(
			mightBeTooHot(`${NUISANCE} EXCESSIVE HOT WATER TEMPERATURE EXCEEDING MAXIMUM TEMPERATURE`)
		).toBe(false);
	});

	it('does not read "cover heat radiator" as overheating', () => {
		expect(
			mightBeTooHot(
				'§ 27-2005 ADM CODE REPLACE WITH NEW THE MISSING METAL BASEBOARD COVER HEAT RADIATOR'
			)
		).toBe(false);
	});

	it('ignores ordinary heat violations', () => {
		expect(mightBeTooHot('§ 27-2029 ADM CODE PROVIDE HEAT TO THE ENTIRE APARTMENT')).toBe(false);
	});
});
