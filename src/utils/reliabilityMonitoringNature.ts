import { toNatureOfFlightType } from "../api/natureOfFlightDescriptionsApi";

/** Nature of Flight values shown in Group By: Reliability Monitoring. */
export const RELIABILITY_MONITORING_NATURES = ["ME", "TR_WITH_PIREM"] as const;

export function isReliabilityMonitoringNature(
  nature: string | null | undefined
): boolean {
  const normalized = toNatureOfFlightType(nature);
  return normalized === "ME" || normalized === "TR_WITH_PIREM";
}
