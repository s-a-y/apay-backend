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
  FROM_HEAD, // Deprecated, to be removed soon
  FROM_TAIL,
  CATCH_TAIL,
}

export interface ExtractDailyBalanceOptions {
  accountId: string,
  mode: ExtractDailyBalanceMode,
  toDate?: Date,
  reset?: boolean,
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

  async extract({accountId, mode, toDate}: ExtractDailyBalanceOptions) {
    this.logger.log({accountId, mode, toDate, log: 'extract(): started'});

    this.logger.log('extract(): started');

    const balancesCollector = new BalanceCollector(mode, this.dailyBalanceService);

    const queryBuilder = getRepository(BalanceMutation)
      .createQueryBuilder()
      .where('BalanceMutation.accountId = :id', {id: accountId});

    switch (mode) {
      case ExtractDailyBalanceMode.FROM_HEAD:
        queryBuilder.orderBy('BalanceMutation.at', OrderOption.ASC);
        break;
      case ExtractDailyBalanceMode.CATCH_TAIL:
        toDate = new Date((await this.fetchLatestKnownDailyBalances(accountId)).map(v => v.date).sort().shift());

        queryBuilder
          .andWhere('BalanceMutation.at >= :value', {value: toDate})
          .orderBy('BalanceMutation.at', OrderOption.DESC);

        (await this.fetchDailyBalancesFromStellar(accountId))
          .forEach(balance => balancesCollector.init(balance));

        break;
      case ExtractDailyBalanceMode.FROM_TAIL:
        if (!toDate) {
          throw new Error('toDate is not defined!');
        }

        queryBuilder
          .andWhere('BalanceMutation.at >= :value', {value: toDate})
          .orderBy('BalanceMutation.at', OrderOption.DESC);

        (await this.fetchInitialDailyBalancesForFromTail(accountId))
          .forEach(balance => balancesCollector.init(balance));

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
                  case ExtractDailyBalanceMode.FROM_HEAD:
                    await balancesCollector.dump();
                    break;
                  case ExtractDailyBalanceMode.FROM_TAIL:
                    await balancesCollector.dump();
                    break;
                }
                this.logger.log('extract(): completed');
                subscription.unsubscribe();
              } else {
                const dailyBalance = this.convertRawBalanceMutationToDailyBalance(o);
                await balancesCollector.add(dailyBalance);
              }

              return;
            }),
          ).subscribe();
      });
  }

  /**
   * Fetch array of oldest entries for each asset from DailyBalances.
   * If some entries do not exist replace them with ones composed of current stellar balances
   *
   * @param accountId
   */
  private async fetchInitialDailyBalancesForFromTail(accountId: string) {
    const earlierBalances = await this.fetchEarliestKnownDailyBalances(accountId);
    return (await this.fetchDailyBalancesFromStellar(accountId))
      .map((currentBalance) => {
        const found = earlierBalances.filter(v => v.asset === currentBalance.asset).pop();
        return found ? found : currentBalance;
      });
  }

  private async fetchDailyBalancesFromStellar(accountId: string) {
    return (await this.stellarService.fetchBalances(accountId))
      .map((line) => {
        const balance = new DailyBalance();
        balance.date = (new Date()).toISOString().substr(0, 10);
        balance.amount = line.amount;
        balance.asset = line.asset;
        balance.accountId = accountId;
        return balance;
      });
  }

  /**
   * Fetch array of oldest entries for each asset from DailyBalances
   *
   * @param accountId
   */
  private async fetchEarliestKnownDailyBalances(accountId: string) {
    return Promise.all(
      (await this.getKnownAssets(accountId))
        .map((asset) => getRepository(DailyBalance)
        .createQueryBuilder('DailyBalance')
        .where('DailyBalance.accountId = :accountId and asset = :asset', {accountId, asset})
        .orderBy('DailyBalance.date', 'ASC')
        .getOne()
      )
    );
  }

  private async fetchLatestKnownDailyBalances(accountId: string) {
    return Promise.all(
      (await this.getKnownAssets(accountId))
        .map((asset) => getRepository(DailyBalance)
          .createQueryBuilder('DailyBalance')
          .where('DailyBalance.accountId = :accountId and asset = :asset', {accountId, asset})
          .orderBy('DailyBalance.date', 'DESC')
          .getOne()
        )
    );
  }

  private async getKnownAssets(accountId: string) {
    return (await getRepository(DailyBalance)
      .createQueryBuilder('DailyBalance')
      .select('DISTINCT "DailyBalance"."asset"')
      .where('DailyBalance.accountId = :accountId', {accountId})
      .getRawMany()).map(value => value.asset);
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
    this.date = balance.date;
    this.amountToDump = balance.amount;
    this.amount = balance.amount;
  }

  async add(balance: DailyBalance) {
    if (new Date(this.date).getTime() >= new Date(balance.date).getTime()) {
      if (this.date && this.date !== balance.date) {
        await this.dump();
      }
      this.increment(balance);
    }
  }

  private increment(balance: DailyBalance) {
    this.amount = this.mode === ExtractDailyBalanceMode.FROM_HEAD
      ? this.amount.plus(balance.amount)
      : this.amount.minus(balance.amount);
    this.date = balance.date;
    this.amountToDump = this.amountToDump || this.amount;
    this.amountToDump = this.mode === ExtractDailyBalanceMode.FROM_HEAD
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
    return await this.dailyBalanceService.upsertDailyBalance(b);
  }
}
