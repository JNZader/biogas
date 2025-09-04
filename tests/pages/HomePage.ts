import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../utils/BasePage';

export class HomePage extends BasePage {
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page, '/#/');
    this.pageTitle = page.getByTestId('page-title');
  }

  async expectToBeOnHomePage() {
    await expect(this.page).toHaveURL(this.url);
    await expect(this.pageTitle).toBeVisible();
  }

  async getPageTitle(): Promise<string> {
    return await this.pageTitle.innerText();
  }
}
