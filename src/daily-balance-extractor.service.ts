import {Injectable} from '@nestjs/common';
import {getRepository} from "typeorm";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {fromEvent, of} from "rxjs";
import {concatMap, timeoutWith} from "rxjs/operators";
import {DailyBalance} from "./entities/daily-balance.entity";
import BigNumber from "bignumber.js";
import {MyLoggerService} from "./my-logger.service";
import {DailyBalanceService} from "./daily-balance.service";
import {StellarService} from "./stellar.service";
import {OrderOption} from "./app.enums";

export enum ExtractDailyBalanceMode {
  FROM_BEGINING,
  LAST_FROM_DATE,
}

export interface ExtractDailyBalanceOptions {
  accountId: string,
  mode: ExtractDailyBalanceMode,
  fromDate?: Date,
}

const COMPLETED = null;

@Injectable()
export class DailyBalanceExtractorService {
  private readonly logger = new MyLoggerService(DailyBalanceExtractorService.name);

  constructor(
    protected readonly dailyBalanceService: DailyBalanceService,
    protected readonly stellarService: StellarService,
  ) {
  }

  async extract({accountId, mode, fromDate}: ExtractDailyBalanceOptions) {
    const balancesCollector = new BalanceCollector(mode, this.dailyBalanceService);

    const queryBuilder = getRepository(BalanceMutation)
      .createQueryBuilder()
      .where('BalanceMutation.accountId = :id', {id: accountId});

    switch (mode) {
      case ExtractDailyBalanceMode.FROM_BEGINING:
        queryBuilder.orderBy('BalanceMutation.at', OrderOption.ASC);
        break;
      case ExtractDailyBalanceMode.LAST_FROM_DATE:
        if (!fromDate) {
          throw new Error('fromDate is not defined!');
        }

        queryBuilder
          .andWhere('BalanceMutation.at >= :value', {value: fromDate})
          .orderBy('BalanceMutation.at', OrderOption.DESC);

        (await this.stellarService.fetchBalances(accountId)).forEach((line) => {
          const balance = new DailyBalance();
          balance.date = (new Date()).toISOString().substr(0, 10);
          balance.amount = line.amount;
          balance.asset = line.asset;
          balance.accountId = accountId;
          balancesCollector.init(balance);
        });

        break;
    }

    await queryBuilder
      .stream()
      .then((stream) => {
        const subscription = fromEvent(stream, 'data')
          .pipe(
            timeoutWith(5000, of(COMPLETED)),
            concatMap(async (o: any) => {
              if (o === COMPLETED) {
                switch (mode) {
                  case ExtractDailyBalanceMode.FROM_BEGINING:
                    await balancesCollector.dump();
                    break;
                  case ExtractDailyBalanceMode.LAST_FROM_DATE:
                    await balancesCollector.dump();
                    break;
                }
                subscription.unsubscribe();
              } else {
                await balancesCollector.add(this.convertRawBalanceMutationToDailyBalance(o));
              }

              return;
            }),
          ).subscribe();
      });
  }

  private convertRawBalanceMutationToDailyBalance(o: any) {
    const balance = new DailyBalance();
    balance.id = o.BalanceMutation_id;
    balance.accountId = o.BalanceMutation_accountId;
    balance.asset = o.BalanceMutation_asset;
    balance.amount = new BigNumber(o.BalanceMutation_amount).multipliedBy((o.BalanceMutation_type === 'credit' ? 1 : -1));
    balance.date = (new Date(o.BalanceMutation_at)).toISOString().substr(0, 10);

    return balance;
  }
}

class BalanceCollector {
  private counters: {[asset: string]: BalanceCounter} = {};

  constructor(
    protected readonly mode: ExtractDailyBalanceMode,
    protected readonly dailyBalanceService: DailyBalanceService,
  ) {}

  init(balance: DailyBalance) {
    if (!this.counters[balance.asset]) {
      this.counters[balance.asset] = new BalanceCounter(this.mode, this.dailyBalanceService, balance.asset, balance.accountId);
    }
    return this.counters[balance.asset].init(balance);
  }

  async add(balance: DailyBalance) {
    if (!this.counters[balance.asset]) {
      this.counters[balance.asset] = new BalanceCounter(this.mode, this.dailyBalanceService, balance.asset, balance.accountId);
    }
    return await this.counters[balance.asset].add(balance);
  }

  dump() {
    return Promise.all(Object.values(this.counters).map(counter => counter.dump()));
  }
}
class BalanceCounter {
  private readonly logger = new MyLoggerService(BalanceCounter.name);
  private amount: BigNumber = new BigNumber(0);
  private amountToDump: BigNumber = new BigNumber(0);
  private date: string;

  constructor(
    protected readonly mode: ExtractDailyBalanceMode,
    protected readonly dailyBalanceService: DailyBalanceService,
    protected readonly asset: string,
    protected readonly accountId: string,
  ) {}

  init(balance: DailyBalance) {
    this.date = null;
    this.amountToDump = balance.amount;
    this.amount = balance.amount;
  }

  async add(balance: DailyBalance) {
    const datesNotEqual = this.date !== balance.date;
    this.logger.log(`${this.date} ${balance.date} ${this.mode}`);
    if (this.date && datesNotEqual) {
      this.logger.log(`DUMP ${this.date} ${balance.date}`);
      await this.dump();
    }
    this.increment(balance);
  }

  private increment(balance: DailyBalance) {
    this.amount = this.mode === ExtractDailyBalanceMode.FROM_BEGINING
      ? this.amount.plus(balance.amount)
      : this.amount.minus(balance.amount);
    this.date = balance.date;
    this.amountToDump = this.amountToDump || this.amount;
    this.amountToDump = this.mode === ExtractDailyBalanceMode.FROM_BEGINING
      ? this.amount
      : this.amountToDump;
  }

  async dump() {
    const b = new DailyBalance();
    b.date = this.date || new Date().toISOString().substr(0, 10);
    b.asset = this.asset;
    b.amount = this.amountToDump;
    b.accountId = this.accountId;
    this.amountToDump = this.amount;
    this.logger.log(b);
    return await this.dailyBalanceService.upsertDailyBalance(b);
  }
}
