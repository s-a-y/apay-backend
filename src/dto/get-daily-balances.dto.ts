import {IsDate, IsOptional} from 'class-validator';
import {Transform} from "class-transformer";
import {Asset, EntitiesOrder, GetEntitiesInputInterface} from "../app.interfaces";

export class GetDailyBalancesDto implements GetEntitiesInputInterface {
  @IsOptional()
  id: string;

  @IsOptional()
  cursor: string;

  asset: Asset;

  @IsOptional()
  order: EntitiesOrder;

  @IsOptional()
  @Transform(value => new Date(value))
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  fromCreatedAt: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  toCreatedAt: Date;

  @IsOptional()
  @Transform(value => new Date(value))
  @IsDate()
  date: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  fromDate: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  toDate: Date;
}
