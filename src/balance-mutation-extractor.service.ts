import StellarSdk, {ServerApi} from 'stellar-sdk';
import {from, of, Subject} from "rxjs";
import {MyLoggerService} from "./my-logger.service";
import {ConfigService} from "@nestjs/config";
import {Injectable} from "@nestjs/common";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {BalanceMutationType} from "./app.enums";
import BigNumber from "bignumber.js";
import {timeoutWith} from "rxjs/operators";
import {BalanceMutationsService} from "./balance-mutations.service";

export enum ExtractBalanceMutationMode {
  FROM_BEGINING,
  LAST_FROM_DATE,
}

export interface ExtractBalanceMutationOptions {
  accountId: string,
  mode: ExtractBalanceMutationMode,
  fromDate?: Date,
  cursor?: string,
  jobId?: string,
}

type FetchedEffectRecord = ServerApi.EffectRecord | null;
const COMPLETED = null;

@Injectable()
export class BalanceMutationExtractorService {
  private readonly logger = new MyLoggerService(BalanceMutationExtractorService.name);
  private server;
  constructor(
    private readonly configService: ConfigService,
    private readonly balanceMutationsService: BalanceMutationsService,
  ) {

    this.server = new StellarSdk.Server(this.configService.get('stellar.horizonUrl'));
  }

  async extract({
    accountId,
    mode = ExtractBalanceMutationMode.FROM_BEGINING,
    fromDate,
    cursor,
    jobId,
  }: ExtractBalanceMutationOptions) {
    let counter = 0;
    const subject = new Subject<FetchedEffectRecord>();
    const observable = from(subject)
      .pipe(
        timeoutWith(5000, of(COMPLETED))
      );

    this.logger.log('extract(): started');

    const closeStream = this.initEffectsSubject(subject, {accountId, mode, fromDate, cursor, jobId});

    return new Promise((resolve, reject) => {
      const subscription = observable.subscribe(
        async (value) => {
          let balanceMutation: BalanceMutation;

          if (value === COMPLETED) {
            this.logger.log('extract(): completed (timeout)');
            subscription.unsubscribe();
            closeStream();
            resolve();
            return;
          }

          switch (mode) {
            case ExtractBalanceMutationMode.FROM_BEGINING:
              break;
            case ExtractBalanceMutationMode.LAST_FROM_DATE:
              if (new Date(value.created_at) < fromDate) {
                this.logger.log('extract(): completed');
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
              await this.balanceMutationsService.upsertBalanceMutation(balanceMutation);
              break;
            case 'account_debited':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.debit;
              balanceMutation.asset = value.asset_type === 'native' ? 'native' : `${value.asset_code} ${value.asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.amount);
              await this.balanceMutationsService.upsertBalanceMutation(balanceMutation);
              break;
            case 'trade':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.debit;
              balanceMutation.asset = value.sold_asset_type === 'native' ? 'native' : `${value.sold_asset_code} ${value.sold_asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.sold_amount);
              await this.balanceMutationsService.upsertBalanceMutation(balanceMutation);

              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.credit;
              balanceMutation.asset = value.bought_asset_type === 'native' ? 'native' : `${value.bought_asset_code} ${value.bought_asset_issuer}`;
              balanceMutation.amount = new BigNumber(value.bought_amount);
              await this.balanceMutationsService.upsertBalanceMutation(balanceMutation);
              break;
            case 'account_created':
              balanceMutation = new BalanceMutation();
              balanceMutation.externalId = value.id;
              balanceMutation.accountId = value.account;
              balanceMutation.at = new Date(value.created_at);
              balanceMutation.type = BalanceMutationType.credit;
              balanceMutation.asset = 'native';
              balanceMutation.amount = new BigNumber(value.starting_balance);
              await this.balanceMutationsService.upsertBalanceMutation(balanceMutation);
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

  initEffectsSubject(
    subject: Subject<FetchedEffectRecord>,
    {accountId, mode = ExtractBalanceMutationMode.FROM_BEGINING, fromDate, cursor}: ExtractBalanceMutationOptions,
  ) {
    if (mode === ExtractBalanceMutationMode.LAST_FROM_DATE && !fromDate) {
      throw new Error('fromDate is not defined!');
    }
    const builder = this.server.effects()
      .forAccount(accountId)
      .order("asc")
      .join('transactions');

    if (cursor) {
      builder.cursor(cursor);
    }

    switch (mode) {
      case ExtractBalanceMutationMode.FROM_BEGINING:
        builder.order("asc");
        break;
      case ExtractBalanceMutationMode.LAST_FROM_DATE:
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