// Which week of a mesocycle the user is training right now.
//
// The week is NOT stored. What is stored is an anchor -- a week number plus the
// Argentine Monday during which that number applied -- and the current week is
// derived from it on every read:
//
//   current_week = clamp(week_anchor_week + Mondays elapsed, 1, total_weeks)
//
// That makes the week advance on its own the moment a new calendar week starts,
// with no cron job and no background task, while still letting the user set it
// by hand: writing week N rewrites the anchor to (N, this Monday), so
// auto-advance simply resumes from wherever they put it.
//
// The week boundary is Monday 00:00 in America/Argentina/Buenos_Aires. Argentina
// is UTC-3 all year and has had no DST since 2009, but nothing here hardcodes
// -3: the offset is resolved by name through the platform's timezone database,
// so the boundary stays correct if that ever changes.
//
// Every function takes the clock as a parameter (defaulting to the real one) so
// the whole module is testable without freezing time -- the same shape
// mesocycleCalculator.ts uses.

export const ART_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

// en-CA formats as YYYY-MM-DD, which is the shape a Postgres DATE comes back
// as, so no re-assembly is needed.
const ART_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: ART_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date it is in Argentina at `now`, as YYYY-MM-DD. */
export function artDateOf(now: Date = new Date()): string {
  return ART_DATE_FORMAT.format(now);
}

// A calendar date has no timezone, so it is safe to do the day arithmetic in
// UTC: both ends of every subtraction below are midnight-UTC stand-ins for a
// date, never real instants.
function toUtcMidnight(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMidnight(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The Monday of the calendar week the given date falls in. */
export function mondayOf(isoDate: string): string {
  const ms = toUtcMidnight(isoDate);
  const sundayFirstDow = new Date(ms).getUTCDay();
  const isoDow = sundayFirstDow === 0 ? 7 : sundayFirstDow;
  return fromUtcMidnight(ms - (isoDow - 1) * MS_PER_DAY);
}

/** The Monday of the Argentine calendar week `now` falls in. */
export function artMondayOf(now: Date = new Date()): string {
  return mondayOf(artDateOf(now));
}

/**
 * The Argentine UTC offset (in minutes, negative for behind UTC) in effect at
 * `instant`. Resolved through the platform's timezone database rather than
 * hardcoded -180, so this keeps working if Argentina's DST rules ever change
 * again -- same reasoning as ART_DATE_FORMAT above.
 */
function artOffsetMinutesAt(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ART_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  // Some ICU implementations report midnight as hour "24" rather than "00".
  const hour = Number(parts.hour) % 24;
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  return (asIfUtc - instant.getTime()) / (60 * 1000);
}

/**
 * The real UTC instant that is 00:00 in Argentina on the given calendar date.
 * Needed anywhere a calendar boundary (a month, a week) has to be compared
 * against a TIMESTAMPTZ column rather than another calendar date.
 */
export function artMidnightUtc(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  // Guess midnight UTC, then correct by the ART offset at that instant. Since
  // Argentina's offset is constant across the correction, this lands exactly
  // on real ART midnight.
  const guess = Date.UTC(year, month - 1, day);
  const offsetMinutes = artOffsetMinutesAt(new Date(guess));
  return new Date(guess - offsetMinutes * 60 * 1000);
}

// A DATE column arrives as 'YYYY-MM-DD'; a caller holding a Date is accepted
// too so the anchor can be built in memory without formatting it first.
function toIsoDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Whole calendar weeks from one Monday to another; negative when `toMonday`
 * comes first. Both ends are snapped to their own Monday, so a mid-week date
 * (legacy or hand-edited data) counts weeks instead of drifting by a fraction.
 */
export function mondaysBetween(from: string | Date, to: string | Date): number {
  const fromMs = toUtcMidnight(mondayOf(toIsoDate(from)));
  const toMs = toUtcMidnight(mondayOf(toIsoDate(to)));
  return Math.round((toMs - fromMs) / MS_PER_WEEK);
}

export interface WeekAnchor {
  week_anchor_week: number;
  week_anchor_monday: string | Date;
  total_weeks: number;
}

/**
 * The week the user is on right now. Clamped to the block: a mesocycle left
 * running for months reports its final week rather than a number past its end,
 * and an anchor dated in the future reports week 1 rather than zero or less.
 */
export function currentWeekFor(anchor: WeekAnchor, now: Date = new Date()): number {
  const elapsed = mondaysBetween(anchor.week_anchor_monday, artMondayOf(now));
  const raw = anchor.week_anchor_week + elapsed;
  return Math.min(Math.max(raw, 1), Math.max(anchor.total_weeks, 1));
}

/**
 * The anchor to write when the user sets the week by hand: this week number,
 * starting from the calendar week they are in. Next Monday it advances again.
 */
export function anchorForWeek(week: number, now: Date = new Date()) {
  return { week_anchor_week: week, week_anchor_monday: artMondayOf(now) };
}

/**
 * A mesocycle row plus the derived `current_week` the client reads. The column
 * is gone from the table (migration 010) but the field stays in the API shape:
 * it is the one number every consumer actually wants, and computing it here
 * keeps the anchor the only thing that is ever stored.
 */
export function withCurrentWeek<T extends WeekAnchor>(row: T, now: Date = new Date()) {
  return { ...row, current_week: currentWeekFor(row, now) };
}
