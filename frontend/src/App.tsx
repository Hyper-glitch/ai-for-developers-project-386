import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

import { systemHealth } from './api';

type ApiState = 'checking' | 'up' | 'down';

const badge: Record<ApiState, { color: string; label: string }> = {
  checking: { color: 'gray', label: 'проверяем…' },
  up: { color: 'green', label: 'доступен' },
  down: { color: 'red', label: 'недоступен' },
};

export default function App() {
  const [api, setApi] = useState<ApiState>('checking');

  useEffect(() => {
    systemHealth()
      .then(({ data }) => setApi(data?.status === 'ok' ? 'up' : 'down'))
      .catch(() => setApi('down'));
  }, []);

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Запись на звонок</Title>
        <Text c="dimmed">Каркас приложения. Функциональность появится на следующих шагах.</Text>
        <Group gap="xs">
          <Text>Бекенд:</Text>
          <Badge color={badge[api].color}>{badge[api].label}</Badge>
        </Group>
      </Stack>
    </Container>
  );
}
