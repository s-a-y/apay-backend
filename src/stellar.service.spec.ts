import {Test, TestingModule} from '@nestjs/testing';
import {RatesService} from "./rates.service";
import {HttpModule} from "@nestjs/common";
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from "./config/configuration";
import {TypeOrmModule} from "@nestjs/typeorm";
import {FetchEffectsMode, BalanceMutationExtractorService} from "./balance-mutation-extractor.service";
import {StellarService} from "./stellar.service";
import StellarSdk from "stellar-sdk";
import {getRepository} from "typeorm";
import {DailyBalance} from "./entities/daily-balance.entity";
import {MyLoggerService} from "./my-logger.service";
import {DailyBalanceExtractorService, ExtractDailyBalanceMode} from "./daily-balance-extractor.service";
import {DailyBalanceService} from "./daily-balance.service";

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
  let stellarTransactionService: BalanceMutationExtractorService;
  let stellarService: StellarService;
  let dailyBalanceService: DailyBalanceService;
  let logger: MyLoggerService;

  const publicKey = 'GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF';

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [ConfigService, BalanceMutationExtractorService, StellarService, DailyBalanceService],
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (config: ConfigService) => config.get('database'),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([DailyBalance]),
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration]
        }),
        ConfigModule,
      ],
    }).compile();

    configService = app.get<ConfigService>(ConfigService);
    stellarTransactionService = app.get<BalanceMutationExtractorService>(BalanceMutationExtractorService);
    stellarService = app.get<StellarService>(StellarService);
    dailyBalanceService = app.get<DailyBalanceService>(DailyBalanceService);
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
        await stellarTransactionService.extract({
          accountId: pubKey1,
          mode: FetchEffectsMode.FROM_BEGINING,
        });
        await stellarTransactionService.extract({
          accountId: pubKey2,
          mode: FetchEffectsMode.FROM_BEGINING,
          //fromDate: new Date('2020-02-10'),
        });
      }
      if (true) {
        const extractor = new DailyBalanceExtractorService(dailyBalanceService, stellarService);
        await extractor.extract({accountId: pubKey1, mode: ExtractDailyBalanceMode.LAST_FROM_DATE, fromDate: new Date('2020-02-01')});
        await extractor.extract({accountId: pubKey2, mode: ExtractDailyBalanceMode.LAST_FROM_DATE, fromDate: new Date('2020-02-01')});
        //await extractor.extract({accountId, mode: ExtractDailyBalanceMode.FROM_BEGINING});
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
