import { Test, TestingModule } from '@nestjs/testing';
import {RatesService} from "./rates.service";
import {HttpModule} from "@nestjs/common";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from "./config/configuration";
import {TypeOrmModule} from "@nestjs/typeorm";
import {StellarFetcherService} from "./stellar-fetcher.service";
import {StellarService} from "./stellar.service";
import StellarSdk from "stellar-sdk";
import {Asset} from "stellar-base";
import {getRepository} from "typeorm";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {Observable, fromEvent, Subject} from "rxjs";
import {concatMap, finalize, map} from "rxjs/operators";
import {DailyBalance} from "./entities/daily-balance.entity";
import BigNumber from "bignumber.js";
import {MyLoggerService} from "./my-logger.service";

jest.setTimeout(1000000000);

/**
 * Test acc 1:
 */
 const pubKey1 = 'GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD';
 const secKey1 = 'SA672HKG2BBRCAVRUNKSWH2WXWNZESQSA636SQPIV5NSX35OIBJKWHXV';
/**
 * Test acc 2:
 */
 const pubKey2 = 'GBABTQAAXGLWKLJZYZTZB4NJFKWLUIXDOC4XKQSDT25FIR6ARGPOM7Y3';
 const secKey2 = 'SCLS4HRMFRBUPM3FUGGN5RTFCQD3W6BHQ77O3RJYCENYD26LZJHC4RAQ';
/**
 * Test issuer:
 */
 const pubKeyIssuer = 'GAEAOSQSDZKRPX2BRVMEBMUHD7OWDX224FETFFEZPKKHVPRMIAZZGLK5';
 const secKeyIssuer = 'SB627FE5AB6RN3SQ6ILLRI2NFM2WQIK7FGHMNVBUBALPEOO57V3Y4K7J';

describe('RatesService', () => {
  let configService: ConfigService;
  let stellarTransactionService: StellarFetcherService;
  let stellarService: StellarService;
  let logger: MyLoggerService;

  const publicKey = 'GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF';

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ConfigService, StellarFetcherService, StellarService],
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => config.get('database'),
          inject: [ConfigService],
        }),
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration]
        }),
        ConfigModule,
      ],
    }).compile();

    configService = app.get<ConfigService>(ConfigService);
    stellarTransactionService = app.get<StellarFetcherService>(StellarFetcherService);
    stellarService = app.get<StellarService>(StellarService);
    logger = new MyLoggerService('test');
  });

  describe('RatesService', () => {
    it('fetch', async () => {
      let currentDateLabel = null;
      let balances: {[asset: string]: DailyBalance} = {};
      const dumpBalances = (balances) => {
        return Promise.all(Object.keys(balances).map((asset) => {
          const balance: DailyBalance = balances[asset];
          logger.log(`DUMPED ${balance.asset} - ${balance.amount.toString()} ${balance.date}`);
          const b = new DailyBalance();
          b.date = balance.date;
          b.asset = balance.asset;
          b.amount = balance.amount;
          b.accountId = balance.accountId;
          return getRepository(DailyBalance)
            .createQueryBuilder()
            .insert()
            .into(DailyBalance)
            .values(b)
            .onConflict(`ON CONSTRAINT "UQ_accountId_asset_date" DO UPDATE SET "amount" = :amount`)
            .setParameters({amount: balance.amount.toString()})
            .execute();
        })).then(r => logger.log(r), error => logger.error(error));
      };
      if (false) {
        //await stellarTransactionService.fetchEffectsForAccount(pubKey1);
        await stellarTransactionService.fetchEffectsForAccount(pubKey2);
      }
      if (true) {
        const accountId = pubKey1;
        const last = await getRepository(BalanceMutation)
          .createQueryBuilder()
          .where('BalanceMutation.accountId = :id', {id: accountId})
          .orderBy('BalanceMutation.at', 'DESC')
          .getOne();
        await getRepository(BalanceMutation)
          .createQueryBuilder()
          .where('BalanceMutation.accountId = :id', {id: accountId})
          .orderBy('BalanceMutation.at', 'ASC')
          .stream()
          .then((stream) => {
            const subscription = fromEvent(stream, 'data')
              .pipe(
                map((o: any) => {
                  const m = new DailyBalance();
                  m.id = o.BalanceMutation_id;
                  m.accountId = o.BalanceMutation_accountId;
                  m.asset = o.BalanceMutation_asset;
                  m.amount = new BigNumber(o.BalanceMutation_amount).multipliedBy((o.BalanceMutation_type === 'credit' ? 1 : -1));
                  m.date = new Date(o.BalanceMutation_at).toISOString().slice(0,10);

                  return m;
                }),
                concatMap(async (instantBalance: DailyBalance) => {
                  if (currentDateLabel !== instantBalance.date && currentDateLabel !== null) {
                    await dumpBalances(balances);
                  }

                  currentDateLabel = instantBalance.date;

                  if (!balances[instantBalance.asset]) {
                    balances[instantBalance.asset] = instantBalance;
                  } else {
                    balances[instantBalance.asset].amount = balances[instantBalance.asset].amount.plus(instantBalance.amount);
                    balances[instantBalance.asset].date = instantBalance.date;
                  }

                  if (instantBalance.id === last.id) {
                    await dumpBalances(balances)
                      .then(() => subscription.unsubscribe());
                  }

                  return instantBalance;
                }),
              ).subscribe();
          });
      }
      if (false) {
        await stellarService.buildAndSubmitTx(
          secKey1,[
            StellarSdk.Operation.manageBuyOffer({
              selling: new StellarSdk.Asset('USD', pubKeyIssuer),
              buying: new StellarSdk.Asset('RUB', pubKeyIssuer),
              buyAmount: '2',
              price: '1',
            })
          ],
          {}
        );
        await stellarService.buildAndSubmitTx(
          secKey2,[
            StellarSdk.Operation.manageBuyOffer({
              selling: new StellarSdk.Asset('RUB', pubKeyIssuer),
              buying: new StellarSdk.Asset('USD', pubKeyIssuer),
              buyAmount: '2',
              price: '1',
            })
          ],
          {}
        );
      }

      //await stellarService.buildAndSubmitTx(
      //  secKey1,[
      //    StellarSdk.Operation.payment({
      //      asset: new StellarSdk.Asset('USD', pubKeyIssuer),
      //      amount: '3',
      //      destination: pubKey2,
      //    }),
      //  ],
      //  {}
      //);
      //await stellarService.buildAndSubmitTx(
      //  secKey2,[
      //    StellarSdk.Operation.payment({
      //      asset: new StellarSdk.Asset('RUB', pubKeyIssuer),
      //      amount: '4',
      //      destination: pubKey1,
      //    }),
      //  ],
      //  {}
      //);
    });
  });
});
