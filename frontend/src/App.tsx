import { Anchor, Box, Container } from '@mantine/core';
import { Link, Outlet, Route, Routes } from 'react-router';

import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { paths } from './paths';

function Layout() {
  return (
    <>
      <Box
        component="header"
        py="md"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <Container size="sm">
          <Anchor component={Link} to={paths.home} fw={700} underline="never">
            Запись на звонок
          </Anchor>
        </Container>
      </Box>
      <Container component="main" size="sm" py="xl">
        <Outlet />
      </Container>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path={paths.catalog} element={<CatalogPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
