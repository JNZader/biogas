import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
    await loginPage.goto();
  });

  test('should allow a user to log in with valid credentials', async () => {
    await loginPage.login('juan.perez@example.com', 'password');
    await homePage.expectToBeOnHomePage();
    const pageTitle = await homePage.getPageTitle();
    expect(pageTitle).toBe('Dashboard');
  });

  test('should show an error message with invalid credentials', async () => {
    await loginPage.login('invalid@user.com', 'wrongpassword');
    const errorToast = loginPage.page.getByText('Error de autenticación');
    await expect(errorToast).toBeVisible();
  });
});
