import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get_rates_log.dto";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";
import {GetRateHistoryDto} from "./dto/get_rate_history.dto";

@Controller()
export class AppController {
  constructor(
    private readonly ratesService: RatesService,
    private readonly rateHistoryService: RateHistoryService,
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
