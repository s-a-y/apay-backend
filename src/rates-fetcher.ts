import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {RatesService} from "./rates/rates.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const ratesService = app.get<RatesService>(RatesService);
  await ratesService.fetchRates();
}
bootstrap()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
