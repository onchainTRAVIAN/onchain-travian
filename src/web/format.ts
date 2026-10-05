export function fmtNum(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}

export function fmtSigned(n: number): string {
  const r = Math.round(n);
  return (r > 0 ? '+' : '') + r.toLocaleString('en-US');
}

/** 3725000 -> "1:02:05"; days shown as "2d 03:04:05". */
/** Time per unit: seconds with a decimal under a minute (fast worlds), else h:mm:ss. */
export function fmtUnitTime(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
  return fmtDuration(ms);
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  const hms = `${d > 0 ? pad(h) : h}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(11, 19);
}

export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

export function fmtAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

