import {HttpService, Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {RatesLog} from "./entities/rates_log.entity";
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {AbstractService} from "./abstract.service";
import {GetRatesLogDto} from "./dto/get_rates_log.dto";
import {RateHistoryData, Rates, RatesContainer, RatesLogData} from "./app.interfaces";
import {InjectRepository} from "@nestjs/typeorm";
import {OrderOption, SupportedCurrency} from "./app.enums";
import {RateHistory} from "./entities/rate_history.entity";
import { from } from 'rxjs';
import {flatMap, map, mergeMap, switchMap} from "rxjs/operators";
import {MyLoggerService} from "./my-logger.service";

@Injectable()
export class RatesService extends AbstractService<GetRatesLogDto, RatesLog, RatesContainer> {
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

    console.log(input);

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

  async mapPagedItems(log: RatesLog) {
    const rates: Rates = {};
    log.data.forEach((rawRates)=> {
      rates[rawRates.currency] = rawRates.rate;
    });
    return Promise.resolve({
      id: log.id,
      rates,
      fetchedAt: log.createdAt,
      at: log.data[0].timestamp
    } as RatesContainer);
  }

  async fetchRates() {
    const rates = await this.fetchFromNomics();
    return await this.insertRatesLog(rates);
  }

  private async fetchFromNomics() {
    const response = await this.http.get(
      'https://api.nomics.com/v1/exchange-rates',
      {
        params: {key: this.configService.get('nomicsApiKey')}
      },
    ).toPromise();

    return response.data;
  }

  async fetchRateHistory(startDate: Date, endDate: Date = null) {
    return from(Object.values(SupportedCurrency)).pipe(
      mergeMap(currency => this.fetchCurrencyRateHistoryFromNomics(currency, startDate, endDate).pipe(map(response => ({currency, response})))),
      flatMap(({currency, response}) => from(response.data.map(o => {o.currency = currency; return o}))),
      flatMap((v: any) => from(this.insertCurrencyRateHistoryItem(v.currency, v).then(() => v.currency)))
    ).subscribe(
      (next) => {
        console.log('HUI');
        this.logger.log(`[${startDate} - ${endDate}]:${next}: Rates history updated`);
      },
      (error) => {
        console.log('HUI 1');
        this.logger.logError('Failed to fetch rates history')
      },
      () => {
        console.log('HUI 2');
        this.logger.log(`[${startDate} - ${endDate}]: Rates history updated for all currencies`);
      }
    );
  }

  private fetchCurrencyRateHistoryFromNomics(currency: SupportedCurrency, startDate: Date, endDate: Date = null) {
    return this.http.get(
      'https://api.nomics.com/v1/exchange-rates/history',
      {
        params: {
          currency,
          key: this.configService.get('nomicsApiKey'),
          start: new Date(startDate.toDateString()),
          end: endDate ? new Date(endDate.toDateString()) : null,
        }
      },
    );
  }

  private async insertCurrencyRateHistoryItem(currency: SupportedCurrency, item: RateHistoryData) {
    const object = new RateHistory();
    object.at = new Date(item.timestamp);
    object.rate = item.rate;
    object.currency = currency;
    this.logger.log(object);
    return await this.saveRateHistory(object);
  }

  private async insertRatesLog(rates) {
    const log = new RatesLog();
    log.at = new Date(rates[0].timestamp);
    log.data = rates;
    return await this.saveRatesLog(log);
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

  saveRateHistory(history: RateHistory, repository: Repository<RatesLog> = null): Promise<RatesLog> {
    return (repository || this.entitiesRepository).save(history);
  }
}
