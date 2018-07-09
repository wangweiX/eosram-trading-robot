/**
 * 常量配置
 */
const config = require('./config/config.json');
const async = require('async');
const shell = require('shelljs');
const log4js = require('log4js');
const logger = log4js.getLogger("RAM-Robot");
log4js.configure({
    appenders: {cheese: {type: 'file', filename: config.log4js.log_file_path}},
    categories: {default: {appenders: ['cheese'], level: config.log4js.log_level}}
});

/**
 * eos配置
 */
const Eos = require('eosjs');
const eosClient = Eos({
    httpEndpoint: config.eos.httpEndpoint,
    chainId: config.eos.chainId,
    keyProvider: config.eos.keyProvider,
});

const unlock_wallet_cmd = `cleos wallet unlock -n ${config.wallet.wallet_name} --password ${config.wallet.password}`;

setInterval(function () {
    async.parallel({

        /**
         * 查询账户信息
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
         * 查询 eosio.ram 账户信息
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
         * 查询 eosio.ram 内存信息
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
        },
    }, function (err, results) {
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

        let buy_msg = `价格浮动至 ${price} EOS/Kib, 买入成功! `;
        let sell_msg = `价格浮动至 ${price} EOS/Kib, 卖出成功! `;
        let title = "RAM限价挂单机器人";

        if (config.mode === "buy") {
            if (price < config.buy_line && my_eos_amount > 1) {
                logger.error("达到买入线!");
                shell.exec(unlock_wallet_cmd);

                let buy_cmd = `cleos -u http://mainnet.genereos.io system buyram ${config.wallet.account_name} ${config.wallet.account_name} "${my_eos_amount - 1} EOS"`;
                shell.exec(buy_cmd);

                let buy_notification = `osascript -e 'display notification "${buy_msg} ! !" sound name "Sound Name" with title "${title}"'`;
                shell.exec(buy_notification);

                config.mode = "sell"; //转换成卖单模式
            } else {
                logger.debug("keep waiting for buy");
            }
        } else {
            if (price >= config.sell_line) {
                logger.error("达到卖入线!");
                shell.exec(unlock_wallet_cmd);

                let sell_ram = my_quota_ram - config.reserve_ram; // ram需要预留 4000 bytes内存， 不然账号就无法操作了.

                let sell_cmd = `cleos -u http://mainnet.genereos.io system sellram ${config.wallet.account_name} ${sell_ram}`;
                shell.exec(sell_cmd);

                let sell_notification = `osascript -e 'display notification "${sell_msg} ! !" sound name "Sound Name" with title "${title}"'`;
                shell.exec(sell_notification);

                config.mode = "buy"; //转换成买单模式
            } else {
                logger.debug("keep waiting for sell");
            }
        }
    });
}, config.interval);
