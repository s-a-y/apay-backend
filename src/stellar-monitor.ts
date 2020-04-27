import { NestFactory } from '@nestjs/core';
import { SwapService } from './swap/swap.service';
import { Tx } from './swap/tx.entity';
import { TxService } from './swap/tx.service';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { AppModule } from './app.module';
import { BigNumber } from 'bignumber.js';

/**
 * Separate process, that sends notifications about incoming txns
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService>(ConfigService);
  const stellarService = app.get<StellarService>(StellarService);
  const swapService = app.get<SwapService>(SwapService);
  const txService = app.get<TxService>(TxService);

  await stellarService.listenToPayments(configService.get('swapAccount'), async (op) => {
    const tx = await op.transaction();
    if (tx.memo && parseInt(tx.memo, 10)) {
      const swap = await swapService.get(tx.memo);
      if (swap) {
        try {
          const swapTx = await txService.save({
            currencyIn: swap.currencyIn,
            currencyOut: swap.currencyOut,
            addressOut: swap.addressOut,
            amountIn: new BigNumber(op.amount),
            txIn: tx.id,
            txInIndex: (new BigNumber(op.paging_token)).minus(tx.paging_token).minus(1).toNumber(),
            addressFrom: op.from,
            swap,
          } as Tx);
          await txService.enqueue(swapTx);
        } catch (err) {
          if (err.message.includes('duplicate')) {
            // do nothing
          } else {
            throw err;
          }
        }
      }
    }
  });
}

bootstrap();
