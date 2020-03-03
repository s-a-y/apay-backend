import {InjectQueue, Process, Processor} from '@nestjs/bull';
import {Job, Queue} from "bull";
import {SyncDailyBalancesDto} from "./dto/sync-daily-balances.dto";
import {BalanceMutationExtractorService, ExtractBalanceMutationMode} from "./balance-mutation-extractor.service";
import {DailyBalanceExtractorService} from "./daily-balance-extractor.service";
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
    this.logger.log('syncDailyBalances(): started');
    return new Promise(async (resolve, reject) => {
      this.logger.log('syncDailyBalances(): extractBalanceMutations job added');
      const balanceMutationJob = await this.queue.add('extractBalanceMutations', job.data);
      this.queue
        .on("completed", async (job, result) => {
          if (balanceMutationJob.id === job.id) {
            this.logger.log('syncDailyBalances(): extractBalanceMutations completed');
            job.remove();
            const dailyBalanceJob = await this.queue.add('extractDailyBalance', job.data);
            this.logger.log('syncDailyBalances(): extractDailyBalance job added');
            this.queue
              .on("completed", async (job, result) => {
                if (dailyBalanceJob.id === job.id) {
                  this.logger.log('syncDailyBalances(): extractDailyBalance completed');
                  job.remove();
                  resolve();
                }
              })
              .on("error", async (error) => {
                this.logger.error(error);
                await dailyBalanceJob.remove();
                this.logger.log('syncDailyBalances(): extractDailyBalance got error');
                reject(error);
              })
              .on("failed", async (job, error) => {
                if (balanceMutationJob.id === job.id) {
                  this.logger.error(error);
                  job.remove();
                  this.logger.log('syncDailyBalances(): extractDailyBalance failed');
                  reject(error);
                }
              });
          }
        })
        .on("error", async (error) => {
          this.logger.error(error);
          await balanceMutationJob.remove();
          this.logger.log('syncDailyBalances(): extractBalanceMutations got error');
          reject(error);
        })
        .on("failed", async (job, error) => {
          if (balanceMutationJob.id === job.id) {
            this.logger.error(error);
            job.remove();
            this.logger.log('syncDailyBalances(): extractBalanceMutations failed');
            reject(error);
          }
        });
    });
  }

  @Process('extractBalanceMutations')
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