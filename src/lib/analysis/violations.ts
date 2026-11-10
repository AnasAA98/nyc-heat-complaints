// HPD violation order numbers that mean "provide heat" (§ 27-2028, § 27-2029)
// and "provide hot water" (§ 27-2031). Checked against the violation text of
// every row inspected since October 2020: each order number maps to one section.
export const HEAT_ORDERS = ['664', '964', '666', '966'] as const;
export const HOT_WATER_ORDERS = ['670', '970'] as const;

export type ViolationKind = 'heat' | 'hot_water';

export function violationKind(orderNumber: string): ViolationKind | null {
	if ((HEAT_ORDERS as readonly string[]).includes(orderNumber)) return 'heat';
	if ((HOT_WATER_ORDERS as readonly string[]).includes(orderNumber)) return 'hot_water';
	return null;
}
