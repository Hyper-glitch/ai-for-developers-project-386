import { Paper, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { listBookings, listMeetingTypes, type Booking } from '../api';
import { ownerDate, ownerTime } from './ownerTime';

export function OwnerBookingsPage() {
  const [rows, setRows] = useState<(Booking & { title: string })[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bookings = await listBookings();
        const types = bookings.length ? await listMeetingTypes() : [];
        const titles = new Map(types.map((type) => [type.id, type.title]));
        if (active)
          setRows(
            bookings.map((booking) => ({
              ...booking,
              title: titles.get(booking.meetingTypeId) ?? 'Неизвестный тип встречи',
            })),
          );
      } catch {
        if (active) setFailed(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack>
      <Title>Бронирования</Title>
      {rows?.length === 0 && <Text>Бронирований пока нет</Text>}
      {!!rows?.length && <Text>Время московское (UTC+3)</Text>}
      {rows?.map((booking) => (
        <Paper component="article" key={booking.id} withBorder p="md">
          <Title order={2}>{booking.title}</Title>
          <Text>
            {ownerDate(booking.startAt)}, {ownerTime(booking.startAt)}
          </Text>
          <Text>{booking.guestName}</Text>
          <Text>{booking.guestEmail}</Text>
        </Paper>
      ))}
      {failed && <Text role="alert">Не удалось загрузить бронирования</Text>}
    </Stack>
  );
}
