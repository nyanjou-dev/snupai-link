const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(timestamp?: number) {
  if (!timestamp) return "Never";
  return DATE_TIME_FORMATTER.format(new Date(timestamp));
}

export function formatExpiry(timestamp?: number) {
  if (!timestamp) return "No expiry";
  return DATE_TIME_FORMATTER.format(new Date(timestamp));
}

/**
 * Converts a UTC timestamp into a local `datetime-local` field value.
 */
export function toDatetimeLocalValue(timestamp?: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parses `YYYY-MM-DDTHH:mm` from datetime-local into a UTC timestamp.
 */
export function fromDatetimeLocalValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const asLocal = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  );

  const timestamp = asLocal.getTime();
  if (!Number.isFinite(timestamp)) return null;
  return timestamp;
}
