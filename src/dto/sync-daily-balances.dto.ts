import {IsDate, IsNotEmpty} from 'class-validator';
import {Transform} from "class-transformer";

export class SyncDailyBalancesDto {
  @IsNotEmpty()
  accountId: string;

  @IsDate()
  @Transform(value => new Date(value))
  toDate: Date;
}
