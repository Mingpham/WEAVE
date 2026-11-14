import {ApiFailure} from './api-client';

// Resolve a wall-clock value in the selected IANA zone; never infer the device zone.
export function localToUtc(value: string, timeZone: string): string {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) throw new ApiFailure('VALIDATION_FAILED');
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== value) throw new ApiFailure('VALIDATION_FAILED');
  const formatter = new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
  const wallAt = (timestamp: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(p => [p.type, p.value]));
    return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  };
  let timestamp = wall;
  for (let n = 0; n < 4; n++) timestamp += wall - wallAt(timestamp);
  if (wallAt(timestamp) !== wall) throw new ApiFailure('VALIDATION_FAILED');
  // Ambiguous fall-back clocks need an explicit different time instead of a guessed offset.
  if ([timestamp - 3_600_000, timestamp + 3_600_000].some(candidate => wallAt(candidate) === wall)) throw new ApiFailure('VALIDATION_FAILED');
  return new Date(timestamp).toISOString();
}
