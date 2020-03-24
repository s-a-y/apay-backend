import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get-rates-log.dto";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";
import {GetRateHistoryDto} from "./dto/get-rate-history.dto";
import {Queue} from "bull";
import {InjectQueue} from "@nestjs/bull";
import {MyLoggerService} from "./my-logger.service";

@Controller()
export class AppController {
  private readonly logger = new MyLoggerService(AppController.name);
  constructor(
    private readonly ratesService: RatesService,
    private readonly rateHistoryService: RateHistoryService,
    @InjectQueue('JobQueue')
    private readonly jobQueue: Queue,
  ) {}

  @Get('rates')
  getRates(@Query() dto: GetRatesLogDto) {
    return this.ratesService.getPagedItems(dto);
  }

  @Get('rateHistory')
  getRateHistory(@Query() dto: GetRateHistoryDto) {
    return this.rateHistoryService.getPagedItems(dto);
  }
}
