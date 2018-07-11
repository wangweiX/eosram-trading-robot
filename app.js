/**
 * Constant configuration
 */
const config = require('./config/config.json');
const async = require('async');
const shell = require('shelljs');
const log4js = require('log4js');
const logger = log4js.getLogger("RAM-Robot");
const log4js_config = require('./config/log4js.json');
log4js.configure(log4js_config);

/**
 * Eos Client configuration
 */
const Eos = require('eosjs');
const eosClient = Eos(config.eos);

const unlock_wallet_cmd = `cleos --wallet-url=${config.keosd.wallet_url} wallet unlock -n ${config.wallet.wallet_name} --password ${config.wallet.password}`;

const pkill_keosd = `pkill keosd`;
shell.exec(pkill_keosd);

/**
 * start
 */
setInterval(
    function () {
        async.parallel(
            getAccountData(),
            function (err, results) {
                dealResult(results);
            });
    },
    config.interval
);

/**
 * Query eos account data
 * @returns {{account: account, quoteBalance: quoteBalance, available: available}}
 */
function getAccountData() {
    return {
        /**
         * Query my eos account data
         * @param callback
         */
        account: function (callback) {
            eosClient.getAccount({
                json: "true", code: "eosio", "account_name": config.wallet.account_name
            }).then((data) => {
                let my_eos = data.core_liquid_balance;
                let my_eos_amount = parseFloat(my_eos.split(" ")[0]);
                let my_quota_ram = data.ram_quota;
                callback(null, {
                    my_eos_amount: my_eos_amount,
                    my_quota_ram: my_quota_ram
                });
            }).catch((e) => {
                console.error(e);
            })
        },

        /**
         * Check eosio.ram account data
         * @see https://eosflare.io/account/eosio.ram
         * @param callback
         */
        quoteBalance: function (callback) {
            eosClient.getTableRows({
                json: "true", code: "eosio", scope: "eosio", table: "rammarket", limit: "10"
            }).then((data) => {
                let obj = data.rows[0];
                let quote_balance = obj.quote.balance;
                callback(null, quote_balance);
            }).catch((e) => {
                console.error(e);
            })
        },

        /**
         * Query eosio.ram memory data
         * @see https://eosflare.io/account/eosio.ram
         * @param callback
         */
        available: function (callback) {
            eosClient.getTableRows({
                json: "true", code: "eosio", scope: "eosio", table: "global"
            }).then((data) => {
                let obj = data.rows[0];
                let max_ram_size = obj.max_ram_size;
                let reserved = obj.total_ram_bytes_reserved;
                let available = (max_ram_size - reserved) / 1024; //in kb
                let percent = reserved / max_ram_size;
                callback(null, {
                    available: available,
                    reserved: reserved / 1024,
                    percent: percent
                });
            }).catch((e) => {
                console.error(e);
            })
        }
    };
}

/**
 *
 * @param results
 */
function dealResult(results) {
    let available = results.available.available;
    let percent = results.available.percent;
    let quote_balance = results.quoteBalance;
    let quote_balance_amount = parseFloat(quote_balance.split(" ")[0]);
    let price = quote_balance_amount / available;
    let my_eos_amount = results.account.my_eos_amount;
    let my_quota_ram = results.account.my_quota_ram;

    logger.info("Current RAM Price:", price, "EOS/KB"
        , ", eosio.ram total balance:", quote_balance_amount - 1000000, "EOS"
        , ", percent:", percent * 100
        , ", buy_line:", config.buy_line, "EOS/KB"
        , ", sell_line:", config.sell_line, "EOS/KB"
        , ", my_eos_amount:", my_eos_amount, "EOS"
        , ", my_quota_ram:", my_quota_ram, "Bytes"
    );

    let title = "Eos Ram Trading Robot";
    let buy_msg = `Ram Price fluctuate to ${price} EOS/KB, buy successfully!`;
    let sell_msg = `Ram Price fluctuate to ${price} EOS/KB, sell successfully!`;

    if (config.mode === "buy") {
        buy_ram(price, my_eos_amount, buy_msg, title);
    } else {
        sell_ram(price, my_quota_ram, sell_msg, title);
    }
}

/**
 * purchase eos ram
 * @param price
 * @param my_eos_amount
 * @param buy_msg
 * @param title
 */
function buy_ram(price, my_eos_amount, buy_msg, title) {
    if (price < config.buy_line && my_eos_amount > 1) {
        shell.exec(unlock_wallet_cmd);

        let buy_amount = config.buy_ram_by_eos_amount >= 0 ? config.buy_ram_by_eos_amount : (my_eos_amount - 1);

        logger.info("Reach buying price ！！! buy_amount=", buy_amount, "EOS");
        let buy_cmd = `cleos --wallet-url=${config.keosd.wallet_url} -u http://mainnet.genereos.io system buyram -j ${config.wallet.account_name} ${config.wallet.account_name} "${buy_amount} EOS"`;
        shell.exec(buy_cmd);

        let buy_notification = `osascript -e 'display notification "${buy_msg} ! !" sound name "Sound Name" with title "${title}"'`;
        shell.exec(buy_notification);

        config.mode = "sell"; // switch to sell mode
    } else {
        logger.info("Keep Waiting to buy");
    }
}


/**
 * sell eos ram
 * @param price
 * @param my_quota_ram
 * @param sell_msg
 * @param title
 */
function sell_ram(price, my_quota_ram, sell_msg, title) {
    if (price >= config.sell_line) {
        shell.exec(unlock_wallet_cmd);

        let sell_ram = my_quota_ram - config.reserve_ram; // Minimum amount of memory required to keep

        logger.info("Reach the selling price ！！! sell_ram=", sell_ram);
        let sell_cmd = `cleos --wallet-url=${config.keosd.wallet_url} -u http://mainnet.genereos.io system sellram -j ${config.wallet.account_name} ${sell_ram}`;
        shell.exec(sell_cmd);

        let sell_notification = `osascript -e 'display notification "${sell_msg} ! !" sound name "Sound Name" with title "${title}"'`;
        shell.exec(sell_notification);

        config.mode = "buy"; // switch to buy mode
    } else {
        logger.info("Keep Waiting to sell");
    }
}
