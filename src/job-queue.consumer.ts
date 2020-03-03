import {InjectQueue, Process, Processor} from '@nestjs/bull';
import {Job, Queue} from "bull";
import {SyncDailyBalancesDto} from "./dto/sync-daily-balances.dto";
import {BalanceMutationExtractorService, ExtractBalanceMutationMode} from "./balance-mutation-extractor.service";
import {DailyBalanceExtractorService} from "./daily-balance-extractor.service";
import {MyLoggerService} from "./my-logger.service";

@Processor('JobQueue')
export class JobQueueConsumer {
  private readonly logger = new MyLoggerService(JobQueueConsumer.name);

  constructor(
    private readonly balanceMutationExtractorService: BalanceMutationExtractorService,
    private readonly dailyBalanceExtractorService: DailyBalanceExtractorService,
    @InjectQueue('JobQueue')
    private readonly jobQueue: Queue,
  ) {}

  @Process()
  async syncDailyBalances(job: Job<SyncDailyBalancesDto>) {
    return new Promise(async (resolve, reject) => {
      const balanceMutationJob = await this.jobQueue.add('extractBalanceMutations', job.data);
      this.jobQueue
        .on("completed", async (job, result) => {
          if (balanceMutationJob.id === job.id) {
            job.remove();
            const dailyBalanceJob = await this.jobQueue.add('extractDailyBalance', job.data);
            this.jobQueue
              .on("completed", async (job, result) => {
                if (dailyBalanceJob.id === job.id) {
                  job.remove();
                  resolve();
                }
              })
              .on("error", async (error) => {
                this.logger.error(error);
                await dailyBalanceJob.remove();
                reject(error);
              })
              .on("failed", async (job, error) => {
                if (balanceMutationJob.id === job.id) {
                  this.logger.error(error);
                  job.remove();
                  reject(error);
                }
              });
          }
        })
        .on("error", async (error) => {
          this.logger.error(error);
          await balanceMutationJob.remove();
          reject(error);
        })
        .on("failed", async (job, error) => {
          if (balanceMutationJob.id === job.id) {
            this.logger.error(error);
            job.remove();
            reject(error);
          }
        });
    });
  }

  @Process()
  async extractBalanceMutations(job: Job<SyncDailyBalancesDto>) {
    await this.balanceMutationExtractorService.extract({
      fromDate: job.data.toDate,
      mode: ExtractBalanceMutationMode.LAST_FROM_DATE,
      accountId: job.data.accountId,
    });
    return {}
  }

  @Process()
  async extractDailyBalances(job: Job<SyncDailyBalancesDto>) {
    await this.balanceMutationExtractorService.extract({
      fromDate: job.data.toDate,
      mode: ExtractBalanceMutationMode.LAST_FROM_DATE,
      accountId: job.data.accountId,
    });
    return {}
  }
}