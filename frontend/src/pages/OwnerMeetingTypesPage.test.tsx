import { screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { createMeetingType, listMeetingTypes } from '../api';
import { renderAt } from '../test/render';

vi.mock('../api', () => ({ listMeetingTypes: vi.fn(), createMeetingType: vi.fn() }));

beforeEach(() => {
  vi.mocked(listMeetingTypes).mockResolvedValue([]);
});

it('показывает пустой список владельца', async () => {
  renderAt('/owner/meeting-types');
  expect(await screen.findByText('Типов встреч пока нет')).toBeInTheDocument();
});

it('создаёт тип с выбранной длительностью и очищает форму', async () => {
  const input = { title: 'Разбор', description: 'Проверим задачу', durationMinutes: 45 } as const;
  vi.mocked(createMeetingType).mockResolvedValue({
    data: { ...input, id: '74598d67-e960-4915-81b8-ffe67b520121' },
  });
  const { user } = renderAt('/owner/meeting-types');
  await screen.findByText('Типов встреч пока нет');
  const title = screen.getByLabelText('Название');
  const description = screen.getByLabelText('Описание');
  const duration = screen.getByLabelText('Длительность');
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    '15 мин',
    '30 мин',
    '45 мин',
    '60 мин',
    '75 мин',
    '90 мин',
    '105 мин',
    '120 мин',
  ]);
  await user.type(title, input.title);
  await user.type(description, input.description);
  await user.selectOptions(duration, '45');
  await user.click(screen.getByRole('button', { name: 'Создать' }));
  expect(createMeetingType).toHaveBeenCalledWith(input);
  expect(await screen.findByRole('heading', { name: 'Разбор' })).toBeInTheDocument();
  expect(screen.getByText('Тип встречи создан')).toBeInTheDocument();
  expect(title).toHaveValue('');
  expect(description).toHaveValue('');
  expect(duration).toHaveValue('15');
});

it('показывает ошибки API возле соответствующих полей', async () => {
  vi.mocked(createMeetingType).mockResolvedValue({
    error: {
      code: 'validation_error',
      message: 'Invalid request',
      fields: [
        { field: 'title', message: 'Введите название' },
        { field: 'description', message: 'Сократите описание' },
        { field: 'durationMinutes', message: 'Выберите длительность' },
      ],
    },
  });
  const { user } = renderAt('/owner/meeting-types');
  await user.click(await screen.findByRole('button', { name: 'Создать' }));
  expect(screen.getByLabelText('Название')).toHaveAccessibleDescription('Введите название');
  expect(screen.getByLabelText('Описание')).toHaveAccessibleDescription('Сократите описание');
  expect(screen.getByLabelText('Длительность')).toHaveAccessibleDescription(
    'Выберите длительность',
  );
});
