---
name: scan
description: 扫描高波动率币种 — 选品/选币
user-invocable: true
---

# 选币扫描

## 执行

```bash
source .env && cd scripts && uv run python -c "
from exchange import get_exchange

exchange = get_exchange()
tickers = exchange.fetch_tickers()

coins = []
for symbol, t in tickers.items():
    if not symbol.endswith('/USDT'):
        continue
    vol = t.get('quoteVolume') or 0
    price = t.get('last') or 0
    high = t.get('high') or 0
    low = t.get('low') or 0
    if vol < 1_000_000 or price == 0 or low == 0:
        continue
    amplitude = (high - low) / low * 100
    coins.append({
        'symbol': symbol, 'price': price, 'pct': t.get('percentage') or 0,
        'amplitude': amplitude, 'vol': vol,
    })

coins.sort(key=lambda x: x['amplitude'], reverse=True)

print(f'  {\"交易对\":<14} {\"价格\":>12} {\"24h涨跌\":>10} {\"24h振幅\":>10} {\"成交额\":>12}')
print(f'  {\"─\"*62}')
for c in coins[:20]:
    vol_m = c['vol'] / 1e6
    print(f'  {c[\"symbol\"]:<14} {c[\"price\"]:>12.4f} {c[\"pct\"]:>+9.2f}% {c[\"amplitude\"]:>9.2f}% {vol_m:>10.1f}M')
"
```
