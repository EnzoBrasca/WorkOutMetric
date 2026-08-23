# Metric Lab Mobile — Remaining Work

Rewritten 2026-08-23. Every item from the previous audit has been closed. Each
was verified against the code before being moved here — five of them (1.1, 1.2,
1.3, 2.1, 2.3) turned out to have already been fixed in an earlier session while
still being listed as open.

**Stack:** Expo ~54.0.36, React Native 0.81.5, React 19.1, react-navigation
(native-stack + bottom-tabs), Zustand 5 with `persist`/AsyncStorage, custom i18n,
react-native-svg, `@react-native-picker/picker`. Tests run on jest-expo. Backend
is the custom API at `metric-lab-api` (`https://metric-lab-api.vercel.app/api`),
not Supabase directly.

---

## Already implemented (do not re-report these as missing)

- **Auth** — login/register/logout, JWT held in `useAuthStore`, persisted via
  `zustand/persist` + AsyncStorage, auth-gated navigator in `App.js`.
- **API layer** — `src/api/` holds thin per-domain wrappers (`client.js`,
  `mesocycles`, `routines`, `sessions`, `oneRm`) over a shared fetch helper that
  attaches the Bearer token and normalises the `{error}` response shape.
- **Persistence** — every store uses `persist` + AsyncStorage.
- **Exercise CRUD** — add / edit / delete with cloud sync, including an explicit
  `DELETE` so removals actually reach the server.
- **Routines** — exercises belong to real `routines` / `routine_exercises` rows;
  the exercise form picks the routine and derives `target_sets`/`target_reps`
  from the `4x8` field.
- **Mesocycles** — create (start %, total weeks, per-week increment, optional
  deload), switch the active one, delete, and step through weeks. Target weight
  and reps are calculated server-side from each exercise's 1RM and the week's
  percentage of it.
- **1RM** — `exercises.one_rm` is the reference every target weight derives from,
  backfilled from logged history. Exercises without one are flagged in the UI
  and can have a value entered inline instead of being shown a fake 0 kg.
- **Session lifecycle** — START / FINISH WORKOUT with a live elapsed timer; one
  session holds many `set_logs`; an in-progress workout is resumed on focus, and
  logging an exercise auto-starts a session rather than failing silently.
- **Rest timer** — manual start/stop with a duration configurable in Config.
- **History** — `LogsScreen` renders real paginated session history with volume
  and a percentage delta, expandable per session, recording which mesocycle week
  produced each one.
- **Loading, error and empty states** — shared `AsyncState` molecule used across
  Train, Data, Config and Logs. Failed requests surface a retry instead of being
  swallowed into `console.error`.
- **Form validation** — exercise and profile forms validate inline via i18n.
- **Tests** — jest-expo; store rollback behaviour, the rest timer's cleanup, and
  the sets parser are covered.
- **Architecture** — atoms / molecules / organisms, with per-screen data logic in
  `src/hooks/` so screens stay presentational.

---

## Resolved by decision

| # | Item | Decision |
|---|------|----------|
| 2.10 | Units | **kg only.** Pounds support was explicitly declined; the unit renders from the single i18n `KG` key with no raw literals bypassing it. |

---

## Open

Nothing from the previous audit remains open.

Worth knowing before the next round of work:

- **`useProfileScreen` carries its own inline `translations` object** instead of
  using `src/i18n`. It works, but it is the one place that bypasses the shared
  i18n module.
- **`syncExercises` still upserts the whole exercise list on every mutation.**
  Fine at the current scale, but it rewrites every row to change one. Note that
  `one_rm` is deliberately excluded from that payload — postgrest-js normalises
  the column set across upserted rows, so including it would blank the 1RM on
  any exercise whose payload omitted it.
- **`POST /sessions/sync` is kept alive on the backend** purely for the Android
  build already in users' hands, which logs every exercise through it. The app
  itself now uses the START/LOG/FINISH lifecycle. Do not remove that route until
  those installs are gone.
- **`restTimerSeconds` is local-only** (AsyncStorage), not part of the cloud
  preferences payload.
- **No component tests yet** — coverage is stores, hooks and pure helpers.
