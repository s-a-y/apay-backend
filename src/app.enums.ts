export enum SupportedCurrency {
    BTC = 'BTC',
    XDR = 'XDR',
    XLM = 'XLM',
    BCH = 'BCH',
    ETH = 'ETH',
    LTC = 'LTC',
    BAT = 'BAT',
    KIN = 'KIN',
    LINK = 'LINK',
    MTL = 'MTL',
    OMG = 'OMG',
    REP = 'REP',
    SALT = 'SALT',
    ZRX = 'ZRX'
}

/**
 * Common enums
 */
export enum JobOperation {
    remove = 'remove',
    retry = 'retry',
    discard = 'discard',
    promote = 'promote',
}

export enum JobState {
    waiting = 'waiting',
    active = 'active',
    delayed = 'delayed',
    completed = 'completed',
    failed = 'failed',
}
export enum OrderOption {
    ASC = "ASC",
    DESC = "DESC"
}

export enum BalanceMutationType {
    debit = 'debit',
    credit = 'credit',
}

export enum EntityField {
    cursor = 'cursor',
}
