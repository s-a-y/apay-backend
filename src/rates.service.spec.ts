import { Test, TestingModule } from '@nestjs/testing';
import {RatesService} from "./rates.service";
import {HttpModule} from "@nestjs/common";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from "./config/configuration";
import {TypeOrmModule} from "@nestjs/typeorm";
import {RatesLog} from "./entities/rates_log.entity";

describe('RatesService', () => {
  let ratesService: RatesService;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [RatesService, ConfigService],
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => config.get('database'),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([RatesLog]),
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration]
        }),
      ],
    }).compile();

    ratesService = app.get<RatesService>(RatesService);
    configService = app.get<ConfigService>(ConfigService);
  });

  describe('RatesService', () => {
    it('fetch', async () => {
      expect(await ratesService.fetchRateHistory(new Date('2019-12-20'))).toBe('TODO');
    });
  });
});
