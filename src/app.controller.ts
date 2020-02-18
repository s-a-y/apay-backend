import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get-rates-log.dto";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";
import {GetRateHistoryDto} from "./dto/get-rate-history.dto";
import {GetDailyBalancesDto} from "./dto/get-daily-balances.dto";
import {DailyBalanceService} from "./daily-balance.service";

@Controller()
export class AppController {
  constructor(
    private readonly ratesService: RatesService,
    private readonly rateHistoryService: RateHistoryService,
    private readonly dailyBalanceService: DailyBalanceService,
  ) {}

  @Get('rates')
  getRates(@Query() dto: GetRatesLogDto) {
    return this.ratesService.getPagedItems(dto);
  }

  @Get('rateHistory')
  getRateHistory(@Query() dto: GetRateHistoryDto) {
    return this.rateHistoryService.getPagedItems(dto);
  }

  @Get('dailyBalances')
  getDailyBalances(@Query() dto: GetDailyBalancesDto) {
    return this.dailyBalanceService.getPagedItems(dto);
  }
}
