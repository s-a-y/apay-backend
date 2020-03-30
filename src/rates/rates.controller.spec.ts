import { Test, TestingModule } from '@nestjs/testing';
import { RatesController } from './rates.controller';
import {StellarService} from "../stellar.service";
import {GetRatesLogDto} from "./dto/get-rates-log.dto";

describe('RatesController', () => {
  let appController: RatesController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RatesController],
      providers: [StellarService],
    }).compile();

    appController = app.get<RatesController>(RatesController);
  });

  describe('root', () => {
    it('should return "TODO"', () => {
      expect(appController.getRates({} as GetRatesLogDto)).toBe('TODO');
    });
  });
});
