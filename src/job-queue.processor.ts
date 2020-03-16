import {InjectQueue, Process, Processor} from '@nestjs/bull';
import {Job, Queue} from "bull";
import {SyncDailyBalancesDto} from "./dto/sync-daily-balances.dto";
import {BalanceMutationExtractorService, ExtractBalanceMutationMode} from "./balance-mutation-extractor.service";
import {DailyBalanceExtractorService, ExtractDailyBalanceMode} from "./daily-balance-extractor.service";
import {MyLoggerService} from "./my-logger.service";

@Processor('JobQueue')
export class JobQueueProcessor {
  private readonly logger = new MyLoggerService(JobQueueProcessor.name);

  constructor(
    private readonly balanceMutationExtractorService: BalanceMutationExtractorService,
    private readonly dailyBalanceExtractorService: DailyBalanceExtractorService,
    @InjectQueue('JobQueue')
    private readonly queue: Queue,
  ) {}

  @Process('syncDailyBalances')
  async syncDailyBalances(job: Job<SyncDailyBalancesDto>) {
    return this.balanceMutationExtractorService.extract({
      toDate: new Date(job.data.toDate),
      mode: ExtractBalanceMutationMode.FROM_TAIL,
      accountId: job.data.accountId,
    }).then(() => {
      return this.dailyBalanceExtractorService.extract({
        toDate: job.data.toDate,
        mode: ExtractDailyBalanceMode.FROM_TAIL,
        accountId: job.data.accountId,
      });
    });
  }
}