import {IsEnum, IsNotEmpty} from 'class-validator';
import {JobOperation} from "../app.enums";

export class ModifyJobDto {
  @IsNotEmpty()
  jobId: string;
  @IsNotEmpty()
  @IsEnum(JobOperation)
  operation: JobOperation;
}
