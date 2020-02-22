import {Injectable} from '@nestjs/common';
import {getRepository} from "typeorm";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {fromEvent} from "rxjs";
import {concatMap, map} from "rxjs/operators";
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
    let currentDateLabel = null;
    let balances: {[asset: string]: DailyBalance};
    let qryOrder: OrderOption;
    let last: BalanceMutation;

    switch (mode) {
      case ExtractDailyBalanceMode.FROM_BEGINING:
        qryOrder = OrderOption.ASC;
        balances = {};
        last = await getRepository(BalanceMutation)
          .createQueryBuilder()
          .where('BalanceMutation.accountId = :id', {id: accountId})
          .orderBy('BalanceMutation.at', 'DESC')
          .limit(1)
          .getOne();
        break;
      case ExtractDailyBalanceMode.LAST_FROM_DATE:
        if (mode === ExtractDailyBalanceMode.LAST_FROM_DATE && !fromDate) {
          throw new Error('fromDate is not defined!');
        }
        qryOrder = OrderOption.DESC;
        balances = {};
        (await this.stellarService.fetchBalances(accountId)).forEach((line) => {
          const balance = new DailyBalance();
          balance.date = new Date();
          balance.amount = line.amount;
          balance.asset = line.asset;
          balance.accountId = accountId;
          balances[line.asset] = balance;
        });
        await this.dumpBalances(balances);
        currentDateLabel = Object.values(balances)[0].date;
        last = await getRepository(BalanceMutation)
          .createQueryBuilder()
          .where('BalanceMutation.accountId = :id', {id: accountId})
          .andWhere('BalanceMutation.at >= :value', {value: fromDate})
          .orderBy('BalanceMutation.at', 'ASC')
          .limit(1)
          .getOne();
        break;
    }

    await getRepository(BalanceMutation)
      .createQueryBuilder()
      .where('BalanceMutation.accountId = :id', {id: accountId})
      .orderBy('BalanceMutation.at', qryOrder)
      .stream()
      .then((stream) => {
        const subscription = fromEvent(stream, 'data')
          .pipe(
            map((o: any) => {
              const m = new DailyBalance();
              m.id = o.BalanceMutation_id;
              m.accountId = o.BalanceMutation_accountId;
              m.asset = o.BalanceMutation_asset;
              m.amount = new BigNumber(o.BalanceMutation_amount).multipliedBy((o.BalanceMutation_type === 'credit' ? 1 : -1));
              m.date = new Date(o.BalanceMutation_at);

              return m;
            }),
            concatMap(async (instantBalance: DailyBalance) => {
              if (currentDateLabel !== instantBalance.date && currentDateLabel !== null) {
                await this.dumpBalances(balances);
              }

              currentDateLabel = instantBalance.date;

              if (!balances[instantBalance.asset]) {
                balances[instantBalance.asset] = instantBalance;
              } else {
                balances[instantBalance.asset].amount = mode === ExtractDailyBalanceMode.FROM_BEGINING
                  ? balances[instantBalance.asset].amount.plus(instantBalance.amount)
                  : balances[instantBalance.asset].amount.minus(instantBalance.amount);
                balances[instantBalance.asset].date = instantBalance.date;
              }

              if (instantBalance.id === last.id) {
                await this.dumpBalances(balances)
                  .then(() => subscription.unsubscribe());
              }

              return instantBalance;
            }),
          ).subscribe();
      });
  }
}
