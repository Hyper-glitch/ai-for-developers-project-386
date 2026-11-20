import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { listMeetingTypes } from '../api';
import { renderAt } from '../test/render';

vi.mock('../api', () => ({ listMeetingTypes: vi.fn() }));

it('показывает пустой каталог после загрузки', async () => {
  vi.mocked(listMeetingTypes).mockResolvedValue([]);
  renderAt('/book');
  expect(await screen.findByText('Типов встреч пока нет')).toBeInTheDocument();
});

it('показывает название, описание и длительность каждого типа', async () => {
  vi.mocked(listMeetingTypes).mockResolvedValue([
    {
      id: 'c6179d3d-7a87-4b59-b443-e34dd15cc18b',
      title: 'Знакомство',
      description: 'Обсудим задачу',
      durationMinutes: 15,
    },
    {
      id: '8934bb3d-aba6-494d-a6b2-27dac0361955',
      title: 'Разбор',
      description: 'Проверим решение',
      durationMinutes: 45,
    },
  ]);
  renderAt('/book');
  expect(await screen.findByRole('link', { name: 'Знакомство' })).toHaveAttribute(
    'href',
    '/book/c6179d3d-7a87-4b59-b443-e34dd15cc18b',
  );
  expect(screen.getByText('Обсудим задачу')).toBeInTheDocument();
  expect(screen.getByText('15 мин')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Разбор' })).toHaveAttribute(
    'href',
    '/book/8934bb3d-aba6-494d-a6b2-27dac0361955',
  );
  expect(screen.getByText('Проверим решение')).toBeInTheDocument();
  expect(screen.getByText('45 мин')).toBeInTheDocument();
});
