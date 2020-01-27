import BigNumber from 'bignumber.js';

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