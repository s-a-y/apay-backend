import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get_rates_log.dto";
import {RatesService} from "./rates.service";

@Controller()
export class AppController {
  constructor(
    private readonly ratesService: RatesService
  ) {}

  @Get('rates')
  getRates(@Query() dto: GetRatesLogDto) {
    console.log(JSON.stringify(dto, null, 2));
    return this.ratesService.getPagedItems(dto);
  }
}
