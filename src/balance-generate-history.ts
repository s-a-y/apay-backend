import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import minimist from 'minimist';
import {DailyBalanceExtractorService, ExtractDailyBalanceMode} from "./daily-balance-extractor.service";

function error(message) {
  console.log(`Error: ${message}`);
  console.log("\n\nUsage example:");
  console.log("\n\t - generate history staring from latest effects available:");
  console.log("\t\tnpm run balance:generate-history -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=from-tail --to-date=2020-02-01");
  console.log("\n\t - catch up latest daily balances (should run periodically after initial import with --mode=from-tail):");
  console.log("\t\tnpm run balance:generate-history -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=catch-tail");
  console.log("\n");
  console.log("Exit now.");
  process.exit(1);
}

const argv = minimist(process.argv.slice(2));

let mode;
let toDate;
const account = argv['account'];

if (!account) {
  error('Empty account');
}

switch (argv['mode']) {
  case 'from-tail':
    mode = ExtractDailyBalanceMode.FROM_TAIL;
    if (!argv['to-date'] || !Date.parse(argv['to-date'])) {
      error('bad or empty to-date');
    }
    toDate = new Date(argv['to-date']);
    break;
  case 'catch-tail':
    mode = ExtractDailyBalanceMode.CATCH_TAIL;
    break;
  default:
    error('Bad mode');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const extractor = app.get<DailyBalanceExtractorService>(DailyBalanceExtractorService);

  await extractor.extract({
    mode,
    toDate,
    accountId: account,
  })
    .then(() => process.exit(0));
}
bootstrap();
