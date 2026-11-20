const timeZone = 'Europe/Moscow';
const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dayLabel = new Intl.DateTimeFormat('ru-RU', {
  timeZone,
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});
const clock = new Intl.DateTimeFormat('ru-RU', {
  timeZone,
  hour: '2-digit',
  minute: '2-digit',
});

export const ownerDay = (instant: Date) => dayKey.format(instant);
export const ownerTime = (instant: string) => clock.format(new Date(instant));

export function bookingDays(now: Date) {
  const day = new Date(ownerDay(now) + 'T12:00:00Z');
  return Array.from({ length: 14 }, () => {
    const result = { key: ownerDay(day), label: dayLabel.format(day) };
    day.setUTCDate(day.getUTCDate() + 1);
    return result;
  });
}

const fullDate = new Intl.DateTimeFormat('ru-RU', { timeZone, dateStyle: 'long' });
export const ownerDate = (instant: string) => fullDate.format(new Date(instant));
