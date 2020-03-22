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
import { SwapModule } from './swap/swap.module';
import {AdminController} from "./admin.controller";
import { QueuesModule } from './queues/queues.module';
import { TxsProcessor } from './swap/txs.processor';
import {BalanceModule} from "./balance/balance.module";

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
      RatesLog,
      RateHistory,
    ]),
    QueuesModule,
    SwapModule,
    BalanceModule,
  ],
  controllers: [
    AdminController,
    AppController,
  ],
  providers: [
    ConfigService,
    RateHistoryService,
    RatesService,
    StellarService,
    TxsProcessor,
  ],
})
export class AppModule {}
