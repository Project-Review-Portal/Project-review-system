import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Project Review/i);
});

test('backend API is reachable', async ({ request }) => {
  const res = await request.get('http://localhost:3626/api/health');
  expect(res.ok()).toBeTruthy();
});