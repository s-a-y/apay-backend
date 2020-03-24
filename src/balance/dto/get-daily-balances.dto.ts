import {IsDate, IsNotEmpty, IsOptional, ValidateNested} from 'class-validator';
import {Transform, Type} from "class-transformer";
import {EntitiesOrder, GetEntitiesInputInterface} from "../../app.interfaces";
import {AssetDto} from "../../dto/asset.dto";

export class GetDailyBalancesDto implements GetEntitiesInputInterface {
  @IsOptional()
  id: string;

  @IsOptional()
  cursor: string;

  @IsNotEmpty()
  accountId: string;

  @ValidateNested()
  @Type(() => AssetDto)
  asset: AssetDto;

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
