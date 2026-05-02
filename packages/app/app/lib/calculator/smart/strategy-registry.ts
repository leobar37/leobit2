import type { UnitType } from "../types";
import type { SmartCalculatorStrategy } from "./types";
import { kgCalculatorStrategy } from "./strategies/kg-strategy";
import { unitCalculatorStrategy } from "./strategies/unit-strategy";

export function getSmartCalculatorStrategy(
	unitType: UnitType,
): SmartCalculatorStrategy {
	return unitType === "kg" ? kgCalculatorStrategy : unitCalculatorStrategy;
}
