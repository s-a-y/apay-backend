import {RateHistory} from "./entities/rate-history.entity";

process.env.TZ = 'UTC';

import { Test, TestingModule } from '@nestjs/testing';
import {RatesService} from "./rates.service";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from "../config/configuration";
import {TypeOrmModule} from "@nestjs/typeorm";
import {RatesModule} from "./rates.module";

process.env.TZ = 'UTC';

jest.setTimeout(3000000);

describe('RatesService', () => {
  let ratesService: RatesService;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => config.get('database'),
          inject: [ConfigService],
        }),
        //HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration]
        }),
        RatesModule,
      ],
    }).compile();

    ratesService = app.get<RatesService>(RatesService);
    configService = app.get<ConfigService>(ConfigService);
  });

  describe('RatesService', () => {
    it('fetch', async () => {
      expect(
        (await ratesService.fetchFromStellarTicker())
      ).toBe('TODO');
    });
  });
});
