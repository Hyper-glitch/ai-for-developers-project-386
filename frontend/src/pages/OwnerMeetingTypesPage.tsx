import { Paper, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { listMeetingTypes, type MeetingType } from '../api';
import { MeetingTypeForm } from './MeetingTypeForm';

export function OwnerMeetingTypesPage() {
  const [types, setTypes] = useState<MeetingType[]>();
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let active = true;
    listMeetingTypes().then(
      (items) => {
        if (active) setTypes(items);
      },
      () => {
        if (active) setLoadFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return (
    <Stack>
      <Title>Типы встреч</Title>
      {types && (
        <MeetingTypeForm
          onCreated={(item) => setTypes((previous) => [...(previous ?? []), item])}
        />
      )}
      {loadFailed && <Text role="alert">Не удалось загрузить типы встреч</Text>}
      {types?.length === 0 && <Text>Типов встреч пока нет</Text>}
      {types?.map((item) => (
        <Paper key={item.id} withBorder p="md">
          <Title order={2}>{item.title}</Title>
          <Text>{item.description}</Text>
          <Text>{item.durationMinutes} мин</Text>
        </Paper>
      ))}
    </Stack>
  );
}
