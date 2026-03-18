"""共享的 exchange 实例"""

import os
import ccxt


def get_exchange():
    return ccxt.binance({
        'apiKey': os.environ.get('BINANCE_API_KEY'),
        'secret': os.environ.get('BINANCE_API_SECRET'),
        'options': {
            'defaultType': 'spot',
            'fetchMarkets': ['spot'],
        },
    })
