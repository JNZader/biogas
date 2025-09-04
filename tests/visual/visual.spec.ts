import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Visual Regression Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Mock API responses to ensure consistent data for screenshots
    await page.route('**/rest/v1/energia**', route => route.fulfill({
      status: 200,
      body: JSON.stringify([
        { fecha: '2023-10-27', flujo_biogas_kg_dia: 8500, generacion_electrica_total_kwh_dia: 12500 },
        { fecha: '2023-10-28', flujo_biogas_kg_dia: 8700, generacion_electrica_total_kwh_dia: 12800 },
      ])
    }));
     await page.route('**/rest/v1/analisis_fos_tac**', route => route.fulfill({ status: 200, body: '[]' }));
     await page.route('**/rest/v1/lecturas_gas**', route => route.fulfill({ status: 200, body: '[]' }));
     await page.route('**/rest/v1/detalle_ingreso_sustrato**', route => route.fulfill({ status: 200, body: '[]' }));

    // Log in to access protected pages
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('juan.perez@example.com', 'password');
    await page.waitForURL('**/#/', { timeout: 10000 });
  });

  test('Dashboard page should match the baseline snapshot', async ({ page }) => {
    await page.goto('/#/');
    // Wait for chart animations to finish
    await page.waitForTimeout(1000); 
    
    await expect(page).toHaveScreenshot('dashboard-page.png', {
        fullPage: true,
        maxDiffPixels: 100 // Allow for minor rendering differences
    });
  });

  test('Graphs page should match the baseline snapshot', async ({ page }) => {
    await page.goto('/#/graphs');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('graphs-page.png', {
        fullPage: true,
        maxDiffPixels: 100
    });
  });
});
