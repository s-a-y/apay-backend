import {Injectable} from '@nestjs/common';
import {getRepository, Repository, SelectQueryBuilder} from "typeorm";
import {AbstractService} from "./abstract.service";
import {InjectRepository} from "@nestjs/typeorm";
import {OrderOption} from "./app.enums";
import {MyLoggerService} from "./my-logger.service";
import {BalanceMutation as BalanceMutationInterface} from "./app.interfaces";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {GetBalanceMutationsDto} from "./dto/get-balance-mutations.dto";
import {Asset} from "./app.interfaces";

@Injectable()
export class BalanceMutationsService extends AbstractService<GetBalanceMutationsDto, BalanceMutation, BalanceMutationInterface> {
  private readonly logger = new MyLoggerService(BalanceMutationsService.name);
  constructor(
    @InjectRepository(BalanceMutation)
    protected readonly entitiesRepository: Repository<BalanceMutation>,
  ) {
    super();
  }

  getItemsBuilder(input: GetBalanceMutationsDto, repository?: Repository<BalanceMutation>): SelectQueryBuilder<BalanceMutation> {
    const builder = (repository || getRepository(BalanceMutation)).createQueryBuilder('balance_mutation').where('true');
    const order = input.order || {field: 'cursor', order: OrderOption.ASC};

    builder.orderBy('balance_mutation.' + order.field, order.order);

    if (input.cursor) {
      const sign = order.order === OrderOption.ASC ? '>' : '<';
      switch (true) {
        case order.field === 'cursor':
          builder.andWhere(`balance_mutation.cursor ${sign} :cursor`, {cursor: +input.cursor});
          break;
        case ['at'].includes(order.field):
          builder.andWhere(`balance_mutation.${order.field}Cursor ${sign} :cursor`, {cursor: input.cursor});
          break;
      }
    }

    if (input.type) {
      builder.andWhere('balance_mutation.type = :type', {type: input.type});
    }

    if (input.externalCursor) {
      builder.andWhere('balance_mutation.externalCursor = :externalCursor', {externalCursor: input.externalCursor});
    }

    if (input.accountId) {
      builder.andWhere('balance_mutation.accountId = :accountId', {accountId: input.accountId});
    }

    if (input.asset && input.asset.code && input.asset.issuer) {
      builder.andWhere('balance_mutation.asset = :asset', {asset: `${input.asset.code} ${input.asset.issuer}`});
    }

    if (input.fromAt) {
      builder.andWhere('balance_mutation.at >= :fromAt', { fromAt: input.fromAt });
    }

    if (input.toAt) {
      builder.andWhere('balance_mutation.at <= :toAt', { toAt: input.toAt });
    }

    if (input.id) {
      builder.andWhere('balance_mutation.id = :id', { id: input.id });
    }

    return builder;
  }

  async mapPagedItems(mutation: BalanceMutation) {
    // @ts-ignore
    return Promise.resolve({
      id: mutation.id,
      cursor: mutation.cursor.toString(),
      accountId: mutation.accountId,
      asset: {code: mutation.asset.split(' ')[0], issuer: mutation.asset.split(' ')[1]} as Asset,
      type: mutation.type,
      amount: mutation.amount.toString(),
      at: mutation.at,
      createdAt: mutation.createdAt,
    } as BalanceMutationInterface);
  }

  async upsertBalanceMutation(mutation: BalanceMutation) {
    return getRepository(BalanceMutation)
      .createQueryBuilder()
      .insert()
      .into(BalanceMutation)
      .values(mutation)
      .onConflict(`ON CONSTRAINT "UQ_accountId_type_externalId" DO NOTHING`)
      .execute();
  }
}
