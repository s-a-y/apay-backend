import {Controller, Get, NotFoundException, Query} from '@nestjs/common';
import {GetDailyBalancesDto} from './dto/get-daily-balances.dto';
import {DailyBalanceService} from './daily-balance.service';
import {SyncDailyBalancesDto} from './dto/sync-daily-balances.dto';
import {Queue} from 'bull';
import {InjectQueue} from '@nestjs/bull';
import {GetBalanceMutationsDto} from './dto/get-balance-mutations.dto';
import {BalanceMutationsService} from './balance-mutations.service';
import {MyLoggerService} from '../my-logger.service';
import moment from 'moment';
import {EntitiesOrder} from "../app.interfaces";

@Controller()
export class BalanceController {
  private readonly logger = new MyLoggerService(DailyBalanceService.name);
  constructor(
    private readonly dailyBalanceService: DailyBalanceService,
    private readonly balanceMutationsService: BalanceMutationsService,
    @InjectQueue('JobQueue')
    private readonly jobQueue: Queue,
  ) {}

  @Get('dailyBalances')
  async getDailyBalances(@Query() dto: GetDailyBalancesDto) {
    const lastFetchedAt = await this.dailyBalanceService.getAccountLastFetchedAt(dto.accountId);

    if (!lastFetchedAt || moment(lastFetchedAt) < moment().subtract(30, "second")) {
      this.logger.log('Schedule queue "syncDailyBalances"');
      await this.scheduleJob({
          accountId: dto.accountId,
          toDate: moment().subtract(1, 'month').toDate()
        }).catch((error) => {
          this.logger.error(error);
        });
    }

    if (!lastFetchedAt) {
      throw new NotFoundException();
    }

    if (!dto.order) {
      dto.order = { field: 'date', order: 'ASC' } as unknown as EntitiesOrder;
    }
    return this.dailyBalanceService.getPagedItems(dto);
  }

  @Get('balanceMutations')
  getBalanceMutations(@Query() dto: GetBalanceMutationsDto) {
    return this.balanceMutationsService.getPagedItems(dto);
  }

  @Get('syncDailyBalances')
  async syncDailyBalances(@Query() dto: SyncDailyBalancesDto) {
    await this.scheduleJob(dto)
      .catch((error) => {
        this.logger.error(error);
      });
    return {};
  }

  private async scheduleJob(opts: any) {
    return this.jobQueue.add(
      'syncDailyBalances',
      opts,
      {
        attempts: 20,
        backoff: { type: 'exponential' },
      }
    );
  }
}
