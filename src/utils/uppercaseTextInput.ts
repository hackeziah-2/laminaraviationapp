import type { Dispatch, SetStateAction } from "react";

/** Convert user-entered text to uppercase for aviation logbook fields. */
export function toUppercaseInput(value: string): string {
  return value.toLocaleUpperCase("en-US");
}

export function uppercaseOptionalText(
  value: string | null | undefined
): string | undefined {
  if (value == null) return undefined;
  return toUppercaseInput(value);
}

/**
 * Uppercase string values on a form/payload object, leaving non-strings
 * (files, numbers, null) and skipped keys unchanged.
 */
export function uppercaseRecordStringFields<T extends object>(
  record: T,
  skipKeys: ReadonlySet<string>
): T {
  const next = { ...record };
  for (const key of Object.keys(next) as Array<keyof T>) {
    if (skipKeys.has(String(key))) continue;
    const value = next[key];
    if (typeof value === "string") {
      (next as Record<string, unknown>)[String(key)] = toUppercaseInput(value);
    }
  }
  return next;
}

/** Wrap a React state setter so every update uppercases applicable string fields. */
export function wrapUppercaseFormSetter<T extends object>(
  setState: Dispatch<SetStateAction<T>>,
  skipKeys: ReadonlySet<string>
): Dispatch<SetStateAction<T>> {
  return (update) => {
    setState((prev) => {
      const next =
        typeof update === "function"
          ? (update as (prevState: T) => T)(prev)
          : update;
      return uppercaseRecordStringFields(next, skipKeys);
    });
  };
}

export function uppercaseComponentRecords<T extends object>(
  records: T[]
): T[] {
  return records.map((record) =>
    uppercaseRecordStringFields(record, COMPONENT_RECORD_UPPERCASE_SKIP_KEYS)
  );
}

/** Wrap component-part list updates so text columns uppercase on type/paste/hydrate. */
export function wrapUppercaseComponentRecordsSetter<T extends object>(
  setState: Dispatch<SetStateAction<T[]>>
): Dispatch<SetStateAction<T[]>> {
  return (update) => {
    setState((prev) => {
      const next =
        typeof update === "function"
          ? (update as (prevState: T[]) => T[])(prev)
          : update;
      return uppercaseComponentRecords(next);
    });
  };
}

/** ATL Add/Edit: IDs, dates/times, numbers, enums, and URLs must not be uppercased. */
export const ATL_FORM_UPPERCASE_SKIP_KEYS: ReadonlySet<string> = new Set([
  "seqNo",
  "atlBatchFk",
  "workStatus",
  "natureOfFlight",
  "offBlocksDate",
  "offBlocksTime",
  "onBlocksDate",
  "onBlocksTime",
  "pilotFk",
  "pilotAcceptDate",
  "pilotAcceptTime",
  "rtsSignedBy",
  "rtsDate",
  "rtsTime",
  "remarksPerson",
  "actionsTakenPerson",
  "whiteAtlWebLink",
  "dfpWebLink",
  "totalFlightTime",
  "numberOfLandings",
  "fuelQtyLeftUpliftQty",
  "fuelQtyRightUpliftQty",
  "fuelQtyLeftPriorDeparture",
  "fuelQtyRightPriorDeparture",
  "fuelQtyLeftAfterOnBlks",
  "fuelQtyRightAfterOnBlks",
  "oilQtyUpliftQty",
  "oilQtyPriorDeparture",
  "oilQtyAfterOnBlks",
  "priorDepartureHours",
  "priorDepartureMinutes",
  "afterLandingHours",
  "afterLandingMinutes",
  "tachometerStart",
  "tachometerEnd",
  "tachometerTotal",
  "hobbsMeterStart",
  "hobbsMeterEnd",
  "hobbsMeterTotal",
  "tachTimeDue",
  "airframePrevTime",
  "airframeFlightTime",
  "airframeTotalTime",
  "airframeRunTime",
  "airframeAftt",
  "enginePrevTime",
  "engineFlightTime",
  "engineTotalTime",
  "engineRunTime",
  "engineTsn",
  "engineTso",
  "engineTbo",
  "propellerPrevTime",
  "propellerFlightTime",
  "propellerTotalTime",
  "propellerRunTime",
  "propellerTsn",
  "propellerTso",
  "propellerTbo",
  "lifeTimeLimitEngine",
  "lifeTimeLimitPropeller",
]);

/** Maintenance logbook Add/Edit: IDs, dates, numeric times, and URLs. */
export const MAINTENANCE_LOGBOOK_FORM_UPPERCASE_SKIP_KEYS: ReadonlySet<string> =
  new Set([
    "date",
    "logbookSeqNo",
    "sequenceNo",
    "mechanicFk",
    "webLink",
    "tachTime",
    "airframeTime",
    "engineTime",
    "propellerTime",
    "engineTsn",
    "engineTso",
    "engineTbo",
    "propellerTsn",
    "propellerTso",
    "propellerTbo",
    "airframeTsn",
  ]);

/** Component-part rows: qty stays numeric; row ids are system keys. */
export const COMPONENT_RECORD_UPPERCASE_SKIP_KEYS: ReadonlySet<string> =
  new Set(["id", "dbId", "qty"]);
