import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import minimist from 'minimist';
import {BalanceMutationExtractorService, ExtractBalanceMutationMode} from "./balance-mutation-extractor.service";

function error(message) {
  console.log(`Error: ${message}`);
  console.log("\n\nUsage example:");
  console.log("\t - generate history starting from oldest effects available:");
  console.log("\t\tnpm run balance:import-mutations -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=from-beginning");
  console.log("\n\t - generate history staring from latest effects available:");
  console.log("\t\tnpm run balance:import-mutations -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=from-end --to-date=2020-02-01");
  console.log("\n");
  console.log("Exit now.");
  process.exit(1);
}

const argv = minimist(process.argv.slice(2));

let mode;
let fromDate;
const account = argv['account'];

if (!account) {
  error('Empty account');
}

switch (argv['mode']) {
  case 'from-beginning':
    mode = ExtractBalanceMutationMode.FROM_BEGINING;
    break;
  case 'from-end':
    mode = ExtractBalanceMutationMode.LAST_FROM_DATE;
    if (!argv['to-date'] || !Date.parse(argv['to-date'])) {
      error('bad or empty to-date');
    }
    fromDate = new Date(argv['to-date']);
    break;
  default:
    error('Bad mode');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const extractor = app.get<BalanceMutationExtractorService>(BalanceMutationExtractorService);

  await extractor.extract({
    fromDate,
    mode,
    accountId: account,
  });
}
bootstrap();
