import {Injectable} from '@nestjs/common';
import {getRepository, Repository} from "typeorm";
import {InjectRepository} from "@nestjs/typeorm";
import {Account} from "./account.entity";
import {MyLoggerService} from "../my-logger.service";
import {QueryPartialEntity} from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class AccountService {
  private readonly logger = new MyLoggerService(AccountService.name);
  constructor(
    @InjectRepository(Account)
    protected readonly entitiesRepository: Repository<Account>,
  ) {}

  findOneByAddress(address: string) {
    return getRepository<Account>(Account).findOne({where: {address}});
  }
  findOneByAddressOrReturnNew(address: string) {
    return this.findOneByAddress(address)
      .then((account?: Account) => {
        if (!account) {
          account = new Account();
          account.address = address;
          account.balanceFetcherDetails = {initLoad: false};
        }
        return account;
      });
  }
  update(address, params: QueryPartialEntity<Account>) {
    const qrySet = Object.keys(params).map(key => `"${key}" = :${key}`).join(', ');
    return getRepository(Account)
      .createQueryBuilder()
      .insert()
      .into(Account)
      .values(params)
      .onConflict(`ON CONSTRAINT "UQ_address" DO UPDATE SET ${qrySet}`)
      .setParameters(params)
      .execute();
  }
}
