import { Test, TestingModule } from '@nestjs/testing';
import {RatesService} from "./rates.service";
import {HttpModule} from "@nestjs/common";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from "./config/configuration";
import {TypeOrmModule} from "@nestjs/typeorm";
import {RatesLog} from "./entities/rates-log.entity";
import {RateHistory} from "./entities/rate-history.entity";
import {RateHistoryService} from "./rate-history.service";

describe('RatesService', () => {
  let ratesService: RatesService;
  let rateHistoryService: RateHistoryService;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [RatesService, ConfigService, RateHistoryService],
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => config.get('database'),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([RatesLog, RateHistory]),
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration]
        }),
      ],
    }).compile();

    ratesService = app.get<RatesService>(RatesService);
    rateHistoryService = app.get<RateHistoryService>(RateHistoryService);
    configService = app.get<ConfigService>(ConfigService);
  });

  describe('RatesService', () => {
    it('fetch', async () => {
      expect(await rateHistoryService.fetchRateHistory(new Date('2019-12-20'))).toBe('TODO');
    });
  });
});
