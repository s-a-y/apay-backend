import { Injectable } from '@nestjs/common';
import {MyLoggerService} from "./my-logger.service";
import StellarSdk from "stellar-sdk";
import {ConfigService} from "@nestjs/config";
import {Operation} from "stellar-base";
import BigNumber from "bignumber.js";

@Injectable()
export class StellarService {
  private readonly logger = new MyLoggerService(StellarService.name);
  private server;
  private networkPassphrase: string;
  constructor(
    private readonly configService: ConfigService,
  ) {
    this.server = new StellarSdk.Server(this.configService.get('stellar.horizonUrl'));
    this.networkPassphrase = this.configService.get('stellar.networkPassphrase');
  }

  async fetchBalances(accountId: string): Promise<[{ amount: BigNumber, asset: string }]> {
    const account = await this.server.loadAccount(accountId);
    return account.balances.map((line) => {
      return {
        amount: new BigNumber(line.balance),
        asset: line.asset_type === 'native' ? 'native' : `${line.asset_code} ${line.asset_issuer}`,
      };
    })
  }

  async buildAndSubmitTx(sourceSecretKey, operations: Operation[] = [], {memo = null, timeout = 30, secretKeys = []}) {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const account = await this.server.loadAccount(sourceKeypair.publicKey());
    const fee = await this.server.fetchBaseFee();

    const builder = new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase: this.networkPassphrase,
    });
    if (timeout) {
      builder.setTimeout(timeout)
    }
    if (memo) {
      builder.addMemo(memo)
    }
    operations.forEach(o => builder.addOperation(o));

    const tx = builder.build();
    tx.sign(sourceKeypair);
    secretKeys.forEach((secret) => {
      tx.sign(StellarSdk.Keypair.fromSecret(secret))
    });

    return await this.server.submitTransaction(tx);
  }
}
