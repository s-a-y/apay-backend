import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import minimist from 'minimist';
import {DailyBalanceService} from "./daily-balance.service";

function error(message) {
  console.log(`Error: ${message}`);
  console.log("\n\nUsage example:");
  console.log("\n\t - import balance mutation data (from now till --to-date argument value) from Stellar" +
    "\n\t   and generate balance history data for --account's value:");
  console.log("\t\tnpm run balance:import -- --account=GBR3RS2Z277FER476OFHFXQJRKYSQX4Z7XNWO65AN3QPRUANUASANG3L --to-date=2020-03-01");
  console.log("\n");
  console.log("Exit now.");
  process.exit(1);
}

const argv = minimist(process.argv.slice(2));

let toDate;
const accountId = argv['account'];

if (!accountId) {
  error('Empty account');
}

if (!argv['to-date'] || !Date.parse(argv['to-date'])) {
  error('bad or empty to-date');
}
toDate = new Date(argv['to-date']);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const dailyBalanceService = app.get<DailyBalanceService>(DailyBalanceService);

  return dailyBalanceService.syncDailyBalances({
    accountId,
    toDate,
  }).then(() => process.exit(0));
}
bootstrap();
