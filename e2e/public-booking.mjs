import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/e2e/package.json');
const { chromium, expect } = require('@playwright/test');
const baseURL = new URL(process.argv[2]).origin;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ baseURL });
  const title = 'Проверка записи ' + Date.now();
  await page.goto('/owner/meeting-types');
  await page.getByLabel('Название').fill(title);
  await page.getByLabel('Описание').fill('Проверка календаря');
  await page.getByLabel('Длительность').selectOption('30');
  await page.getByRole('button', {name: 'Создать'}).click();
  await expect(page.getByText('Тип встречи создан')).toBeVisible();
  await page.goto('/book');
  await page.getByRole('link', {name: title, exact: true}).click();
  await page.getByRole('group', {name:'Дни для записи'}).getByRole('button',{disabled:false}).last().click();
  await page.getByRole('group', {name:'Время начала'}).getByRole('button').first().click();
  await page.getByLabel('Имя').fill('Тестовый гость');
  await page.getByLabel('Email').fill('guest@example.com');
  const booked = page.waitForResponse(r => new URL(r.url()).pathname === '/bookings' && r.request().method() === 'POST');
  await page.getByRole('button', {name:'Забронировать'}).click();
  const response = await booked;
  assert.equal(response.status(), 201);
  const booking = await response.json();
  await expect(page.getByRole('heading', {name:'Бронирование подтверждено'})).toBeVisible();
  await page.goto('/owner/bookings');
  const item = page.getByRole('article').filter({has:page.getByRole('heading', {name:title})});
  await expect(item.getByText('guest@example.com')).toBeVisible();
  const payload = response.request().postDataJSON();
  for (const offset of [0, 15]) {
    const startAt = new Date(Date.parse(payload.startAt) + offset * 60000).toISOString();
    const duplicate = await page.request.post('/bookings', {data:{...payload, startAt}});
    assert.equal(duplicate.status(), 409);
    assert.equal((await duplicate.json()).code, 'conflict');
  }
  const list = await (await page.request.get('/bookings')).json();
  assert.equal(list.filter(b => b.meetingTypeId === booking.meetingTypeId).length, 1);
  console.log('201 Created, visible to owner, duplicate and 15-minute overlap both returned 409');
} finally {
  await browser.close();
}
