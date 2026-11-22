import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/e2e/package.json');
const {chromium,expect}=require('@playwright/test');
const baseURL=process.argv[2];
const browser=await chromium.launch();
try {
 const page=await browser.newPage({baseURL});
 const api=page.request;
 async function type(title,durationMinutes) {
  const r=await api.post('/meeting-types',{data:{title,description:'Проверка',durationMinutes}});
  assert.equal(r.status(),201);
  return (await r.json()).id;
 }
 const a=await type('Длинная встреча',60), b=await type('Короткая встреча',30);
 await page.goto('/book/'+b);
 await page.getByRole('group',{name:'Дни для записи'}).getByRole('button',{disabled:false}).first().click();
 const slots=page.getByRole('group',{name:'Время начала'}).getByRole('button');
 const time=await slots.nth(1).innerText();
 await slots.nth(1).click();
 await page.getByLabel('Имя').fill('Гость');
 await page.getByLabel('Email').fill('test@example.com');
 const times=await (await api.get('/meeting-types/'+b+'/slots')).json();
 const clock = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'});
 const start=times.find(t=>clock.format(new Date(t.startAt))===time.trim()).startAt;
 const earlier=new Date(Date.parse(start)-15*60000).toISOString();
 const post=(id,t)=>api.post('/bookings',{data:{meetingTypeId:id,startAt:t,guestName:'Гость',guestEmail:'other@example.com'}});
 assert.equal((await post(a,earlier)).status(),201);
 const failed=page.waitForResponse(r=>r.url().endsWith('/bookings')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Забронировать'}).click();
 assert.equal((await failed).status(),409);
 await expect(page.getByText('Это время уже занято. Выберите другое.',{exact:true})).toBeVisible();
 console.log('Cross-type partial overlap 60/30: HTTP 409 and visible conflict message');
} finally {await browser.close()}
