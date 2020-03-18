import {HttpModule, Module} from '@nestjs/common';
import { AppController } from './app.controller';
import {StellarService} from "./stellar.service";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from './config/configuration';
import {TypeOrmModule} from "@nestjs/typeorm";
import {RatesLog} from "./entities/rates-log.entity";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";
import {RateHistory} from "./entities/rate-history.entity";
import {DailyBalanceService} from "./daily-balance.service";
import {DailyBalance} from "./entities/daily-balance.entity";
import {BalanceMutationExtractorService} from "./balance-mutation-extractor.service";
import { SwapModule } from './swap/swap.module';
import {BalanceMutationsService} from "./balance-mutations.service";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {AdminController} from "./admin.controller";
import {JobQueueProcessor} from "./job-queue.processor";
import { QueuesModule } from './queues/queues.module';
import { TxsProcessor } from './swap/txs.processor';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => config.get('database'),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      BalanceMutation,
      DailyBalance,
      RatesLog,
      RateHistory,
    ]),
    QueuesModule,
    SwapModule,
  ],
  controllers: [
    AdminController,
    AppController,
  ],
  providers: [
    BalanceMutationExtractorService,
    BalanceMutationsService,
    ConfigService,
    DailyBalanceService,
    JobQueueProcessor,
    RateHistoryService,
    RatesService,
    StellarService,
    TxsProcessor,
  ],
})
export class AppModule {}
