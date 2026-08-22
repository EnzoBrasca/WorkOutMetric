# Metric Lab Mobile — Remaining Work

Audited and rewritten 2026-08-22. The previous version of this file was badly out of
date: it described the app as "a static UI shell" with no auth, no API layer and no
persistence. All three of those exist now. The list below reflects the actual state
of the code.

**Stack:** Expo ~54.0.36, React Native 0.81.5, React 19.1, react-navigation
(native-stack + bottom-tabs), Zustand 5 with `persist`/AsyncStorage, custom i18n,
react-native-svg. Backend is the custom API at `metric-lab-api`
(`https://metric-lab-api.vercel.app/api`), not Supabase directly.

---

## Already implemented (do not re-report these as missing)

- **Auth** — login/register/logout, JWT held in `useAuthStore`, persisted via
  `zustand/persist` + AsyncStorage, auth-gated navigator in `App.js`.
- **API layer** — `src/config/api.js` resolves dev vs. production base URL; stores
  call the backend with `fetch` and a `Bearer` token.
- **Persistence** — all four stores use `persist` + AsyncStorage.
- **Exercise CRUD** — add / edit / delete with cloud sync on each mutation.
- **Push/Pull filtering** — `TrainScreen` filters by `ex.type === activeTab`.
- **Session logging** — `logSession` posts to `/sessions/sync`.
- **Real 1RM stats** — `loadStats` fetches server-computed Epley values from
  `/data/stats`; `DataScreen` renders a real SVG radar chart (not a PNG).
- **Config screen** — 1RM values are editable, RESET and SAVE CONFIG are wired.
- **Architecture** — components are split into `atoms/molecules/organisms`, and the
  data logic of Train/Data/Config/Profile lives in `src/hooks/` so the screens are
  presentational.

---

## 1. Bugs

| # | Issue | Detail |
|---|-------|--------|
| 1.1 | **Deleting an exercise never reaches the cloud** | `useWorkoutStore.removeExercise` drops the row locally, then calls `syncExercises`, which is an **upsert** — it can create and update, never delete. The exercise reappears on next `loadExercises`. Needs a `DELETE` endpoint or a sync that reconciles removals. |
| 1.2 | `ExerciseCard` uses a non-existent theme key | `colors.error \|\| '#ef4444'` — the palette has no `error` key, so it silently falls back to the hardcoded hex on every render. The palette already defines `danger` for this purpose. |
| 1.3 | Untranslated hardcoded strings | `ExerciseModal`'s title (`EDIT_EXERCISE` / `NEW_EXERCISE`) and `SessionModal`'s `FINISH & LOG` label bypass `t(...)` while every other label in those files uses it. |

## 2. Gaps

| # | Gap | Detail |
|---|-----|--------|
| 2.1 | React Query is dead weight | `@tanstack/react-query` is installed and `QueryClientProvider` is mounted in `App.js`, but **no `useQuery`/`useMutation` exists anywhere**. Server state is hand-rolled `fetch` inside Zustand stores. Either adopt it for server state (and get caching/retry/dedup) or drop the dependency. |
| 2.2 | No tests | No test script, no jest config, no test files. The stores and the 1RM logic are the obvious first targets. |
| 2.3 | Unused Supabase dependencies | `@supabase/supabase-js` and `@supabase/ssr` are in `package.json`, but the app only talks to the custom API. Dead weight in the bundle. |
| 2.4 | `LogsScreen` is fully hardcoded | A literal 5-row array (2023.11 → 2024.03) with hardcoded `delta` strings and colors. No API call, rows aren't pressable, no filtering or pagination. It is the last screen with zero real data. |
| 2.5 | No loading / error / empty states | `useWorkoutStore.isLoading` exists but nothing renders a spinner, a retry, or a "no data yet" state. Failed `fetch` calls only `console.error`. |
| 2.6 | No session lifecycle | `logSession` records one exercise at a time. There is no START / FINISH WORKOUT flow, so `workout_sessions.started_at`/`ended_at` are always the same instant and one session row is created per exercise. |
| 2.7 | No rest timer | Called for in `PROJECT_PLAN.md`, not built. |
| 2.8 | Default 1RM values are fake | `useConfigStore.defaultLifts` ships six hardcoded lifts (BARBELL SQUAT 140, etc.) that render before/instead of real data for a new user. |
| 2.9 | No form validation | Exercise and profile forms accept any input, including empty and non-numeric weights. |
| 2.10 | Units hardcoded | `KG` is a literal everywhere; no unit preference or conversion. |
| 2.11 | Header version is a literal | `METRIC_LAB` / version string isn't read from `app.json`. |

## 3. Suggested order

1. Fix 1.1 (data loss — deletions silently revert), then 1.2 and 1.3.
2. Decide on 2.1: adopt React Query for server state, or remove it and 2.3.
3. Add tests (2.2) before the next round of feature work.
4. Wire `LogsScreen` to real session history (2.4), which depends on 2.6.
5. Session lifecycle (2.6) + rest timer (2.7) — the remaining core workout loop.
6. Polish: loading/error states, validation, units, version string.
