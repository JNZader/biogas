import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InputsPage } from '../pages/InputsPage';

test.describe('Data Entry: Substrate Inputs', () => {
  let loginPage: LoginPage;
  let inputsPage: InputsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    inputsPage = new InputsPage(page);

    // Log in before each test
    await loginPage.goto();
    await loginPage.login('juan.perez@example.com', 'password');
    await page.waitForURL('**/#/', { timeout: 10000 });

    // Navigate to the inputs page
    await inputsPage.goto();
  });

  test('should allow a user to successfully register a new substrate entry', async ({ page }) => {
    // Fill out the form with mock data
    await inputsPage.fillForm({
        camion: 'AD 123 BC',
        remito: `R-${Date.now()}`,
        proveedor: 'Agropecuaria Don Tito',
        sustrato: 'Silaje de Maíz',
        cantidad: '15000',
        lugarDescarga: 'Playa de Descarga 1'
    });

    // Submit the form
    await inputsPage.submitForm();
    
    // Assert that the success toast appears
    const successToast = page.getByText('Ingreso registrado con éxito!');
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // Assert that the form has been reset (remito field should be empty)
    await expect(inputsPage.remitoInput).toBeEmpty();
  });
});
