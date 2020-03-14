import StellarSdk, {ServerApi} from 'stellar-sdk';
import {from, of, Subject, Subscription} from "rxjs";
import {MyLoggerService} from "./my-logger.service";
import {ConfigService} from "@nestjs/config";
import {Injectable} from "@nestjs/common";
import {BalanceMutation} from "./entities/balance-mutation.entity";
import {BalanceMutationType, OrderOption} from "./app.enums";
import BigNumber from "bignumber.js";
import {timeoutWith} from "rxjs/operators";
import {BalanceMutationsService} from "./balance-mutations.service";
import {GetBalanceMutationsDto} from "./dto/get-balance-mutations.dto";

export enum ExtractBalanceMutationMode {
  FROM_HEAD,
  FROM_TAIL,
  CATCH_TAIL,
}

export interface ExtractBalanceMutationOptions {
  accountId: string,
  mode: ExtractBalanceMutationMode,
  toDate?: Date,
  cursor?: string,
  reset?: boolean,
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
    mode = ExtractBalanceMutationMode.FROM_HEAD,
    toDate,
    cursor,
    reset = false,
  }: ExtractBalanceMutationOptions) {
    const subject = new Subject<FetchedEffectRecord>();
    const observable = from(subject)
      .pipe(
        timeoutWith(5000, of(COMPLETED))
      );

    this.logger.log('extract(): started');

    if (reset) {
      cursor = null;
      this.logger.log(`extract(): cursor set to null`);
    }

    if (cursor && !reset) {
      this.logger.log(`extract(): used a cursor from args ${cursor}`);
    }

    let lastMutation: BalanceMutation;
    switch (mode) {
      case ExtractBalanceMutationMode.CATCH_TAIL:
        if (!toDate) {
          lastMutation = await this.balanceMutationsService.getItemsBuilder({
            accountId, order: {field: 'externalId', order: OrderOption.DESC}
          } as GetBalanceMutationsDto).getOne();
          toDate = lastMutation ? new Date(lastMutation.at.toISOString().substr(0, 10)) : null;
          if (toDate) {
            this.logger.log(`extract(): catch up till date ${lastMutation.at.toISOString()}`);
          }
        }
        break;
      case ExtractBalanceMutationMode.FROM_TAIL:
        if (!cursor && !reset) {
          lastMutation = await this.balanceMutationsService.getItemsBuilder({
            accountId, order: {field: 'externalId', order: OrderOption.ASC}
          } as GetBalanceMutationsDto).getOne();
          cursor = lastMutation ? lastMutation.externalCursor : null;
          if (cursor) {
            this.logger.log(`extract(): used a cursor stored in the last mutation found in the db  ${cursor} (at: ${lastMutation.at})`);
          }
        }
        break;
    }

    const closeStream = this.initEffectsSubject(subject, {accountId, mode, toDate, cursor});

    return new Promise((resolve, reject) => {
      // TODO: move the code below to flatMap() to guarantee the order os coming mutations
      const subscription = observable.subscribe(
        async (value) => {
          const stopExtraction = (msg: string) => {
            this.logger.log(msg);
            subscription.unsubscribe();
            closeStream();
            resolve();
          };

          if (value === COMPLETED) {
            stopExtraction('extract(): completed (timeout)');
            return;
          }

          switch (mode) {
            case ExtractBalanceMutationMode.FROM_HEAD:
              break;
            case ExtractBalanceMutationMode.FROM_TAIL:
            case ExtractBalanceMutationMode.CATCH_TAIL:
              if (new Date(value.created_at) < toDate) {
                stopExtraction(`extract(): completed (created_at < ${toDate.toISOString()})`);
                return;
              }
              break;
          }
          await this.processEffect(value);
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

  private async processEffect(value: any) {
    let balanceMutation: BalanceMutation;

    switch (value.type) {
      case 'account_credited':
        balanceMutation = new BalanceMutation();
        balanceMutation.externalId = value.id;
        balanceMutation.externalCursor = value.paging_token;
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
        balanceMutation.externalCursor = value.paging_token;
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
        balanceMutation.externalCursor = value.paging_token;
        balanceMutation.accountId = value.account;
        balanceMutation.at = new Date(value.created_at);
        balanceMutation.type = BalanceMutationType.debit;
        balanceMutation.asset = value.sold_asset_type === 'native' ? 'native' : `${value.sold_asset_code} ${value.sold_asset_issuer}`;
        balanceMutation.amount = new BigNumber(value.sold_amount);
        await this.balanceMutationsService.upsertBalanceMutation(balanceMutation);

        balanceMutation = new BalanceMutation();
        balanceMutation.externalId = value.id;
        balanceMutation.externalCursor = value.paging_token;
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
        balanceMutation.externalCursor = value.paging_token;
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
  }

  private initEffectsSubject(
    subject: Subject<FetchedEffectRecord>,
    {accountId, mode = ExtractBalanceMutationMode.FROM_HEAD, toDate, cursor}: ExtractBalanceMutationOptions,
  ) {
    if (mode === ExtractBalanceMutationMode.FROM_TAIL && !toDate) {
      throw new Error('toDate is not defined!');
    }
    const builder = this.server.effects()
      .forAccount(accountId)
      .join('transactions');

    if (cursor) {
      builder.cursor(cursor);
    }

    switch (mode) {
      case ExtractBalanceMutationMode.FROM_HEAD:
        builder.order("asc");
        break;
      case ExtractBalanceMutationMode.FROM_TAIL:
      case ExtractBalanceMutationMode.CATCH_TAIL:
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