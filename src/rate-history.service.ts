import {HttpService, Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {AbstractService} from "./abstract.service";
import {RateHistoryData} from "./app.interfaces";
import {InjectRepository} from "@nestjs/typeorm";
import {OrderOption, SupportedCurrency} from "./app.enums";
import {RateHistory} from "./entities/rate-history.entity";
import { from } from 'rxjs';
import {flatMap, map, mergeMap} from "rxjs/operators";
import {MyLoggerService} from "./my-logger.service";
import {GetRateHistoryDto} from "./dto/get-rate-history.dto";
import BigNumber from "bignumber.js";

@Injectable()
export class RateHistoryService extends AbstractService<GetRateHistoryDto, RateHistory, RateHistory> {
  private readonly logger = new MyLoggerService(RateHistoryService.name);
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(RateHistory)
    protected readonly entitiesRepository: Repository<RateHistory>,
  ) {
    super();
  }

  getItemsBuilder(input: GetRateHistoryDto, repository?: Repository<RateHistory>): SelectQueryBuilder<any> {
    const builder = (repository || getRepository(RateHistory)).createQueryBuilder('rate_history').where('true');
    const order = input.order || {field: 'cursor', order: OrderOption.ASC};

    builder.orderBy('rate_history.' + order.field, order.order);

    if (input.cursor) {
      const sign = order.order === OrderOption.ASC ? '>' : '<';
      switch (true) {
        case order.field === 'cursor':
          builder.andWhere(`rate_history.cursor ${sign} :cursor`, {cursor: +input.cursor});
          break;
        case ['at', 'createdAt'].includes(order.field):
          builder.andWhere(`rate_history.${order.field}Cursor ${sign} :cursor`, {cursor: input.cursor});
          break;
      }
    }

    if (input.createdAt) {
      builder.andWhere('rate_history.createdAt = :value', { value: input.createdAt });
    }

    if (input.fromCreatedAt) {
      builder.andWhere('rate_history.createdAt >= :value', { value: input.fromCreatedAt });
    }

    if (input.toCreatedAt) {
      builder.andWhere('rate_history.createdAt <= :value', { value: input.toCreatedAt });
    }

    if (input.at) {
      builder.andWhere('rate_history.at = :value', { value: input.at });
    }

    if (input.fromAt) {
      builder.andWhere('rate_history.at >= :value', { value: input.fromAt });
    }

    if (input.toAt) {
      builder.andWhere('rate_history.at <= :value', { value: input.toAt });
    }

    if (input.id) {
      builder.andWhere('rate_history.id = :id', { id: input.id });
    }

    if (input.currency) {
      builder.andWhere('rate_history.currency = :currency', { currency: input.currency });
    }

    return builder;
  }

  async fetchRateHistory(startDate: Date = null, endDate: Date = null) {
    startDate = startDate ? startDate : new Date();
    return new Promise((resolve, reject) => {
      from(Object.values(SupportedCurrency)).pipe(
        mergeMap(currency => this.fetchCurrencyRateHistoryFromNomics(currency, startDate, endDate).pipe(map(response => ({currency, response})))),
        flatMap(({currency, response}) => from(response.data.map(o => {o.currency = currency; return o}))),
        flatMap((v: any) => from(this.insertCurrencyRateHistoryItem(v.currency, v).then(() => v.currency)))
      ).subscribe(
        (next) => {
        },
        (error) => {
          this.logger.logError('Failed to fetch rates history')
          reject(error);
        },
        () => {
          this.logger.log(`[${startDate} - ${endDate}]: Rates history updated for all currencies`);
          resolve();
        }
      );
    });
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
    const existingItem = await this.findOne({currency, at: new Date(item.timestamp)});
    if (!existingItem) {
      const object = new RateHistory();
      object.at = new Date(item.timestamp);
      object.rate = new BigNumber(item.rate);
      object.currency = currency;
      return await this.saveRateHistory(object)
        .then((o) => {
          //console.log({currency: o.currency, at: o.at});
        });
    }

    return existingItem;
  }

  saveRateHistory(history: RateHistory, repository: Repository<RateHistory> = null): Promise<RateHistory> {
    return (repository || this.entitiesRepository).save(history);
  }
}
