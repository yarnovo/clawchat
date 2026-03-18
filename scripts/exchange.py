"""共享的 exchange 实例"""

import os
import ccxt

TESTNET = os.environ.get('BINANCE_TESTNET', '').lower() in ('1', 'true', 'yes')


def get_exchange():
    if TESTNET:
        ex = ccxt.binance({
            'apiKey': os.environ.get('BINANCE_TESTNET_API_KEY'),
            'secret': os.environ.get('BINANCE_TESTNET_API_SECRET'),
            'options': {
                'defaultType': 'spot',
                'fetchMarkets': ['spot'],
            },
        })
        ex.set_sandbox_mode(True)
        return ex
    return ccxt.binance({
        'apiKey': os.environ.get('BINANCE_API_KEY'),
        'secret': os.environ.get('BINANCE_API_SECRET'),
        'options': {
            'defaultType': 'spot',
            'fetchMarkets': ['spot'],
        },
    })
