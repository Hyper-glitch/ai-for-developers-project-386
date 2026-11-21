import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import type { Booking, MeetingType } from '../api';
import { paths } from '../paths';
import { ownerDate, ownerTime } from './ownerTime';

export function BookingConfirmation({ booking, item }: { booking: Booking; item: MeetingType }) {
  return (
    <Stack>
      <Title order={1}>Бронирование подтверждено</Title>
      <Text>{item.title}</Text>
      <Text>
        {ownerDate(booking.startAt)}, {ownerTime(booking.startAt)}
      </Text>
      <Text>Время московское (UTC+3)</Text>
      <Text>{item.durationMinutes} мин</Text>
      <Text>{booking.guestName}</Text>
      <Text>{booking.guestEmail}</Text>
      <Anchor component={Link} to={paths.catalog}>
        Записаться ещё
      </Anchor>
    </Stack>
  );
}
