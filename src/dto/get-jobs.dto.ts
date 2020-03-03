import {IsEnum, IsNotEmpty} from 'class-validator';
import {JobState} from "../app.enums";

export class GetJobsDto {
  @IsNotEmpty()
  @IsEnum(JobState)
  state: JobState;
}
