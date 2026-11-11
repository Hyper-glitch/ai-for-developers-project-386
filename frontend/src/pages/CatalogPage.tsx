import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import { paths } from '../paths';

/** Placeholder until booking is implemented: no fake meeting types on purpose. */
export function CatalogPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Каталог типов встреч</Title>
      <Text>Здесь появятся типы встреч, на которые можно записаться.</Text>
      <Anchor component={Link} to={paths.home}>
        На главную
      </Anchor>
    </Stack>
  );
}
