import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createBooking, getMeetingType, listSlots, type Booking } from '../api';
import { renderAt } from '../test/render';

vi.mock('../api', () => ({ getMeetingType: vi.fn(), listSlots: vi.fn(), createBooking: vi.fn() }));
const first = { startAt: '2026-11-03T10:00:00Z', endAt: '2026-11-03T10:30:00Z' };
const later = { startAt: '2026-11-03T11:00:00Z', endAt: '2026-11-03T11:30:00Z' };
const tomorrow = { startAt: '2026-11-04T11:00:00Z', endAt: '2026-11-04T11:30:00Z' };
const booked = {
  ...first,
  guestName: 'Анна',
  guestEmail: 'a@example.com',
  id: 'booking',
  meetingTypeId: 'intro',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-03T08:00:00Z'));
  vi.mocked(getMeetingType).mockResolvedValue({
    id: 'intro',
    title: 'Знакомство',
    description: '',
    durationMinutes: 30,
  });
  vi.mocked(listSlots).mockResolvedValueOnce([first, later, tomorrow]);
});
afterEach(() => vi.useRealTimers());

async function fillForm() {
  const { user } = renderAt('/book/intro');
  await user.click(await screen.findByRole('button', { name: /, 3 ноября/ }));
  await user.click(screen.getByRole('button', { name: '13:00' }));
  await user.type(screen.getByLabelText('Имя'), booked.guestName);
  await user.type(screen.getByLabelText('Email'), booked.guestEmail);
  return user;
}

it('блокирует повторную отправку и показывает подтверждение', async () => {
  let resolve!: (value: { data: Booking }) => void;
  const pending = new Promise<{ data: Booking }>((done) => {
    resolve = done;
  });
  vi.mocked(createBooking).mockReturnValue(pending);
  const user = await fillForm();
  const submit = screen.getByRole('button', { name: 'Забронировать' });
  await user.click(submit);
  expect(submit).toBeDisabled();
  await user.click(submit);
  expect(createBooking).toHaveBeenCalledTimes(1);
  expect(createBooking).toHaveBeenCalledWith({
    meetingTypeId: 'intro',
    startAt: first.startAt,
    guestName: booked.guestName,
    guestEmail: booked.guestEmail,
  });
  await act(async () => resolve({ data: booked }));
  expect(screen.getByRole('heading', { name: 'Бронирование подтверждено' })).toBeInTheDocument();
  for (const value of ['Знакомство', 'Анна', 'a@example.com', '30 мин'])
    expect(screen.getByText(value)).toBeInTheDocument();
  expect(screen.getByText(/3 ноября.*13:00/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Записаться ещё' })).toHaveAttribute('href', '/book');
});

it.each([
  ['conflict', 'Это время уже занято. Выберите другое.'],
  ['slot_unavailable', 'Это время больше недоступно. Выберите другое.'],
] as const)('после %s сохраняет контакты и оставляет день открытым', async (code, message) => {
  vi.mocked(createBooking).mockResolvedValue({ error: { code, message: 'diagnostic' } });
  vi.mocked(listSlots).mockResolvedValueOnce([later]);
  const user = await fillForm();
  await user.click(screen.getByRole('button', { name: 'Забронировать' }));
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByLabelText('Имя')).toBeNull();
  expect(screen.queryByRole('button', { name: '13:00' })).toBeNull();
  await user.click(screen.getByRole('button', { name: '14:00', pressed: false }));
  expect(screen.getByLabelText('Имя')).toHaveValue('Анна');
  expect(screen.getByLabelText('Email')).toHaveValue('a@example.com');
});

it('ошибка обновления допускает повтор, опустевший день закрывается', async () => {
  vi.mocked(createBooking).mockResolvedValue({ error: { code: 'conflict', message: '' } });
  vi.mocked(listSlots)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([tomorrow]);
  const user = await fillForm();
  await user.click(screen.getByRole('button', { name: 'Забронировать' }));
  expect(await screen.findByText('Не удалось обновить свободное время')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Обновить' }));
  expect(await screen.findByRole('button', { name: /, 3 ноября/, pressed: false })).toBeDisabled();
  expect(screen.queryByRole('group', { name: 'Время начала' })).toBeNull();
  await user.click(screen.getByRole('button', { name: /, 4 ноября/ }));
  await user.click(screen.getByRole('button', { name: '14:00' }));
  expect(screen.getByLabelText('Email')).toHaveValue('a@example.com');
});

it('после конфликта объясняет пустое окно', async () => {
  vi.mocked(createBooking).mockResolvedValue({ error: { code: 'conflict', message: '' } });
  vi.mocked(listSlots).mockResolvedValueOnce([]);
  const user = await fillForm();
  await user.click(screen.getByRole('button', { name: 'Забронировать' }));
  expect(
    await screen.findByText('На ближайшие 14 дней нет свободного времени'),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'К каталогу' })).toHaveAttribute('href', '/book');
});

it('возвращает в каталог при исчезновении типа', async () => {
  vi.mocked(createBooking).mockResolvedValue({
    error: { code: 'meeting_type_not_found', message: '' },
  });
  const user = await fillForm();
  await user.click(screen.getByRole('button', { name: 'Забронировать' }));
  expect(await screen.findByText('Этот тип встречи больше недоступен.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'К каталогу' })).toHaveAttribute('href', '/book');
});

it('связывает подсказки сервера с полями формы', async () => {
  vi.mocked(createBooking).mockResolvedValue({
    error: {
      code: 'validation_error',
      message: '',
      fields: [
        { field: 'guestEmail', message: 'Исправьте email' },
        { field: 'guestName', message: 'Введите имя' },
      ],
    },
  });
  const user = await fillForm();
  await user.click(screen.getByRole('button', { name: 'Забронировать' }));
  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Исправьте email');
  expect(screen.getByLabelText('Имя')).toHaveAccessibleDescription('Введите имя');
});
