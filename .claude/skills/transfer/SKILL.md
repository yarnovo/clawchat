---
name: transfer
description: 币安账户间资金划转
user-invocable: true
---

# 资金划转

目前未封装为 make 命令，直接调用脚本：

```bash
source .env && cd scripts && uv run python -c "
from exchange import get_exchange
exchange = get_exchange()
result = exchange.sapi_post_asset_transfer({
    'type': '<TYPE>',  # FUNDING_MAIN / MAIN_FUNDING
    'asset': '<ASSET>',
    'amount': <AMOUNT>,
})
print('划转成功:', result['tranId'])
"
```

| 方向 | type |
|------|------|
| 资金 → 现货 | FUNDING_MAIN |
| 现货 → 资金 | MAIN_FUNDING |
