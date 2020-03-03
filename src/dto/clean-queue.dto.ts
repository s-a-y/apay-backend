import {IsEnum, IsNumber, IsOptional} from 'class-validator';
import {JobState} from "../app.enums";

export class CleanQueueDto {
  @IsOptional()
  @IsNumber()
  gracePeriod: number;

  @IsOptional()
  @IsNumber()
  limit: number;

  @IsOptional()
  @IsEnum(JobState)
  state: JobState;
}
