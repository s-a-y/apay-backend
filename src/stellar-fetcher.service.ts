import StellarSdk, {ServerApi} from 'stellar-sdk';
import StellarBase from 'stellar-base';
import {Subject} from "rxjs";
import {MyLoggerService} from "./my-logger.service";
import {ConfigService} from "@nestjs/config";
import {Injectable} from "@nestjs/common";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {BalanceMutationType} from "./app.enums";
import BigNumber from "bignumber.js";
import {getRepository} from "typeorm";

@Injectable()
export class StellarFetcherService {
  private readonly logger = new MyLoggerService(StellarFetcherService.name);
  private server;
  constructor(
    private readonly configService: ConfigService,
  ) {
    this.server = new StellarSdk.Server(this.configService.get('stellar.horizonUrl'));
  }

  async fetchEffectsForAccount(accountId: string, cursor = '0', limit = 200) {
    const subject = new Subject<ServerApi.EffectRecord>();

    this.initEffectsSubject(subject, accountId, cursor, limit);

    return new Promise((resolve, reject) => {
      subject.subscribe(
        async (value) => {
          //console.log(value);
          let balanceMutation: BalanceMutation;
          switch (value.type) {
            case 'account_credited':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.credit;
              balanceMutation.asset = value.asset_type === 'native' ? 'native' : `${value.asset_code} ${value.asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.amount);
              await this.saveBalanceMutationSafely(balanceMutation);
              break;
            case 'account_debited':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.debit;
              balanceMutation.asset = value.asset_type === 'native' ? 'native' : `${value.asset_code} ${value.asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.amount);
              await this.saveBalanceMutationSafely(balanceMutation);
              break;
            case 'trade':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.debit;
              balanceMutation.asset = value.sold_asset_type === 'native' ? 'native' : `${value.sold_asset_code} ${value.sold_asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.sold_amount);
              await this.saveBalanceMutationSafely(balanceMutation);

              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.credit;
              balanceMutation.asset = value.bought_asset_type === 'native' ? 'native' : `${value.sold_asset_code} ${value.sold_asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.bought_amount);
              await this.saveBalanceMutationSafely(balanceMutation);
              break;
            case 'account_created':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.credit;
              balanceMutation.asset = 'native';
              balanceMutation.amount = new BigNumber(value.starting_balance);
              await this.saveBalanceMutationSafely(balanceMutation);
              break;
            default:
              this.logger.warn({message: 'Effect type is not supported', type: value.type});
          }
        },
        (error) => {
          console.log(error);
          //reject(error);
        },
        () => {
          console.log('complete');
          resolve();
        }
      );
    });
  }

  async saveBalanceMutationSafely(balanceMutation: BalanceMutation) {
    return getRepository(BalanceMutation).save(balanceMutation)
      .catch((error) => {
        if (error.message.includes('duplicate key value violates unique constraint "UQ_accountId_type_externalId')) {
          console.log('Already saved');
        } else {
          throw error;
        }
      });
  }


  async fetchTransactionsForAccount(accountId: string, cursor: string = '0') {
    const subject = new Subject<ServerApi.TransactionRecord>();

    this.initTransactionsSubject(subject, accountId, cursor);

    return new Promise((resolve, reject) => {
      subject.subscribe(
        (value) => {
          const tx = new StellarBase.Transaction(value.envelope_xdr);
          const operations = tx.operations.forEach((operation) => {
            return [
              'createAccount',
              'payment',
              //'pathPaymentStrictReceive',
              //'pathPaymentStrictSend',
              //'createPassiveSellOffer',
              //'manageSellOffer',
              //'manageBuyOffer',
              //'setOptions',
              //'changeTrust',
              //'allowTrust',
              //'accountMerge',
              //'inflation',
              //'manageData',
              //'bumpSequence',
            ].includes(operation.type);
          });
          //this.logger.log(value);
          // @ts-ignore
        },
        (error) => {
          console.log(error);
          //reject(error);
        },
        () => {
          console.log('complete');
          resolve();
        }
      );
    });
  }

  initTransactionsSubject(subject: Subject<ServerApi.TransactionRecord>, accountId: string, cursor: string) {
    const self = this;
    return this.server.transactions()
      .forAccount(accountId)
      //.cursor(cursor)
      .order("asc")
      .limit(5)
      .join('transactions')
      .stream({
        onmessage(value) {
          subject.next(value);
        },
        onerror(event) {
          //subject.error(event);
        },
        //reconnectTimeout: 1000
      })
  }

  initEffectsSubject(subject: Subject<ServerApi.EffectRecord>, accountId: string, cursor: string, limit: number) {
    const self = this;
    return this.server.effects()
      .forAccount(accountId)
      //.cursor(cursor)
      .order("asc")
      .limit(limit)
      .join('transactions')
      .stream({
        onmessage(value) {
          subject.next(value);
        },
        onerror(event) {
          //subject.error(event);
        },
        //reconnectTimeout: 1000
      })
  }
}