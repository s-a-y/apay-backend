import {IsDate, IsEnum, IsNotEmpty, IsOptional, ValidateNested} from 'class-validator';
import {Transform, Type} from "class-transformer";
import {EntitiesOrder, GetEntitiesInputInterface} from "../app.interfaces";
import {AssetDto} from "./asset.dto";
import {BalanceMutationType} from "../app.enums";

export class GetBalanceMutationsDto implements GetEntitiesInputInterface {
  @IsOptional()
  id: string;

  @IsOptional()
  cursor: string;

  @IsNotEmpty()
  accountId: string;

  @IsOptional()
  @IsEnum(BalanceMutationType)
  type: BalanceMutationType;

  @ValidateNested()
  @Type(() => AssetDto)
  asset: AssetDto;

  @IsOptional()
  order: EntitiesOrder;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  fromAt: Date;

  @IsOptional()
  @IsDate()
  @Transform(value => new Date(value))
  toAt: Date;
}
