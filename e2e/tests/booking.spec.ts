import { expect, test } from '@playwright/test';

test('владелец видит встречу, которую гость забронировал в каталоге', async ({ page }) => {
  const title = 'Знакомство';
  await page.goto('/');
  await page.getByRole('link', { name: 'Владельцу' }).click();
  await expect(page).toHaveURL(/\/owner\/bookings$/);
  await expect(page.getByText('Бронирований пока нет')).toBeVisible();
  await page.getByRole('link', { name: 'Типы встреч' }).click();
  await page.getByLabel('Название').fill(title);
  await page.getByLabel('Описание').fill('Первая встреча');
  await page.getByLabel('Длительность').selectOption('30');
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByText('Тип встречи создан')).toBeVisible();

  await page.getByRole('link', { name: 'Запись на звонок' }).click();
  await page.getByRole('link', { name: 'Записаться', exact: true }).first().click();
  await page.getByRole('link', { name: title }).click();
  const days = page.getByRole('group', { name: 'Дни для записи' });
  const slot = page.getByRole('group', { name: 'Время начала' }).getByRole('button').first();
  async function selectFirstSlot() {
    await days.getByRole('button', { disabled: false }).first().click();
    const start = await slot.innerText();
    await slot.click();
    return start;
  }
  let time = await selectFirstSlot();
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Email').fill('anna@example.com');
  await page.getByRole('button', { name: 'Забронировать' }).click();
  const confirmed = page.getByRole('heading', { name: 'Бронирование подтверждено' });
  const expired = page.getByText('Это время больше недоступно. Выберите другое.', { exact: true });
  await expect(confirmed.or(expired)).toBeVisible();
  if (await expired.isVisible()) {
    time = await selectFirstSlot();
    await expect(page.getByLabel('Имя')).toHaveValue('Анна');
    await expect(page.getByLabel('Email')).toHaveValue('anna@example.com');
    await page.getByRole('button', { name: 'Забронировать' }).click();
  }
  await expect(confirmed).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const dateAndTime = await page.getByText(time, { exact: false }).innerText();
  await expect(page.getByText('anna@example.com')).toBeVisible();

  await page.getByRole('link', { name: 'Владельцу' }).click();
  const booking = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: title }) });
  await expect(booking.getByText(dateAndTime, { exact: true })).toBeVisible();
  await expect(booking.getByText('Анна', { exact: true })).toBeVisible();
  await expect(booking.getByText('anna@example.com')).toBeVisible();
});
