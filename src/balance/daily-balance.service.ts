import {Injectable} from '@nestjs/common';
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {AbstractService} from "../abstract.service";
import {InjectRepository} from "@nestjs/typeorm";
import {OrderOption} from "../app.enums";
import {MyLoggerService} from "../my-logger.service";
import {DailyBalance} from "./entities/daily-balance.entity";
import {Asset, DailyBalance as DailyBalanceInterface} from '../app.interfaces';
import {GetDailyBalancesDto} from "./dto/get-daily-balances.dto";
import {BalanceMutationExtractorService, ExtractBalanceMutationMode} from "./balance-mutation-extractor.service";
import {DailyBalanceExtractorService, ExtractDailyBalanceMode} from "./daily-balance-extractor.service";
import {StellarService} from "../stellar.service";
import {AccountService} from "../account/account.service";
import moment from 'moment';

@Injectable()
export class DailyBalanceService extends AbstractService<GetDailyBalancesDto, DailyBalance, DailyBalanceInterface> {
  private readonly logger = new MyLoggerService(DailyBalanceService.name);
  private dailyBalanceExtractorService: DailyBalanceExtractorService;
  constructor(
    private readonly accountService: AccountService,
    private readonly stellarService: StellarService,
    private readonly balanceMutationExtractorService: BalanceMutationExtractorService,
    @InjectRepository(DailyBalance)
    protected readonly entitiesRepository: Repository<DailyBalance>,
  ) {
    super();
  }

  async getAccountLastFetchedAt(accountId: string) {
    const account = await this.accountService.findOneByAddress(accountId);
    if (!account) {
      return false;
    }
    if (!account.balanceFetcherDetails.lastFetchedAt) {
      return false;
    }
    return account.balanceFetcherDetails.lastFetchedAt;
  }

  async updateAccountLastFetchedAt(accountId: string) {
    return this.accountService.findOneByAddressOrReturnNew(accountId)
      .then((account) => {
        return this.accountService.update(
          accountId,
          {
            ...account,
            balanceFetcherDetails: {...account.balanceFetcherDetails, lastFetchedAt: moment().toISOString()}
          })
      })
  }

  getItemsBuilder(input: GetDailyBalancesDto, repository?: Repository<DailyBalance>): SelectQueryBuilder<any> {
    const builder = (repository || getRepository(DailyBalance)).createQueryBuilder('daily_balance').where('true');
    const order = input.order || {field: 'cursor', order: OrderOption.ASC};

    builder.orderBy('daily_balance.' + order.field, order.order);

    if (input.cursor) {
      const sign = order.order === OrderOption.ASC ? '>' : '<';
      switch (true) {
        case order.field === 'cursor':
          builder.andWhere(`daily_balance.cursor ${sign} :cursor`, {cursor: +input.cursor});
          break;
        case ['date', 'createdAt'].includes(order.field):
          builder.andWhere(`daily_balance.${order.field}Cursor ${sign} :cursor`, {cursor: input.cursor});
          break;
      }
    }

    if (input.accountId) {
      builder.andWhere('daily_balance.accountId = :accountId', {accountId: input.accountId});
    }

    if (input.asset && input.asset.code && input.asset.issuer) {
      builder.andWhere('daily_balance.asset = :asset', {asset: `${input.asset.code} ${input.asset.issuer}`});
    }

    if (input.createdAt) {
      builder.andWhere('daily_balance.createdAt = :createdAt', { createdAt: input.createdAt });
    }

    if (input.fromCreatedAt) {
      builder.andWhere('daily_balance.createdAt >= :fromCreatedAt', { fromCreatedAt: input.fromCreatedAt });
    }

    if (input.toCreatedAt) {
      builder.andWhere('daily_balance.createdAt <= :toCreatedAt', { toCreatedAt: input.toCreatedAt });
    }

    if (input.date) {
      builder.andWhere('daily_balance.date = :date', { date: input.date });
    }

    if (input.fromDate) {
      builder.andWhere('daily_balance.date >= :fromDate', { fromDate: input.fromDate });
    }

    if (input.toDate) {
      builder.andWhere('daily_balance.date <= :toDate', { toDate: input.toDate });
    }

    if (input.id) {
      builder.andWhere('daily_balance.id = :id', { id: input.id });
    }

    return builder;
  }

  async mapPagedItems(balance: DailyBalance) {
    // @ts-ignore
    return Promise.resolve({
      id: balance.id,
      cursor: balance.cursor.toString(),
      accountId: balance.accountId,
      asset: {code: balance.asset.split(' ')[0], issuer: balance.asset.split(' ')[1]} as Asset,
      amount: balance.amount.toString(),
      date: balance.date,
      createdAt: balance.createdAt,
    } as DailyBalanceInterface);
  }

  async upsertDailyBalance(balance) {
    return getRepository(DailyBalance)
      .createQueryBuilder()
      .insert()
      .into(DailyBalance)
      .values(balance)
      .onConflict(`ON CONSTRAINT "UQ_accountId_asset_date" DO UPDATE SET "amount" = :amount`)
      .setParameters({
        amount: balance.amount.toString(),
      })
      .execute()
      .then((result) => {
        return this.findOne({id: result.identifiers[0].id});
      })
      .then((balance) => {
        balance.dateCursor = this.generateDateCursor(new Date(balance.date), balance.cursor);
        balance.createdAtCursor = this.generateDateCursor(balance.createdAt, balance.cursor);
        return this.entitiesRepository.save(balance);
      });
  }

  async syncDailyBalances({toDate, accountId}: {toDate: Date, accountId: string}) {
    this.dailyBalanceExtractorService = new DailyBalanceExtractorService(this, this.stellarService);

    this.logger.log('syncDailyBalances(): started');

    return this.balanceMutationExtractorService.extract({
      accountId,
      toDate,
      mode: ExtractBalanceMutationMode.FROM_TAIL,
    }).then(() => {
      return this.balanceMutationExtractorService.extract({
        accountId,
        mode: ExtractBalanceMutationMode.CATCH_TAIL,
      });
    }).then(() => {
      return this.dailyBalanceExtractorService.extract({
        accountId,
        toDate,
        mode: ExtractDailyBalanceMode.FROM_TAIL,
      });
    }).then(() => {
      return this.dailyBalanceExtractorService.extract({
        accountId,
        mode: ExtractDailyBalanceMode.CATCH_TAIL,
      });
    }).then(() => this.updateAccountLastFetchedAt(accountId))
    .then(() => this.logger.log('syncDailyBalances(): completed'))
    .catch((error) => {
      this.logger.log('syncDailyBalances(): failed');
      this.logger.error(error);
    });
  }
}
