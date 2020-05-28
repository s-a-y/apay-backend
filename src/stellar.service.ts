import { Injectable } from '@nestjs/common';
import {MyLoggerService} from './my-logger.service';
import { Asset, Server, Keypair, Operation, TransactionBuilder, Account, Memo, xdr, StrKey, FederationServer } from 'stellar-sdk';
import * as StellarSdk from 'stellar-sdk';
import {ConfigService} from '@nestjs/config';
import BigNumber from 'bignumber.js';
import {reduce, filter} from 'lodash';

@Injectable()
export class StellarService {
  private readonly logger = new MyLoggerService(StellarService.name);
  private server;
  private networkPassphrase: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.server = new Server(this.configService.get('stellar.horizonUrl'));
    this.networkPassphrase = this.configService.get('stellar.networkPassphrase');
  }

  async fetchBalances(accountId: string): Promise<[{ amount: BigNumber, asset: string }]> {
    const account = await this.server.loadAccount(accountId);
    return account.balances.map((line) => {
      return {
        amount: new BigNumber(line.balance),
        asset: line.asset_type === 'native' ? 'native' : `${line.asset_code} ${line.asset_issuer}`,
      };
    });
  }

  async buildAndSubmitTx(
    sourceSecretKey,
    operations: xdr.Operation[] = [],
    { memo = null, timeout = 30, sequence = null, secretKeys = []},
  ) {
    const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
    const fee = await this.server.fetchBaseFee();

    const builder = new TransactionBuilder(
      sequence
        ? new Account(sourceKeypair.publicKey(), sequence)
        : await this.server.loadAccount(sourceKeypair.publicKey()), {
      fee,
      networkPassphrase: this.networkPassphrase,
    });
    if (timeout) {
      builder.setTimeout(timeout);
    }
    if (memo) {
      builder.addMemo(memo);
    }
    operations.forEach(o => builder.addOperation(o));

    const tx = builder.build();
    tx.sign(sourceKeypair);
    secretKeys.forEach((secret) => {
      tx.sign(Keypair.fromSecret(secret));
    });
    this.logger.log(tx.toEnvelope().toXDR().toString('base64'));

    try {
      return await this.server.submitTransaction(tx);
    } catch (err) {
      this.logger.error(err);
    }
  }

  async listenToPayments(account: string, callback: (op) => Promise<any>) {
    const builder = this.server
      .payments()
      .forAccount(account)
      .cursor('now')
      .join('transactions');

    // const client = this.redisService.getClient();
    // const cursor = await client.get(`${process.env.NODE_ENV}:stellar-listener:${account}`);
    // if (cursor) {
    //   builder.cursor(cursor);
    // }

    builder.stream({
      onmessage: async (op) => {
        if (op.transaction_successful
          && op.to === account
          // not checking issuer, relying on trustlines here
        ) {
          this.logger.log(op, 'new tx');
          try {
            await callback(op);
          } catch (err) {
            this.logger.error(err);
          }
          // await client.set(`${process.env.NODE_ENV}:stellar-listener:${account}`, op.paging_token);
        }
      },
    });
  }

  loadAccount(account: string) {
    return this.server.loadAccount(account);
  }

  async calculateSell(currencyIn: string, currencyOut: string, amountOut: string) {
    const result = await this.server.strictReceivePaths(
      [new Asset(currencyIn, this.configService.get('stellar').knownIssuers[currencyIn])],
      new Asset(currencyOut, this.configService.get('stellar').knownIssuers[currencyOut]),
      amountOut,
    ).call();
    const records = filter(result.records, (record) => record.path.length <= 1);
    if (records.length > 0) {
      return reduce(records, (acc, record) => {
        return parseFloat(record.source_amount) < parseFloat(acc.source_amount) ? record : acc;
      });
    } else {
      throw new Error('Unable to find path');
    }
  }

  async calculateBuy(currencyIn: string, amountIn: string, currencyOut: string) {
    const result = await this.server.strictSendPaths(
      new Asset(currencyIn, this.configService.get('stellar').knownIssuers[currencyIn]),
      amountIn,
      [new Asset(currencyOut, this.configService.get('stellar').knownIssuers[currencyOut])],
    ).call();
    const records = filter(result.records, (record) => record.path.length <= 1);
    if (records.length > 0) {
      return reduce(records, (acc, record) => {
        return parseFloat(record.destination_amount) > parseFloat(acc.destination_amount) ? record : acc;
      });
    } else {
      throw new Error('Unable to find path');
    }
  }

  pathPaymentStrictReceive({ currencyIn, currencyOut, amountIn, amountOut, addressOut, memo, channel, sequence }) {
    const currencyInIssuer = this.configService.get('stellar').knownIssuers[currencyIn];
    const currencyOutIssuer = this.configService.get('stellar').knownIssuers[currencyOut];
    const sourceKeypair = StellarSdk.Keypair.fromSecret(this.configService.get('swapAccountSecret'));
    return this.buildAndSubmitTx(
      process.env[`STELLAR_SECRET_${channel}`],
      [StellarSdk.Operation.pathPaymentStrictReceive({
        sendAsset: new Asset(currencyIn, currencyInIssuer),
        sendMax: amountIn,
        destination: addressOut,
        destAsset: new Asset(currencyOut, currencyOutIssuer),
        destAmount: amountOut,
        source: sourceKeypair.publicKey(),
      })], {
        sequence,
        // tslint:disable-next-line:triple-equals
        memo: (memo ? (parseInt(memo, 10) == memo ? Memo.id(memo) : Memo.text(memo)) : null),
        secretKeys: [sourceKeypair.secret()],
    });
  }

  pathPaymentStrictSend({ currencyIn, currencyOut, amountIn, amountOut, addressOut, memo, channel, sequence }) {
    const currencyInIssuer = this.configService.get('stellar').knownIssuers[currencyIn];
    const currencyOutIssuer = this.configService.get('stellar').knownIssuers[currencyOut];
    const sourceKeypair = StellarSdk.Keypair.fromSecret(this.configService.get('swapAccountSecret'));
    return this.buildAndSubmitTx(
      process.env[`STELLAR_SECRET_${channel}`],
      [StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: new Asset(currencyIn, currencyInIssuer),
        sendAmount: amountIn,
        destination: addressOut,
        destAsset: new Asset(currencyOut, currencyOutIssuer),
        destMin: amountOut,
        source: sourceKeypair.publicKey(),
      })], {
        sequence,
        // tslint:disable-next-line:triple-equals
        memo: (memo ? (parseInt(memo, 10) == memo ? Memo.id(memo) : Memo.text(memo)) : null),
        secretKeys: [sourceKeypair.secret()],
    });
  }

  resolveFederatedAddress(addressOut: string): Promise<{ account_id?: string, memo?: string }> {
    return FederationServer.resolve(addressOut)
      .catch((err) => {
        return Promise.resolve({});
      });
  }
}
