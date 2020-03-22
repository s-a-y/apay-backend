import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesModule } from '../queues/queues.module';
import {DailyBalance} from "./entities/daily-balance.entity";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {BalanceController} from "./balance.controller";
import {DailyBalanceService} from "./daily-balance.service";
import {DailyBalanceExtractorService} from "./daily-balance-extractor.service";
import {BalanceMutationsService} from "./balance-mutations.service";
import {BalanceMutationExtractorService} from "./balance-mutation-extractor.service";
import {BalanceProcessor} from "./balance.processor";
import {ConfigService} from "@nestjs/config";
import {StellarService} from "../stellar.service";
import {AccountModule} from "../account/account.module";
import {AccountService} from "../account/account.service";
import {Account} from "../account/account.entity";

@Module({
  controllers: [
    BalanceController,
  ],
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Account,
      DailyBalance,
      BalanceMutation,
    ]),
    QueuesModule,
    AccountModule,
  ],
  exports: [
    DailyBalanceService,
    DailyBalanceExtractorService,
    BalanceMutationsService,
    BalanceMutationExtractorService,
  ],
  providers: [
    BalanceMutationExtractorService,
    BalanceMutationsService,
    BalanceProcessor,
    ConfigService,
    DailyBalanceExtractorService,
    DailyBalanceService,
    StellarService,
    AccountService,
  ],
})
export class BalanceModule {}
