import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits', () => {
  test('Login page should not have any automatically detectable accessibility issues', async ({ page }) => {
    // Navigate to the page to be tested
    await page.goto('/#/login');

    // Initialize the Axe accessibility builder
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // Scan for WCAG 2.0 and 2.1 A and AA issues
      .analyze(); 

    // Expect the analysis to have no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // You can add more tests for other pages
  test('Home page should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/#/'); 

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
