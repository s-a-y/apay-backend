import {Injectable} from '@nestjs/common';
import {getRepository} from "typeorm";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {fromEvent, of} from "rxjs";
import {concatMap, map, timeoutWith} from "rxjs/operators";
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
type AssetBalances = {[asset: string]: DailyBalance};

const COMPLETED = null;

type AssetCounters = {[asset: string]: {amount: BigNumber, date: string}};

class BalanceCollector {
  private amount: BigNumber = new BigNumber(0);
  private date: string;

  constructor(
    protected readonly mode: ExtractDailyBalanceMode,
    protected readonly dailyBalanceService: DailyBalanceService,
    protected readonly asset: string,
    protected readonly accountId: string,
  ) {}

  async add(balance: DailyBalance) {
    switch (this.mode) {
      case ExtractDailyBalanceMode.FROM_BEGINING:
        if (this.date !== balance.date) {
          await this.dump();
        }
        this.date = balance.date;
        this.increment(balance);
        break;
      case ExtractDailyBalanceMode.LAST_FROM_DATE:
        this.increment(balance);
        if (this.date !== balance.date) {
          await this.dump();
        }
        this.date = balance.date;
        break;
    }
  }

  private increment(balance: DailyBalance) {
    this.amount = this.mode === ExtractDailyBalanceMode.FROM_BEGINING
      ? this.amount.plus(balance.amount)
      : this.amount.minus(balance.amount);
    this.date = balance.date;
  }

  async dump() {
    const b = new DailyBalance();
    b.date = this.date;
    b.asset = this.asset;
    b.amount = this.amount;
    b.accountId = this.accountId;
    return this.dailyBalanceService.upsertDailyBalance(b);
  }
}

@Injectable()
export class DailyBalanceExtractorService {
  private readonly logger = new MyLoggerService(DailyBalanceExtractorService.name);

  constructor(
    protected readonly dailyBalanceService: DailyBalanceService,
    protected readonly stellarService: StellarService,
  ) {}

  dumpBalances (balances) {
    return Promise.all(Object.keys(balances).map((asset) => {
      const balance: DailyBalance = balances[asset];
      this.logger.log(`DUMPED ${balance.asset} - ${balance.amount.toString()} ${balance.date}`);
      const b = new DailyBalance();
      b.date = balance.date;
      b.asset = balance.asset;
      b.amount = balance.amount;
      b.accountId = balance.accountId;
      return this.dailyBalanceService.upsertDailyBalance(b);
    })).catch(error => this.logger.error(error));
  };

  async extract({accountId, mode, fromDate}: ExtractDailyBalanceOptions) {
    let currentDateLabel: string = null;
    let balances: AssetBalances;

    const queryBuilder = getRepository(BalanceMutation)
      .createQueryBuilder()
      .where('BalanceMutation.accountId = :id', {id: accountId});

    switch (mode) {
      case ExtractDailyBalanceMode.FROM_BEGINING:
        queryBuilder.orderBy('BalanceMutation.at', OrderOption.ASC);
        balances = {};
        break;
      case ExtractDailyBalanceMode.LAST_FROM_DATE:
        if (!fromDate) {
          throw new Error('fromDate is not defined!');
        }
        queryBuilder
          .andWhere('BalanceMutation.at >= :value', {value: fromDate})
          .orderBy('BalanceMutation.at', OrderOption.DESC);
        balances = {};
        (await this.stellarService.fetchBalances(accountId)).forEach((line) => {
          const balance = new DailyBalance();
          balance.date = (new Date()).toISOString().substr(0, 10);
          balance.amount = line.amount;
          balance.asset = line.asset;
          balance.accountId = accountId;
          balances[line.asset] = balance;
        });
        //await this.dumpBalances(balances);
        //currentDateLabel = Object.values(balances)[0].date.toISOString().substr(0, 10);
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
                this.logger.log('COMPLETED!!!!!!!!!!!!!!!!!!!!!!!!!!')
                switch (mode) {
                  case ExtractDailyBalanceMode.FROM_BEGINING:
                    await this.dumpBalances(balances);
                    break;
                  case ExtractDailyBalanceMode.LAST_FROM_DATE:
                    await this.dumpBalances(balances);
                    this.logger.log(balances);
                    break;
                }

                subscription.unsubscribe();
              } else {
                const balance = this.convertRawBalanceMutationToDailyBalance(o);

                this.logger.log(`>>>>>>>>>>>>>>>>>>>>> ${currentDateLabel} && ${currentDateLabel} !== ${balance.date}`);

                switch (mode) {
                  case ExtractDailyBalanceMode.FROM_BEGINING:
                    if (currentDateLabel !== balance.date) {
                      await this.dumpBalances(balances);
                    }
                    currentDateLabel = balance.date;
                    this.incrementBalances(balances, balance, mode);
                    break;
                  case ExtractDailyBalanceMode.LAST_FROM_DATE:
                    this.incrementBalances(balances, balance, mode);
                    if (currentDateLabel !== balance.date) {
                      await this.dumpBalances(balances);
                    }
                    currentDateLabel = balance.date;
                    break;
                }
              }

              return;
            }),
          ).subscribe();
      });
  }

  private incrementBalances(balances: AssetBalances, balanceToAdd: DailyBalance, mode: ExtractDailyBalanceMode) {
    if (!balances[balanceToAdd.asset]) {
      balances[balanceToAdd.asset] = balanceToAdd;
    } else {
      balances[balanceToAdd.asset].amount = mode === ExtractDailyBalanceMode.FROM_BEGINING
        ? balances[balanceToAdd.asset].amount.plus(balanceToAdd.amount)
        : balances[balanceToAdd.asset].amount.minus(balanceToAdd.amount);
      balances[balanceToAdd.asset].date = balanceToAdd.date;
    }
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
