import { IsEnum, IsNotEmpty } from 'class-validator';
import { SupportedCurrency } from '../app.enums';
import { Optional } from '@nestjs/common';

export class SwapDto {
  @IsNotEmpty()
  addressOut: string;
  @Optional()
  addressOutExtra?: string;
  @IsNotEmpty()
  @IsEnum(SupportedCurrency)
  currencyIn: SupportedCurrency;
  @IsNotEmpty()
  @IsEnum(SupportedCurrency)
  currencyOut: SupportedCurrency;
}
