import {InjectQueue, Process, Processor} from '@nestjs/bull';
import {Job, Queue} from "bull";
import {SyncDailyBalancesDto} from "./dto/sync-daily-balances.dto";
import {MyLoggerService} from "../my-logger.service";
import {DailyBalanceService} from "./daily-balance.service";

@Processor('JobQueue')
export class BalanceProcessor {
  private readonly logger = new MyLoggerService(BalanceProcessor.name);

  constructor(
    private readonly dailyBalanceService: DailyBalanceService,
    @InjectQueue('JobQueue')
    private readonly queue: Queue,
  ) {}

  @Process('syncDailyBalances')
  async syncDailyBalances(job: Job<SyncDailyBalancesDto>) {
    return this.dailyBalanceService.syncDailyBalances({accountId: job.data.accountId, toDate: new Date(job.data.toDate)});
  }
}