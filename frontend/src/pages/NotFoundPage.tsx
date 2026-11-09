import { Anchor, Stack, Title } from '@mantine/core';
import { Link } from 'react-router';

import { paths } from '../paths';

export function NotFoundPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Страница не найдена</Title>
      <Anchor component={Link} to={paths.home}>
        На главную
      </Anchor>
    </Stack>
  );
}
