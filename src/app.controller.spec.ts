import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import {StellarService} from "./stellar.service";
import {GetRatesLogDto} from "./dto/get-rates-log.dto";

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [StellarService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "TODO"', () => {
      expect(appController.getRates({} as GetRatesLogDto)).toBe('TODO');
    });
  });
});
