import { Anchor, Paper, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { listMeetingTypes, type MeetingType } from '../api';
import { paths } from '../paths';

export function CatalogPage() {
  const [types, setTypes] = useState<MeetingType[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    listMeetingTypes().then(
      (items) => {
        if (active) setTypes(items);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack gap="md">
      <Title order={1}>Каталог типов встреч</Title>
      {types?.length === 0 && <Text>Типов встреч пока нет</Text>}
      {types?.map((item) => (
        <Paper component="article" key={item.id} p="md" withBorder>
          <Title order={2} size="h3">
            <Anchor component={Link} to={paths.meetingType(item.id)}>
              {item.title}
            </Anchor>
          </Title>
          <Text>{item.description}</Text>
          <Text c="dimmed">{item.durationMinutes} мин</Text>
        </Paper>
      ))}
      {failed && <Text role="alert">Не удалось загрузить типы встреч</Text>}
      <Anchor component={Link} to={paths.home}>
        На главную
      </Anchor>
    </Stack>
  );
}
