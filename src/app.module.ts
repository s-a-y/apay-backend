import {HttpModule, Module} from '@nestjs/common';
import {StellarService} from "./stellar.service";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from './config/configuration';
import {TypeOrmModule} from "@nestjs/typeorm";
import { SwapModule } from './swap/swap.module';
import {AdminController} from "./admin.controller";
import { QueuesModule } from './queues/queues.module';
import { TxsProcessor } from './swap/txs.processor';
import {BalanceModule} from "./balance/balance.module";
import {RatesModule} from "./rates/rates.module";

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
    QueuesModule,
    SwapModule,
    BalanceModule,
    RatesModule,
  ],
  controllers: [
    AdminController,
  ],
  providers: [
    ConfigService,
    StellarService,
    TxsProcessor,
  ],
})
export class AppModule {}
