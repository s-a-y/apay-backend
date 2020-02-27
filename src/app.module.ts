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
import {DailyBalanceExtractorService} from "./daily-balance-extractor.service";
import {BalanceMutationExtractorService} from "./balance-mutation-extractor.service";

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
    TypeOrmModule.forFeature([DailyBalance, RatesLog, RateHistory]),
  ],
  controllers: [AppController],
  providers: [
    BalanceMutationExtractorService,
    ConfigService,
    DailyBalanceService,
    DailyBalanceExtractorService,
    RateHistoryService,
    RatesService,
    StellarService,
  ],
})
export class AppModule {}
