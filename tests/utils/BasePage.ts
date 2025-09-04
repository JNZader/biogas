import { type Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async expectToHaveUrl(url: string | RegExp) {
    await expect(this.page).toHaveURL(url);
  }
}
