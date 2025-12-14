var TAB_LOG = '交易紀錄';
var TAB_LOAN = '借貸紀錄';
var TAB_MARKET = 'MarketData';
var TAB_HISTORY = 'History';

// Action Types
var ACT_BUY = '買入';
var ACT_SELL = '賣出';
var ACT_DIVIDEND = '配息';

// Category Types
var TYPE_STOCK = '股票';
var TYPE_CRYPTO = '加密貨幣';
var TYPE_CREDIT = '信用貸款';

// Column Indices (0-based for Array access)
// Transaction Log
var IDX_LOG_DATE = 0;
var IDX_LOG_TYPE = 1;
var IDX_LOG_TICKER = 2;
var IDX_LOG_CAT = 3;
var IDX_LOG_QTY = 4;
var IDX_LOG_PRICE = 5;
var IDX_LOG_CURRENCY = 6;
var IDX_LOG_NOTE = 7;

// Loan Log
var IDX_LOAN_SOURCE = 0;
var IDX_LOAN_DATE = 1;
var IDX_LOAN_AMT = 2;
var IDX_LOAN_RATE = 3;
var IDX_LOAN_COL = 4;
var IDX_LOAN_COL_QTY = 5;
var IDX_LOAN_TYPE = 6;
var IDX_LOAN_WARN = 7;
var IDX_LOAN_LIQ = 8;
var IDX_LOAN_NOTE = 9;
var IDX_LOAN_TOTAL_TERM = 10;
var IDX_LOAN_PAID_TERM = 11;
var IDX_LOAN_MONTHLY = 12;
var IDX_LOAN_CURRENCY = 13;

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = {
        TAB_LOG, TAB_LOAN, TAB_MARKET, TAB_HISTORY,
        ACT_BUY, ACT_SELL, ACT_DIVIDEND,
        TYPE_STOCK, TYPE_CRYPTO, TYPE_CREDIT,
        IDX_LOG_DATE, IDX_LOG_TYPE, IDX_LOG_TICKER, IDX_LOG_CAT,
        IDX_LOG_QTY, IDX_LOG_PRICE, IDX_LOG_CURRENCY, IDX_LOG_NOTE,
        IDX_LOAN_SOURCE, IDX_LOAN_DATE, IDX_LOAN_AMT, IDX_LOAN_RATE,
        IDX_LOAN_COL, IDX_LOAN_COL_QTY, IDX_LOAN_TYPE,
        IDX_LOAN_WARN, IDX_LOAN_LIQ, IDX_LOAN_NOTE,
        IDX_LOAN_TOTAL_TERM, IDX_LOAN_PAID_TERM, IDX_LOAN_MONTHLY, IDX_LOAN_CURRENCY
    };
}
