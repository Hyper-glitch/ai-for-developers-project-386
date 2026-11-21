import { Anchor, Button, Group, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { getMeetingType, listSlots, type MeetingType, type Slot } from '../api';
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
  const [retry, setRetry] = useState(0);
  const [day, setDay] = useState('');
  const [start, setStart] = useState('');

  useEffect(() => {
    let active = true;
    const today = new Date();
    Promise.all([getMeetingType(id), listSlots(id)]).then(
      ([item, slots]) => {
        if (active) setState({ kind: 'ready', item, slots, today });
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
  return (
    <Stack>
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
                disabled={!byDay.has(key)}
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
                  aria-pressed={start === slot.startAt}
                  variant={start === slot.startAt ? 'filled' : 'light'}
                  onClick={() => setStart(slot.startAt)}
                >
                  {ownerTime(slot.startAt)}
                </Button>
              ))}
            </Group>
          )}
        </>
      )}
      <Anchor component={Link} to={paths.catalog}>
        К каталогу
      </Anchor>
    </Stack>
  );
}
