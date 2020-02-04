import BigNumber from 'bignumber.js';
import {OrderOption} from "./app.enums";

export interface Balance {
  id: string;
  at: Date;
  balances: [{
    asset: Asset;
    amount: BigNumber;
  }]
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
  rate: number;
  timestamp: Date;
}

export interface RatesContainer {
  rates: Rates,
  at: Date,
  fetchedAt: Date,
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

