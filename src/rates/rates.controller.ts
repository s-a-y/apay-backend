import {Controller, Get, Query} from '@nestjs/common';
import {GetRatesLogDto} from "./dto/get-rates-log.dto";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";
import {GetRateHistoryDto} from "./dto/get-rate-history.dto";
import {MyLoggerService} from "../my-logger.service";
import {SupportedCurrency} from "../app.enums";
import {EntitiesOrder} from "../app.interfaces";

@Controller()
export class RatesController {
  private readonly logger = new MyLoggerService(RatesController.name);
  constructor(
    private readonly ratesService: RatesService,
    private readonly rateHistoryService: RateHistoryService,
  ) {}

  @Get('rates')
  getRates(@Query() dto: GetRatesLogDto) {
    if (!dto.order) {
      dto.order = { field: 'at', order: 'ASC' } as unknown as EntitiesOrder;
    }

    return this.ratesService.getPagedItems(dto);
  }

  @Get('rateHistory')
  async getRateHistory(@Query() dto: GetRateHistoryDto) {
    if (!dto.order) {
      dto.order = { field: 'at', order: 'ASC' } as unknown as EntitiesOrder;
    }

    const history = await this.rateHistoryService.getPagedItems(dto);
    dto.currency = dto.baseCurrency || SupportedCurrency.XDR;
    const baseHistory = await this.rateHistoryService.getPagedItems(dto);

    history.edges.forEach((edge) => {
      const baseEdge = baseHistory.edges.find((item) => {
        return item.node.at.toISOString() == edge.node.at.toISOString();
      });
      const baseRate = baseEdge ? baseEdge.node.rate : null;
      edge.node.rate = baseRate ? edge.node.rate.div(baseRate).toFixed(10) : null;
    });

    return history;
  }
}
