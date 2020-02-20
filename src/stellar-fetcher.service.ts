import StellarSdk, {ServerApi} from 'stellar-sdk';
import {from, of, Subject} from "rxjs";
import {MyLoggerService} from "./my-logger.service";
import {ConfigService} from "@nestjs/config";
import {Injectable} from "@nestjs/common";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {BalanceMutationType} from "./app.enums";
import BigNumber from "bignumber.js";
import {getRepository} from "typeorm";
import {timeoutWith} from "rxjs/operators";

export enum FetchEffectsMode {
  FROM_BEGINING,
  LAST_FROM_DATE,
}

export interface FetchEffectsOptions {
  accountId: string,
  mode: FetchEffectsMode,
  fromDate?: Date,
}

type FetchedEffectRecord = ServerApi.EffectRecord | null;
const COMPLETED = null;

@Injectable()
export class StellarFetcherService {
  private readonly logger = new MyLoggerService(StellarFetcherService.name);
  private server;
  constructor(
    private readonly configService: ConfigService,
  ) {

    this.server = new StellarSdk.Server(this.configService.get('stellar.horizonUrl'));
  }

  async fetchEffectsForAccount({accountId, mode = FetchEffectsMode.FROM_BEGINING, fromDate}: FetchEffectsOptions) {
    const subject = new Subject<FetchedEffectRecord>();
    const observable = from(subject)
      .pipe(
        timeoutWith(5000, of(COMPLETED))
      );

    const closeStream = this.initEffectsSubject(subject, {accountId, mode, fromDate});

    return new Promise((resolve, reject) => {
      const subscription = observable.subscribe(
        async (value) => {
          let balanceMutation: BalanceMutation;

          if (value === COMPLETED) {
            subscription.unsubscribe();
            closeStream();
            resolve();
            return;
          }

          switch (mode) {
            case FetchEffectsMode.FROM_BEGINING:
              break;
            case FetchEffectsMode.LAST_FROM_DATE:
              this.logger.log(value.created_at);
              if (new Date(value.created_at) < fromDate) {
                subscription.unsubscribe();
                closeStream();
                resolve();
                return;
              }
              break;
          }
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

  initEffectsSubject(
    subject: Subject<FetchedEffectRecord>,
    {accountId, mode = FetchEffectsMode.FROM_BEGINING, fromDate}: FetchEffectsOptions,
  ) {
    if (mode === FetchEffectsMode.LAST_FROM_DATE && !fromDate) {
      throw new Error('fromDate is not defined!');
    }
    const builder = this.server.effects()
      .forAccount(accountId)
      .order("asc")
      .join('transactions');

    switch (mode) {
      case FetchEffectsMode.FROM_BEGINING:
        builder.order("asc");
        break;
      case FetchEffectsMode.LAST_FROM_DATE:
        builder.order("desc");
        break;
    }

    return builder.stream({
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