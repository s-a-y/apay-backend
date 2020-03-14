import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import minimist from 'minimist';
import {BalanceMutationExtractorService, ExtractBalanceMutationMode} from "./balance-mutation-extractor.service";

function error(message) {
  console.log(`Error: ${message}`);
  console.log("\n\nUsage example:");
  console.log("\t - generate history starting from oldest effects available:");
  console.log("\t\tnpm run balance:import-mutations -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=from-head");
  console.log("\n\t - generate history staring from latest effects available:");
  console.log("\t\tnpm run balance:import-mutations -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=from-tail --to-date=2020-02-01");
  console.log("\n\t - catch up latest mutations (should run periodically after initial import with --mode=from-tail):");
  console.log("\t\tnpm run balance:import-mutations -- --account=GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD --mode=catch-tail");
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
  case 'from-head': // Deprecated
    mode = ExtractBalanceMutationMode.FROM_HEAD;
    break;
  case 'from-tail':
    mode = ExtractBalanceMutationMode.FROM_TAIL;
    if (!argv['to-date'] || !Date.parse(argv['to-date'])) {
      error('bad or empty to-date');
    }
    toDate = new Date(argv['to-date']);
    break;
  case 'catch-tail':
    mode = ExtractBalanceMutationMode.CATCH_TAIL;
    break;
  default:
    error('Bad mode');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const extractor = app.get<BalanceMutationExtractorService>(BalanceMutationExtractorService);

  await extractor.extract({
    mode,
    toDate,
    accountId: account,
  });
}
bootstrap();
