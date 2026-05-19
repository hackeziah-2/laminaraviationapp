export type ModuleSettingKey =
  | ""
  | "fleet-time-monitoring"
  | "atl-batch-settings";

export const MODULE_SETTING_OPTIONS: {
  value: Exclude<ModuleSettingKey, "">;
  label: string;
}[] = [
  { value: "fleet-time-monitoring", label: "Fleet Time Monitoring" },
  { value: "atl-batch-settings", label: "ATL Batch Settings" },
];
