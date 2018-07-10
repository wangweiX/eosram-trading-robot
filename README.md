# EOS RAM 交易机器人🤖

> 本教程受此文章启发：https://bihu.com/article/854060



## 环境准备

#### 系统 

- macOS high Sierra

#### 安装Node

- 版本：`v10.6.0`
- 指南：https://wangwei.one/posts/b1fcd8d6.html

#### 安装eos

- 指南：https://wangwei.one/posts/181733fc.html

#### 导入钱包

- 指南：https://developers.eos.io/eosio-nodeos/docs/learn-about-wallets-keys-and-accounts-with-cleos



## 运行程序

#### 下载代码

```powershell
$ git clone git@github.com:wangweiX/eosram-trading-robot.git
```

#### 安装依赖包

```powershell
 $ cd eosram-trading-robot
 $ npm install
 $ npm install -g pm2
```

#### 配置参数
配置文件 `/config/config.json`

```json
{
  "mode": "buy",  // 配置程序启动后的初始交易模式。buy：买入 sell：卖出
  "buy_line": 0.40, // 配置买入价位，单位：EOS/KB
  "sell_line": 0.49, // 配置卖出价位，单位：EOS/KB
  "reserve_ram": 4000, // 配置卖出时账户保留内存数量，单位：bytes(默认即可)
  "eos": {
    "broadcast": true,
    "chainId": "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
    "debug": true,
    "expireInSeconds": 60,
    "httpEndpoint": "http://api.eosnewyork.io",
    "keyProvider": "", // 配置私钥
    "sign": true,
    "verbose": false
  },
  "interval": 500,
  "log4js": {
    "log_file_path": "logs/eosram-trading.log",
    "log_level": "debug"
  },
  "wallet": {
    "account_name": "", // 配置EOS账户名
    "password": "", // 配置本地钱包密码
    "wallet_name": "" // 配置本地钱包名称
  }
}
```

#### 启动程序

```powershell
$ pm2 start app.js
```

#### 重启程序

```powershell
$ pm2 restart app.js
```

#### 终止程序

```powershell
$ pm2 kill
```



#### 日志输出

![running_log](https://img.i7years.com/blog/but_ram.png)



#### 错误日志

> 程序在运行的过程中，会出现以下错误日志，属于正常现象，可以忽略。

![error_log](https://img.i7years.com/blog/error_log.png)



#### 交易通知

![buy_ram_notice](https://img.i7years.com/blog/buy_ram_notice.png)




## 注意事项

- 由于该程序一直在买卖模式间切换，强烈建议**新开一个EOS账户**来配置程序，用作专门的机器人交易账户，以免主账号EOS被一次性买入，造成不必要的经济损失。

- 建议专用的机器人交易账号的EOS数量为主账号EOS数量的1/10，看个人风险承受能力。

- 请在可信任设备上部署，一般为自己的电脑，绝对不要部署到阿里云、腾讯云等公有云上。

- 行情软件推荐：http://southex.com/

  

## 免责声明

- 本程序完全开源，由于自身操作不当造成的任何EOS损失，均与本人无关，请妥善操作。



## 最后

- 如果对你有所帮助，请给个 Star :stuck_out_tongue: :blush:
- 如果帮你赚到了不少的EOS，请犒劳犒劳我。我的EOS账户：`gi2dknbuhage`   :kissing_heart:

