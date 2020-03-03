import BigNumber from 'bignumber.js';
import {BalanceMutationType, OrderOption} from "./app.enums";

export interface Balance {
  id: string;
  at: Date;
  balances: [{
    asset: Asset;
    amount: BigNumber;
  }]
}

export interface BalanceMutation {
  id: string,
  cursor: string,
  accountId: string,
  asset: Asset,
  type: BalanceMutationType,
  amount: string,
  at: Date,
  createdAt: Date,
}

export interface DailyBalance {
  id: string,
  cursor: string,
  accountId: string,
  asset: Asset,
  amount: string,
  date: string,
  createdAt: Date,
}

export interface Asset {
  code: string;
  issuer: string;
}

export interface Rates {
  [code: string]: number;
}

export interface RatesLogData {
  currency: string;
  rate: number;
  timestamp: Date;
}

export interface RateHistoryData {
  rate: BigNumber;
  timestamp: string;
}

export interface RatesItem {
  rates: Rates,
  at: Date,
  createdAt: Date,
}

/**
 * Common interfaces
 */
export interface EntitiesOrder {
  field: string;
  order: OrderOption;
}

export interface GetEntitiesInputInterface {
  first?: number;
  order?: EntitiesOrder;
}

