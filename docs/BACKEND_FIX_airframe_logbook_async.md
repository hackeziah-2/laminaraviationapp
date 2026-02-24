# Fix: "Failed to create airframe logbook" — greenlet_spawn / await_only

The error  
`greenlet_spawn has not been called; can't call await_only() here. Was IO attempted in an unexpected place?`  
comes from the **backend** (Python/SQLAlchemy), not from this frontend.

Apply the following in the API project that handles `POST /api/v1/logbooks/airframe` (or your equivalent airframe logbook create endpoint).

---

## Cause

- **Async/sync mismatch:** The route or service uses **async** SQLAlchemy (`AsyncSession`) but somewhere does one of:
  - Sync DB calls (e.g. `session.query()`, `session.commit()` without `await`)
  - Lazy loading of relationships after the request/session context
  - Using a **sync** `Session`/engine inside an **async** route (or the opposite)

---

## Fixes (in the backend codebase)

### 1. Use async engine and driver

- Engine: `create_async_engine(...)` (not `create_engine`).
- DB URL: use an async driver, e.g.:
  - PostgreSQL: `postgresql+asyncpg://user:pass@host/db`
  - MySQL: `mysql+aiomysql://...`

### 2. Use AsyncSession and await all DB work

- Session: `async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)`.
- In the **airframe logbook create** path, ensure every DB call is awaited, for example:
  - `await session.execute(select(...))` instead of `session.query(...)`
  - `await session.add(instance)` then `await session.commit()`
  - `await session.refresh(instance)` if you need the created row in memory

### 3. Avoid lazy loading in the response

- After commit, if you build a response from the created logbook and its **relationships** (e.g. component_parts, mechanic), load them explicitly in the same async context, e.g.:
  - `await session.execute(select(AirframeLogbook).options(selectinload(AirframeLogbook.component_parts)).where(...))`
- Do **not** rely on lazy access (e.g. `instance.component_parts`) after the session is closed or in a sync helper.

### 4. Ensure the create route is async and uses AsyncSession

Example pattern:

```python
# Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Route
@router.post("/logbooks/airframe")
async def create_airframe_logbook(data: ..., db: AsyncSession = Depends(get_db)):
    ...
    await db.commit()
    await db.refresh(instance)  # if needed
    return ...
```

If the route is `def` (sync), either:

- Change it to `async def` and use `AsyncSession` + `await` for all DB operations, or  
- Use a **sync** `Session` and sync engine for that route (no AsyncSession in that path).

---

## Quick checklist for the airframe logbook create endpoint

- [ ] Engine is async (`create_async_engine`) with async driver in the URL.
- [ ] Session is `AsyncSession` (e.g. from `async_sessionmaker(..., class_=AsyncSession)`).
- [ ] Route is `async def` and injects `AsyncSession` (e.g. via `Depends(get_db)`).
- [ ] No `session.query(...)` — use `await session.execute(select(...))`.
- [ ] All session methods that do I/O are awaited: `add`, `commit`, `refresh`, `execute`.
- [ ] No lazy loading when building the response; use `selectinload`/`joinedload` and use the loaded data before returning.

Applying these in the backend that serves `logbooks/airframe` should resolve the "greenlet_spawn / await_only" error when creating an airframe logbook.
