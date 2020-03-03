import {Controller, Get, Query} from "@nestjs/common";
import {InjectQueue} from "@nestjs/bull";
import {JobStatusClean, Queue} from "bull";
import {GetJobsDto} from "./dto/get-jobs.dto";
import {JobOperation, JobState} from "./app.enums";
import {ModifyJobDto} from "./dto/modify-job.dto";
import {CleanQueueDto} from "./dto/clean-queue.dto";

@Controller('admin')
export class AdminController {
  constructor(
    @InjectQueue('JobQueue')
    private readonly queue: Queue,
  ) {}

  @Get('getJobCounts')
  async getJobCounts() {
    return this.queue.getJobCounts();
  }

  @Get('modifyJob')
  async modifyJob(@Query() dto: ModifyJobDto) {
    const job = await this.queue.getJob(dto.jobId);
    switch (dto.operation) {
      case JobOperation.discard:
        return job.discard();
      case JobOperation.promote:
        return job.promote();
      case JobOperation.remove:
        return job.remove();
      case JobOperation.retry:
        return job.retry();
      default:
        throw new Error('Bad operation');
    }
  }

  @Get('cleanQueue')
  async cleanQueue(@Query() dto: CleanQueueDto) {
    const map = {
      [JobState.completed]: 'completed',
      [JobState.waiting]: 'wait',
      [JobState.active]: 'active',
      [JobState.delayed]: 'delayed',
      [JobState.failed]: 'failed',
    };
    return this.queue.clean(
      dto.gracePeriod || 0,
      dto.state ? map[dto.state] as JobStatusClean : null,
      dto.limit
    );
  }

  @Get('getJobs')
  async getJobs(@Query() dto: GetJobsDto) {
    switch (dto.state) {
      case JobState.completed:
        return this.queue.getCompleted();
      case JobState.delayed:
        return this.queue.getDelayed();
      case JobState.failed:
        return this.queue.getFailed();
      case JobState.waiting:
        return this.queue.getWaiting();
      case JobState.active:
      default:
        return this.queue.getActive();
    }
  }
}
