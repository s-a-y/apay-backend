import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {RateHistoryService} from "./rates/rate-history.service";
import configuration from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const ratesService = app.get<RateHistoryService>(RateHistoryService);
  await ratesService.fetchRateHistory();
  setInterval(async () => {
    await ratesService.fetchRateHistory();
  }, +configuration().ratesFetcherInterval);
}
bootstrap();
