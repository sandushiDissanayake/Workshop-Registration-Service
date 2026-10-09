export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
export const fmtRange = (s: string, e: string) => `${fmtDate(s)} · ${fmtTime(s)}–${fmtTime(e)}`;
/** ISO -> value for <input type="datetime-local"> in local time */
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const toDateInput = (d: Date) => toLocalInput(d.toISOString()).slice(0, 10);
