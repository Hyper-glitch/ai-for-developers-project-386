import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderAt } from './test/render';

function expectHomePage() {
  expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeInTheDocument();
}

describe('Главная страница', () => {
  it('объясняет сервис и показывает, как записаться', () => {
    renderAt('/');

    expectHomePage();

    const steps = within(screen.getByRole('list', { name: 'Как это работает' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((step) => step.textContent)).toEqual([
      'Выберите тип встречи.',
      'Выберите свободный слот в ближайшие 14 дней.',
      'Оставьте имя и email — бронирование готово.',
    ]);

    expect(screen.getByText('Регистрация не нужна')).toBeInTheDocument();
    expect(screen.getByText('Запись на 14 дней вперёд')).toBeInTheDocument();
  });
});

describe('Переход в каталог типов встреч', () => {
  it.each([
    { where: 'в первом экране', index: 0 },
    { where: 'внизу страницы', index: 1 },
  ])('кнопка «Записаться» $where открывает каталог', async ({ index }) => {
    const { user } = renderAt('/');

    const buttons = screen.getAllByRole('link', { name: 'Записаться' });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[index]);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Каталог типов встреч' }),
    ).toBeInTheDocument();
  });
});

describe('Каталог типов встреч', () => {
  it('ссылка «На главную» возвращает на главную страницу', async () => {
    const { user } = renderAt('/book');

    await user.click(screen.getByRole('link', { name: 'На главную' }));

    expectHomePage();
  });
});

describe('Неизвестный адрес', () => {
  it('показывает «Страница не найдена» со ссылкой на главную', async () => {
    const { user } = renderAt('/no-such-page');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Страница не найдена' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'На главную' }));

    expectHomePage();
  });
});
