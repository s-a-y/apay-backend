import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsNumberString, IsOptional } from 'class-validator';
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
  @IsNotEmpty()
  @IsIn(['in', 'out'])
  userInput: string;
  @IsNotEmpty()
  @IsNumberString()
  amountIn: string;
  @IsNotEmpty()
  @IsNumberString()
  amountOut: string;
  @IsOptional()
  account?: string;
  @IsOptional()
  ref?: string;
}
