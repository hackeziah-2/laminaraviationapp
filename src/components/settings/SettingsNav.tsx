import {
  Activity,
  Grid3x3,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  MODULE_SETTING_OPTIONS,
  type ModuleSettingKey,
} from "../../constants/moduleSettingsOptions";

const SELECT_CLASS =
  "h-10 min-w-[200px] cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-9 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100";

const SELECT_CHEVRON = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`;

export type SettingsTab = "users" | "roles" | "matrix" | "audit-trail";

const VALID_TABS: SettingsTab[] = ["users", "roles", "matrix", "audit-trail"];

interface SettingsNavProps {
  moduleSettingKey?: ModuleSettingKey | "";
  onModuleSettingChange?: (key: ModuleSettingKey | "") => void;
}

function tabClass(active: boolean) {
  return `flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors ${
    active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;
}

export function SettingsNav({
  moduleSettingKey = "",
  onModuleSettingChange,
}: SettingsNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "users";
  const tab = (
    VALID_TABS.includes(tabParam as SettingsTab) ? tabParam : "users"
  ) as SettingsTab;
  const tabsActive = !moduleSettingKey;

  const handleTabClick = (nextTab: SettingsTab) => {
    onModuleSettingChange?.("");
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
      <button
        type="button"
        onClick={() => handleTabClick("users")}
        className={tabClass(tabsActive && tab === "users")}
      >
        <Users className="h-4 w-4" />
        User Accounts
      </button>
      <button
        type="button"
        onClick={() => handleTabClick("roles")}
        className={tabClass(tabsActive && tab === "roles")}
      >
        <Shield className="h-4 w-4" />
        Roles &amp; Permissions
      </button>
      <button
        type="button"
        onClick={() => handleTabClick("matrix")}
        className={tabClass(tabsActive && tab === "matrix")}
      >
        <Grid3x3 className="h-4 w-4" />
        Access Matrix
      </button>
      <button
        type="button"
        onClick={() => handleTabClick("audit-trail")}
        className={tabClass(tabsActive && tab === "audit-trail")}
      >
        <Activity className="h-4 w-4" />
        Audit Trail
      </button>

      {onModuleSettingChange && (
        <div className="ml-auto flex min-w-[220px] items-center gap-2 pl-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" />
          <select
            id="settings-module-select"
            value={moduleSettingKey}
            onChange={(e) =>
              onModuleSettingChange(e.target.value as ModuleSettingKey | "")
            }
            className={SELECT_CLASS}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Module Settings"
          >
            <option value="">Module Settings</option>
            {MODULE_SETTING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
