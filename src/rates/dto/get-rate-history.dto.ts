import {IsDate, IsEnum, IsOptional} from 'class-validator';
import {Transform} from "class-transformer";
import {EntitiesOrder, GetEntitiesInputInterface} from "../../app.interfaces";
import {SupportedCurrency} from "../../app.enums";

export class GetRateHistoryDto implements GetEntitiesInputInterface {
  @IsOptional()
  @IsEnum(SupportedCurrency)
  baseCurrency?: SupportedCurrency;

  @IsOptional()
  id: string;

  @IsOptional()
  cursor: string;

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

  @IsEnum(SupportedCurrency)
  currency: string;

  @IsOptional()
  @Transform(value => new Date(value))
  @IsDate()
  at: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  fromAt: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  toAt: Date;
}
