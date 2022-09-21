import puppeteer from 'puppeteer';
import { Logger } from '@nestjs/common';
import cheerio from 'cheerio';

export class FacebookUtil {
  logger = new Logger(FacebookUtil.name);
  async login() {
    try {
      this.logger.debug('login -- start');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--allow-third-party-modules',
          '--start-maximized',
        ],
      });

      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      await page.goto('https://www.facebook.com', {
        waitUntil: 'networkidle2',
      });
      await page.setDefaultNavigationTimeout(0);
      await page.waitForSelector('#email');
      await page.focus('#email');
      await page.type('#email', '', { delay: 0 });
      await page.waitForSelector('#pass');
      await page.focus('#pass');
      await page.type('#pass', '', { delay: 0 });
      await page.click(`[type="submit"]`);
      await page.waitForNavigation();
      await page.waitForTimeout(5000);
      this.logger.debug('login -- success');
      return page;
    } catch (error) {
      this.logger.error('login -- error');
      throw error;
    }
  }

  async scrape(page: any) {
    try {
      this.logger.debug('scrape -- start');
      await page.setViewport({ width: 2560, height: 1440 });
      await page.goto(
        'https://www.facebook.com/marketplace/nyc/search/?query=cars',
      );
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (
          req.resourceType() === 'stylesheet' ||
          req.resourceType() === 'font' ||
          req.resourceType() === 'image'
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });
      await this.autoScroll(page);
      await page.setDefaultNavigationTimeout(0);
      const data = await this.getResult(await page.content());
      this.logger.debug('scrape -- success');
      return data;
    } catch (error) {
      this.logger.error('scrape -- error');
      throw error;
    }
  }

  async autoScroll(page: any) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(async () => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async getResult(html: any) {
    const data = [];
    const $ = cheerio.load(html.toString());
    const rows = $(
      'div > div > div > div > span > div > div > a[tabindex="0"]',
    );
    rows.each(function (index, element) {
      const result = $(element);
      const carDetails = result.text();
      const brandModelYear = $(this)
        .find(
          'div > div:nth-child(2) > div:nth-child(2) > span > div > span.gvxzyvdx.aeinzg81.t7p7dqev.gh25dzvf',
        )
        .text()
        .split(' ', 3);
      const brand = brandModelYear[1];
      const year = brandModelYear[0];
      const model = brandModelYear[2];
      const price = $(this)
        .find(
          'div > div:nth-child(2) > div:nth-child(1) > span > div > span.gvxzyvdx.aeinzg81.t7p7dqev.gh25dzvf',
        )
        .text();
      const region = $(this)
        .find(
          'div > div:nth-child(2) > div:nth-child(3) > span > div > span > span.b6ax4al1.lq84ybu9.hf30pyar.om3e55n1',
        )
        .text();
      const mile = $(this)
        .find(
          'div > div:nth-child(2) > div:nth-child(4) > div > span > span.b6ax4al1.lq84ybu9.hf30pyar.om3e55n1',
        )
        .text();
      const image = $(this).find('img').attr('src');
      const url = `https://www.facebook.com/` + $(this).attr('href');
      data.push({ brand, model, year, price, region, mile, image, url });
    });
    return data;
  }
}
