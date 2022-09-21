import { Controller, Get, Res } from '@nestjs/common';
import { FacebookUtil } from '../utill/Facebook.util';
import { Logger } from '@nestjs/common';
import { Response } from 'express';
import { SearchService } from './search.service';

@Controller('/')
export class SearchController {
  private readonly logger: Logger = new Logger(SearchController.name);
  constructor(private readonly searchService: SearchService) {}
  fb = new FacebookUtil();
  @Get()
  async scrapeMarketplace(@Res() res: Response) {
    this.logger.debug('scrapeMarketplace --start');
    const page = await this.fb.login();
    const data = await this.fb.scrape(page);
    res.send(data);
    this.logger.debug('scrapeMarketplace --success');
  }
}
