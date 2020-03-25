import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {RateHistory} from "./entities/rate-history.entity";
import {RatesLog} from "./entities/rates-log.entity";
import {RatesController} from "./rates.controller";
import {RatesService} from "./rates.service";
import {RateHistoryService} from "./rate-history.service";

@Module({
  controllers: [
    RatesController,
  ],
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      RateHistory,
      RatesLog,
    ]),
  ],
  exports: [
    RatesService,
    RateHistoryService,
  ],
  providers: [
    RatesService,
    RateHistoryService,
  ],
})
export class RatesModule {}
