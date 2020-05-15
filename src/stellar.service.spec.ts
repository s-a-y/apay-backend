import {Test, TestingModule} from '@nestjs/testing';
import {HttpModule} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import configuration from './config/configuration';
import {StellarService} from './stellar.service';
import {MyLoggerService} from './my-logger.service';

process.env.TZ = 'UTC';

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

describe('StellarService', () => {
  let configService: ConfigService;
  let stellarService: StellarService;
  let logger: MyLoggerService;

  const publicKey = 'GAUTUYY2THLF7SGITDFMXJVYH3LHDSMGEAKSBU267M2K7A3W543CKUEF';

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        StellarService,
      ],
      imports: [
        HttpModule,
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        ConfigModule,
      ],
    }).compile();

    configService = app.get<ConfigService>(ConfigService);
    stellarService = app.get<StellarService>(StellarService);
    logger = new MyLoggerService('test');
  });

  it('federationResolve works for Bitcoin address', async () => {
    expect(await stellarService.resolveFederatedAddress('1Le4faGsbRUMynPjFZL3tZCmksnGXzmaTn'))
      .toEqual({});
  });

  it('federationResolve works for Stellar address', async () => {
    expect(await stellarService.resolveFederatedAddress('GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD'))
      .toEqual({
        account_id: 'GD24DA265PCBCIFXMRCIUSTPXHD4CMWVWSMQN6SJG7NJ6OSHDKTHZJVD',
      });
  });

  it('federationResolve works for federated address', async () => {
    expect(await stellarService.resolveFederatedAddress('umbrel*stellarx.com'))
      .toEqual({
        account_id: 'GBQU72QCGVMMIUJ4TR72ORU2DERDTWGCD3HTWYKUKB2CTI5ANPUBYLUT',
        stellar_address: 'umbrel*stellarx.com',
      });
  });
});
