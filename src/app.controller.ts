import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get-rates-log.dto";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";
import {GetRateHistoryDto} from "./dto/get-rate-history.dto";
import {GetDailyBalancesDto} from "./dto/get-daily-balances.dto";
import {DailyBalanceService} from "./daily-balance.service";
import {SyncDailyBalancesDto} from "./dto/sync-daily-balances.dto";
import {Queue} from "bull";
import {InjectQueue} from "@nestjs/bull";
import {GetBalanceMutationsDto} from "./dto/get-balance-mutations.dto";
import {BalanceMutationsService} from "./balance-mutations.service";

@Controller()
export class AppController {
  constructor(
    private readonly ratesService: RatesService,
    private readonly rateHistoryService: RateHistoryService,
    private readonly dailyBalanceService: DailyBalanceService,
    private readonly balanceMutationsService: BalanceMutationsService,
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

  @Get('dailyBalances')
  getDailyBalances(@Query() dto: GetDailyBalancesDto) {
    return this.dailyBalanceService.getPagedItems(dto);
  }

  @Get('balanceMutations')
  getBalanceMutations(@Query() dto: GetBalanceMutationsDto) {
    return this.balanceMutationsService.getPagedItems(dto);
  }

  @Get('syncDailyBalances')
  async syncDailyBalances(@Query() dto: SyncDailyBalancesDto) {
    await this.jobQueue.add('syncDailyBalances', dto);
    return {};
  }
}
