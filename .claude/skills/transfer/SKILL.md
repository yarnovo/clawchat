---
name: transfer
description: 币安账户间资金划转（资金账户/现货账户/子账户）
user-invocable: true
---

# 资金划转

在币安各账户之间划转资产。

## 常用划转类型

| 方向 | type 参数 |
|------|-----------|
| 资金 → 现货 | `FUNDING_MAIN` |
| 现货 → 资金 | `MAIN_FUNDING` |
| 现货 → 合约 | `MAIN_UMFUTURE` |
| 合约 → 现货 | `UMFUTURE_MAIN` |

## 执行

```bash
source .env && uv run python -c "
import ccxt, os
exchange = ccxt.binance({
    'apiKey': os.environ['BINANCE_API_KEY'],
    'secret': os.environ['BINANCE_API_SECRET'],
    'options': {'defaultType': 'spot', 'fetchMarkets': ['spot']},
})
result = exchange.sapi_post_asset_transfer({
    'type': '<TYPE>',
    'asset': '<ASSET>',
    'amount': <AMOUNT>,
})
print('划转成功, tranId:', result['tranId'])
"
```

## 划转到子账户

```bash
source .env && uv run python -c "
import ccxt, os
exchange = ccxt.binance({
    'apiKey': os.environ['BINANCE_API_KEY'],
    'secret': os.environ['BINANCE_API_SECRET'],
    'options': {'defaultType': 'spot', 'fetchMarkets': ['spot']},
})
result = exchange.sapi_post_sub_account_transfer({
    'toEmail': '<SUB_EMAIL>',
    'asset': '<ASSET>',
    'amount': <AMOUNT>,
})
print('划转成功:', result)
"
```
