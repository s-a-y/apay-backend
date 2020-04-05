import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get-rates-log.dto";
import {RatesService} from "./rates.service";
import {MyLoggerService} from "../my-logger.service";
import {EntitiesOrder} from "../app.interfaces";

@Controller()
export class RatesController {
  private readonly logger = new MyLoggerService(RatesController.name);
  constructor(
    private readonly ratesService: RatesService,
  ) {}

  @Get('rates')
  getRates(@Query() dto: GetRatesLogDto) {
    if (!dto.order) {
      dto.order = { field: 'at', order: 'ASC' } as unknown as EntitiesOrder;
    }

    return this.ratesService.getPagedItems(dto);
  }
}
