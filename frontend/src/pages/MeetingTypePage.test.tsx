import { screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { getMeetingType, listSlots } from '../api';
import { renderAt } from '../test/render';

vi.mock('../api', () => ({ getMeetingType: vi.fn(), listSlots: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-02T22:00:00Z'));
  vi.mocked(getMeetingType).mockResolvedValue({
    id: 'intro',
    title: 'Знакомство',
    description: 'Первая встреча',
    durationMinutes: 30,
  });
});
afterEach(() => vi.useRealTimers());

it('группирует слоты по московским дням и показывает 14 дней от московского сегодня', async () => {
  vi.mocked(listSlots).mockResolvedValue([
    { startAt: '2026-11-03T21:15:00Z', endAt: '2026-11-03T21:45:00Z' },
  ]);
  const { user } = renderAt('/book/intro');

  expect(await screen.findByText('Первая встреча')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Знакомство' })).toBeInTheDocument();
  expect(screen.getByText('30 мин')).toBeInTheDocument();
  expect(getMeetingType).toHaveBeenCalledWith('intro');
  expect(listSlots).toHaveBeenCalledWith('intro');
  expect(screen.getAllByRole('button')).toHaveLength(14);
  expect(screen.getByRole('button', { name: /, 3 ноября/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /16 ноября/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /, 4 ноября/ }));
  await user.click(screen.getByRole('button', { name: '00:15' }));
  expect(screen.getByRole('button', { name: '00:15', pressed: true })).toBeInTheDocument();
  expect(screen.getByText('Время московское (UTC+3)')).toBeInTheDocument();
});

it('объясняет пустое окно и возвращает в каталог', async () => {
  vi.mocked(listSlots).mockResolvedValue([]);
  renderAt('/book/intro');

  expect(
    await screen.findByText('На ближайшие 14 дней нет свободного времени'),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'К каталогу' })).toHaveAttribute('href', '/book');
});

it('объясняет недоступную ссылку', async () => {
  vi.mocked(getMeetingType).mockRejectedValue({ code: 'meeting_type_not_found' });
  vi.mocked(listSlots).mockResolvedValue([]);
  renderAt('/book/missing');

  expect(await screen.findByText('Этот тип встречи больше недоступен.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'К каталогу' })).toHaveAttribute('href', '/book');
});

it('повторяет неудавшуюся загрузку', async () => {
  vi.mocked(listSlots).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
  const { user } = renderAt('/book/intro');

  expect(await screen.findByText('Не удалось обновить свободное время')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Обновить' }));
  expect(
    await screen.findByText('На ближайшие 14 дней нет свободного времени'),
  ).toBeInTheDocument();
});
