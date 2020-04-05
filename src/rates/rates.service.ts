import {HttpService, Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {RatesLog} from "./entities/rates-log.entity";
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {AbstractService} from "../abstract.service";
import {GetRatesLogDto} from "./dto/get-rates-log.dto";
import {Rates, RatesItem} from "../app.interfaces";
import {InjectRepository} from "@nestjs/typeorm";
import {OrderOption, SupportedCurrency} from "../app.enums";
import {MyLoggerService} from "../my-logger.service";
import {map} from "rxjs/operators";
import BigNumber from "bignumber.js";

@Injectable()
export class RatesService extends AbstractService<GetRatesLogDto, RatesLog, RatesItem> {
  private readonly logger = new MyLoggerService(RatesService.name);
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(RatesLog)
    protected readonly entitiesRepository: Repository<RatesLog>,
  ) {
    super();
  }

  getItemsBuilder(input: GetRatesLogDto, repository?: Repository<RatesLog>): SelectQueryBuilder<any> {
    const builder = (repository || getRepository(RatesLog)).createQueryBuilder('rates_log').where('true');
    const order = input.order || {field: 'cursor', order: OrderOption.ASC};

    builder.orderBy('rates_log.' + order.field, order.order);

    if (input.cursor) {
      const sign = order.order === OrderOption.ASC ? '>' : '<';
      switch (true) {
        case order.field === 'cursor':
          builder.andWhere(`rates_log.cursor ${sign} :cursor`, {cursor: +input.cursor});
          break;
        case ['at', 'createdAt'].includes(order.field):
          builder.andWhere(`rates_log.${order.field}Cursor ${sign} :cursor`, {cursor: input.cursor});
          break;
      }
    }

    if (input.createdAt) {
      builder.andWhere('rates_log.createdAt = :value', { value: input.createdAt });
    }

    if (input.fromCreatedAt) {
      builder.andWhere('rates_log.createdAt >= :value', { value: input.fromCreatedAt });
    }

    if (input.toCreatedAt) {
      builder.andWhere('rates_log.createdAt <= :value', { value: input.toCreatedAt });
    }

    if (input.at) {
      builder.andWhere('rates_log.at = :value', { value: input.at });
    }

    if (input.fromAt) {
      builder.andWhere('rates_log.at >= :value', { value: input.fromAt });
    }

    if (input.toAt) {
      builder.andWhere('rates_log.at <= :value', { value: input.toAt });
    }

    if (input.id) {
      builder.andWhere('rates_log.id = :id', { id: input.id });
    }

    return builder;
  }

  async mapPagedItems(log: RatesLog, input: GetRatesLogDto) {
    const rates: Rates = {};
    Object.values(SupportedCurrency).forEach((key)=> {
      rates[key] = new BigNumber(log.data[key]);
    });
    return Promise.resolve({
      id: log.id,
      rates,
      createdAt: log.createdAt,
      at: log.at
    } as RatesItem);
  }

  async fetchRates() {
    const rates = await this.fetchFromStellarTicker();
    const log = new RatesLog();
    log.at = rates.at;
    log.data = rates.data;
    return await this.saveRatesLog(log);
  }

  async fetchFromStellarTicker() {
    return await this.http.get('https://ticker.stellar.org/markets.json').pipe(
      map((response) => {
        return {
          at: response.data.generated_at_rfc3339,
          data: response.data.pairs
            .filter((o) => o.name.search('XLM_') !== -1)
            .map((o) => ({[o.name.substr(4)]: o.price}))
            .reduce((acc, o) => ({...acc, ...o}), {})
        };
      })
    ).toPromise();
  }

  saveRatesLog(log: RatesLog, repository: Repository<RatesLog> = null): Promise<RatesLog> {
    return (repository || this.entitiesRepository).save(log)
      .then((v) => this.findOneById(v.id, (repository || this.entitiesRepository)))
      .then((v) => {
        v.createdAtCursor = this.generateDateCursor(v.createdAt, v.cursor);
        v.atCursor = this.generateDateCursor(v.at, v.cursor);
        return (repository || this.entitiesRepository).save(v);
      });
  }
}
