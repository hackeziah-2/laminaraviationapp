# AI Rules — Laminar Aviation (React Enterprise)

Use this document when creating or changing components, hooks, services, and tests in this repository.

## Project goal

Build a scalable, maintainable, enterprise-grade React application with:

- Clean separation of UI, logic, API, types, and utilities
- Strong TypeScript typing
- Reusable components and consistent UI/UX
- Automated tests for business logic and critical flows

---

## Tech standards

| Rule | Requirement |
|------|-------------|
| Language | TypeScript only (no plain `.jsx` for new code) |
| Components | Functional components + hooks only (no class components) |
| State | Prefer local state + context; avoid unnecessary global state |
| Styling | Tailwind CSS + existing `components/ui/*` primitives |
| HTTP | `apiClient` from `src/api/index.ts` — not raw `fetch` in components |
| Alerts | SweetAlert2 via shared helpers (e.g. `formatApiErrorForSwal`) |
| Build | Vite |

---

## Current vs target folder structure

**Today (legacy-friendly):**

```txt
src/
  api/              # API clients (treat as services)
  components/       # Page + feature UI (some files are large)
  components/ui/    # Shared design-system primitives
  hooks/
  types/
  utility/          # Pure helpers (prefer over inline logic)
  utils/            # Domain formulas (CPCP, TCC, etc.)
  constants/
  context/
```

**Target for new features:**

```txt
src/
  components/
    common/         # Cross-feature UI (buttons, tables, import triggers)
    forms/
    layout/
  features/
    <feature-name>/
      components/
      hooks/
      services/     # Thin wrappers over src/api if needed
      types/
      tests/
  hooks/            # App-wide hooks only
  api/              # Shared API modules (keep existing pattern)
  utility/
  routes/
```

When touching a **large legacy file** (e.g. `Operation.tsx`), prefer **extracting** hooks/utilities into `utility/` or `features/operations/` instead of growing the file.

---

## Component rules

1. **Single responsibility** — One main purpose per component (list, form, modal shell, filter bar).
2. **PascalCase** — `AircraftFleetProfile`, `DataTablePagination`.
3. **Props** — Define a `type` or `interface` for props; avoid `any`.
4. **No API calls in presentational components** — Fetch in hooks or page containers; pass data via props.
5. **No hardcoded magic values** — Use constants, env, or props (status enums, page sizes, API paths in `api/`).
6. **Reuse** — Use `components/ui/*`, `DataTablePagination`, `Spinner`, shared formatters from `utility/`.
7. **Size limit** — Aim for &lt; 300 lines per component file; split when larger.
8. **Modals** — Controlled via `isOpen` + `onClose`; keep form state in the modal or a dedicated hook.

### Example (good)

```tsx
// features/aircraft/components/AircraftImportButton.tsx
type AircraftImportButtonProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
};

export function AircraftImportButton({
  onFileSelected,
  disabled,
}: AircraftImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        Import
      </button>
    </>
  );
}
```

```tsx
// Page/container wires API + Swal
const handleImport = async (file: File) => {
  try {
    await importAircraftExcel(file);
  } catch (err) {
    const content = formatApiErrorForSwal(err, {
      validationTitle: "Validation Error",
    });
    await Swal.fire({ ...content, confirmButtonText: "OK" });
  }
};
```

### Anti-patterns (avoid)

- 3,000+ line components mixing table, export, import, modals, and API
- Duplicated Swal error parsing in every `catch`
- Inline Excel header validation in JSX event handlers without shared utilities

---

## API / services layer

- One module per domain under `src/api/` (e.g. `aircraftApi.tsx`, `aircraftTechnicalLogApi.tsx`).
- Export typed functions; return typed data or throw axios errors.
- Use `toCamel` / `toCamelDeep` from `utility/utils` when normalizing responses.
- Document non-obvious endpoints with a short JSDoc (method + path).
- **Do not** import React in `api/` files.

---

## Hooks

- Prefix with `use` — `useAircrafts`, `useUserPermissions`.
- Hooks may call `api/` and manage loading/error state.
- Return stable shapes: `{ data, loading, error, refresh }`.
- Colocate feature-specific hooks under `features/<name>/hooks/` when adding new domains.

---

## Types

- Shared domain types in `src/types/` (e.g. `Aircraft.ts`).
- Feature-only types live next to the feature.
- Prefer explicit unions over `string` for statuses when known (`AtlWorkStatusKey`, etc.).

---

## Utilities

- **Pure functions** — date/format/validation/excel parsing (e.g. `utility/aircraftFleetImportExcelHeaders.ts`, `formatApiErrorForSwal`).
- No React imports in `utility/` or `utils/`.
- Unit-test all non-trivial utilities.

---

## UI / UX (this project)

- Confirm destructive actions with SweetAlert2 (`warning` + cancel).
- **422 / validation errors:** `icon: "error"`, `title: "Validation Error"`, `text: "<message>"` via `formatApiErrorForSwal` / `formatValidationErrorForSwal`.
- **500 on import:** show admin message where already established (e.g. ATL import).
- Pagination: `DataTablePagination` with consistent `pageSizeOptions`.
- Permissions: `useUserPermissions()` — gate create/update/delete, don’t rely on hiding alone.

---

## Testing rules

### Stack

- **Vitest** — test runner
- **@testing-library/react** — component tests (when needed)
- **jsdom** — DOM environment
- **@testing-library/jest-dom** — matchers

### Commands

```bash
npm run test        # watch mode
npm run test:run    # single run (CI)
```

### What to test

| Priority | Target | Type |
|----------|--------|------|
| High | `utility/*`, `utils/*` pure functions | Unit |
| High | API response normalizers / validators | Unit |
| Medium | Custom hooks (with mock API) | Hook tests |
| Medium | Critical forms (submit validation) | Component + RTL |
| Lower | Full page snapshots | Avoid unless necessary |

### Test file placement

- Colocate: `foo.ts` → `foo.test.ts` in the same folder, **or**
- Feature: `features/users/tests/UsersList.test.tsx`

### Conventions

- Describe behavior, not implementation: `it("returns Validation Error swal content for HTTP 422")`.
- Arrange–Act–Assert structure.
- Mock `apiClient` / modules at service boundary, not inside UI leaf components.
- No real network calls in tests.

### Example

See `src/utility/utils.apiError.test.ts` and `src/utility/aircraftFleetImportExcelHeaders.test.ts`.

---

## Pull request checklist (AI & humans)

- [ ] TypeScript compiles; no new `any` without justification
- [ ] API logic stays in `api/` or feature `services/`
- [ ] New UI is reusable or clearly scoped to one feature
- [ ] Validation/errors use shared Swal helpers for 422
- [ ] Tests added/updated for new business logic
- [ ] No unrelated refactors in the same PR

---

## Migrating legacy components

For files like `Operation.tsx` or `AddTechnicalLogbookEntryModal.tsx`:

1. Extract **pure helpers** → `utility/` (already started: export columns helpers, ATL prerequisites, import headers).
2. Extract **data fetching** → custom hooks (`useFleetTimeRecords`, `useAtlImport`).
3. Split **views** by `groupBy` or tab into subcomponents under `features/operations/components/`.
4. Keep behavior identical; avoid big-bang rewrites.

---

## References in this repo

| Concern | Location |
|---------|----------|
| API client | `src/api/index.ts` |
| Error → Swal | `formatApiErrorForSwal`, `formatValidationErrorForSwal` in `src/utility/utils.tsx` |
| Aircraft Excel import headers | `src/utility/aircraftFleetImportExcelHeaders.ts` |
| ATL edit permissions | `src/utility/atlEditRbac.ts` |
| Permissions hook | `src/hooks/useUserPermissions.ts` |
| UI primitives | `src/components/ui/` |

When instructions conflict, **match existing patterns in the file you are editing** unless this document or the user explicitly requests a structural change.
