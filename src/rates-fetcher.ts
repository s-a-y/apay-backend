import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {RateHistoryService} from "./rates/rate-history.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const ratesService = app.get<RateHistoryService>(RateHistoryService);
  await ratesService.fetchRateHistory();
  setInterval(async () => {
    await ratesService.fetchRateHistory();
  }, 300000);
}
bootstrap();
