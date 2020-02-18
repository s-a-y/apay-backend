import {Injectable} from '@nestjs/common';
import {getRepository} from "typeorm";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {fromEvent} from "rxjs";
import {concatMap, map} from "rxjs/operators";
import {DailyBalance} from "./entities/daily-balance.entity";
import BigNumber from "bignumber.js";
import {MyLoggerService} from "./my-logger.service";

@Injectable()
export class DailyBalanceExtractorService {
  private readonly logger = new MyLoggerService(DailyBalanceExtractorService.name);

  dumpBalances (balances) {
    return Promise.all(Object.keys(balances).map((asset) => {
      const balance: DailyBalance = balances[asset];
      this.logger.log(`DUMPED ${balance.asset} - ${balance.amount.toString()} ${balance.date}`);
      const b = new DailyBalance();
      b.date = balance.date;
      b.asset = balance.asset;
      b.amount = balance.amount;
      b.accountId = balance.accountId;
      return getRepository(DailyBalance)
        .createQueryBuilder()
        .insert()
        .into(DailyBalance)
        .values(b)
        .onConflict(`ON CONSTRAINT "UQ_accountId_asset_date" DO UPDATE SET "amount" = :amount`)
        .setParameters({amount: balance.amount.toString()})
        .execute();
    })).then(r => this.logger.log(r), error => this.logger.error(error));
  };

  async extract({accountId}: {accountId: string}) {
    let currentDateLabel = null;
    let balances: {[asset: string]: DailyBalance} = {};

    const last = await getRepository(BalanceMutation)
      .createQueryBuilder()
      .where('BalanceMutation.accountId = :id', {id: accountId})
      .orderBy('BalanceMutation.at', 'DESC')
      .getOne();
    await getRepository(BalanceMutation)
      .createQueryBuilder()
      .where('BalanceMutation.accountId = :id', {id: accountId})
      .orderBy('BalanceMutation.at', 'ASC')
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
              m.date = new Date(o.BalanceMutation_at).toISOString().slice(0,10);

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
                balances[instantBalance.asset].amount = balances[instantBalance.asset].amount.plus(instantBalance.amount);
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
