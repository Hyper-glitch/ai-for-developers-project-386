import { Badge, Button, Group, List, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import { paths } from '../paths';

const steps = [
  'Выберите тип встречи.',
  'Выберите свободный слот в ближайшие 14 дней.',
  'Оставьте имя и email — бронирование готово.',
];

function BookButton() {
  return (
    <Button component={Link} to={paths.catalog} size="md" w="fit-content">
      Записаться
    </Button>
  );
}

export function HomePage() {
  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <Title order={1}>Запись на звонок</Title>
        <Text size="lg" c="dimmed">
          Выберите удобное время для звонка — без регистрации и переписки
        </Text>
        <BookButton />
      </Stack>

      <Stack gap="sm">
        <Title order={2} id="how-it-works">
          Как это работает
        </Title>
        <List type="ordered" aria-labelledby="how-it-works" spacing="xs">
          {steps.map((step) => (
            <List.Item key={step}>{step}</List.Item>
          ))}
        </List>
      </Stack>

      <Group gap="xs">
        <Badge variant="light">Регистрация не нужна</Badge>
        <Badge variant="light">Запись на 14 дней вперёд</Badge>
      </Group>

      <BookButton />
    </Stack>
  );
}
