import { Anchor, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Link, useParams } from 'react-router';

import {
  createBooking,
  getMeetingType,
  listSlots,
  type Booking,
  type MeetingType,
  type Slot,
} from '../api';
import { BookingConfirmation } from './BookingConfirmation';
import { paths } from '../paths';
import { bookingDays, ownerDay, ownerTime } from './ownerTime';

type Availability =
  | { kind: 'loading' | 'missing' | 'failed' }
  | { kind: 'ready'; item: MeetingType; slots: Slot[]; today: Date };

export function MeetingTypePage() {
  const { meetingTypeId = '' } = useParams();
  return <AvailabilityPage key={meetingTypeId} id={meetingTypeId} />;
}

function AvailabilityPage({ id }: { id: string }) {
  const [state, setState] = useState<Availability>({ kind: 'loading' });
  const loadedType = useRef<MeetingType | undefined>(undefined);
  const [retry, setRetry] = useState(0);
  const [day, setDay] = useState('');
  const [start, setStart] = useState('');

  const [guestName, setName] = useState('');
  const [guestEmail, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<Booking>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFields({});
    setNotice('');
    try {
      const result = await createBooking({
        meetingTypeId: id,
        startAt: start,
        guestName,
        guestEmail,
      });
      if (result.data) {
        setConfirmation(result.data);
        return;
      }
      const { code, fields } = result.error;
      if (code === 'conflict' || code === 'slot_unavailable') {
        setNotice(
          code === 'conflict'
            ? 'Это время уже занято. Выберите другое.'
            : 'Это время больше недоступно. Выберите другое.',
        );
        setStart('');
        setState({ kind: 'loading' });
        setRetry((attempt) => attempt + 1);
      } else if (code === 'meeting_type_not_found') {
        setState({ kind: 'missing' });
      } else if (code === 'validation_error' && fields?.length) {
        setFields(Object.fromEntries(fields.map(({ field, message }) => [field, message])));
        if (fields.some(({ field }) => field !== 'guestName' && field !== 'guestEmail'))
          setNotice('Не удалось забронировать время');
      } else {
        setNotice('Не удалось забронировать время');
      }
    } catch {
      setNotice('Не удалось забронировать время');
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    let active = true;
    const today = new Date();
    Promise.all([loadedType.current ?? getMeetingType(id), listSlots(id)]).then(
      ([item, slots]) => {
        if (!active) return;
        loadedType.current = item;
        setDay((previous) =>
          slots.some((slot) => ownerDay(new Date(slot.startAt)) === previous) ? previous : '',
        );
        setState({ kind: 'ready', item, slots, today });
      },
      (error: unknown) => {
        const missing =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'meeting_type_not_found';
        if (active) setState({ kind: missing ? 'missing' : 'failed' });
      },
    );
    return () => {
      active = false;
    };
  }, [id, retry]);

  const byDay = new Map<string, Slot[]>();
  if (state.kind === 'ready') {
    for (const slot of state.slots) {
      const key = ownerDay(new Date(slot.startAt));
      const group = byDay.get(key);
      if (group) group.push(slot);
      else byDay.set(key, [slot]);
    }
  }
  if (confirmation && state.kind === 'ready')
    return <BookingConfirmation booking={confirmation} item={state.item} />;
  return (
    <Stack>
      {notice && <Text role="alert">{notice}</Text>}
      {state.kind === 'loading' && <Text role="status">Загружаем свободное время…</Text>}
      {state.kind === 'missing' && <Text role="alert">Этот тип встречи больше недоступен.</Text>}
      {state.kind === 'failed' && (
        <>
          <Text role="alert">Не удалось обновить свободное время</Text>
          <Button
            onClick={() => {
              setState({ kind: 'loading' });
              setRetry(retry + 1);
            }}
          >
            Обновить
          </Button>
        </>
      )}
      {state.kind === 'ready' && (
        <>
          <Title order={1}>{state.item.title}</Title>
          <Text>{state.item.description}</Text>
          <Text>{state.item.durationMinutes} мин</Text>
          <Text>Время московское (UTC+3)</Text>
          <Group aria-label="Дни для записи" role="group">
            {bookingDays(state.today).map(({ key, label }) => (
              <Button
                key={key}
                disabled={pending || !byDay.has(key)}
                aria-pressed={day === key}
                variant={day === key ? 'filled' : 'light'}
                onClick={() => {
                  setDay(key);
                  setStart('');
                }}
              >
                {label}
              </Button>
            ))}
          </Group>
          {state.slots.length === 0 && <Text>На ближайшие 14 дней нет свободного времени</Text>}
          {day && (
            <Group aria-label="Время начала" role="group">
              {byDay.get(day)?.map((slot) => (
                <Button
                  key={slot.startAt}
                  disabled={pending}
                  aria-pressed={start === slot.startAt}
                  variant={start === slot.startAt ? 'filled' : 'light'}
                  onClick={() => setStart(slot.startAt)}
                >
                  {ownerTime(slot.startAt)}
                </Button>
              ))}
            </Group>
          )}
          {start && (
            <form onSubmit={submit} noValidate>
              <Stack>
                <TextInput
                  label="Имя"
                  autoComplete="name"
                  disabled={pending}
                  value={guestName}
                  error={fields.guestName}
                  onChange={(e) => setName(e.currentTarget.value)}
                />
                <TextInput
                  label="Email"
                  type="email"
                  autoComplete="email"
                  disabled={pending}
                  value={guestEmail}
                  error={fields.guestEmail}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <Button type="submit" loading={pending} disabled={pending}>
                  Забронировать
                </Button>
              </Stack>
            </form>
          )}
        </>
      )}
      <Anchor component={Link} to={paths.catalog}>
        К каталогу
      </Anchor>
    </Stack>
  );
}
