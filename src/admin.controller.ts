import {Controller, Get, Query} from "@nestjs/common";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {GetJobsDto} from "./dto/get-jobs.dto";
import {JobState} from "./app.enums";

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
