import {IsDate, IsOptional} from 'class-validator';
import {Transform} from "class-transformer";
import {EntitiesOrder, GetEntitiesInputInterface} from "../app.interfaces";

export class GetRatesLogDto implements GetEntitiesInputInterface {
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
}
