import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import App from '../App';

/** Render the whole app as if the browser opened `path`; returns a user-event session too. */
export function renderAt(path: string) {
  const user = userEvent.setup();
  const view = render(
    <MantineProvider env="test">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  );
  return { user, ...view };
}
