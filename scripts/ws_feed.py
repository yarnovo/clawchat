#!/usr/bin/env python3
"""币安 WebSocket 实时行情数据层

事件驱动架构，支持多交易对订阅 ticker/kline/depth 流，断线自动重连。
基于 binance-connector 官方 SDK。

用法:
    # 作为模块使用
    from ws_feed import WsFeed

    def my_handler(symbol, price, volume):
        print(f"{symbol} => {price} vol={volume}")

    feed = WsFeed(symbols=["BTCUSDT", "ETHUSDT"])
    feed.on_tick(my_handler)
    feed.start()

    # 命令行直接运行
    python ws_feed.py BTCUSDT ETHUSDT SOLUSDT
"""

import json
import logging
import sys
import threading
import time
from datetime import datetime
from typing import Callable, Optional

from binance.websocket.spot.websocket_stream import SpotWebsocketStreamClient

logger = logging.getLogger(__name__)

# 回调类型: (symbol: str, price: float, volume: float) -> None
TickCallback = Callable[[str, float, float], None]


class WsFeed:
    """币安 WebSocket 实时行情 Feed

    支持三种数据流:
    - ticker: 24h 滚动价格统计（默认开启）
    - kline:  K 线数据
    - depth:  深度快照

    断线自动重连，支持多交易对。
    """

    def __init__(
        self,
        symbols: list[str],
        streams: Optional[list[str]] = None,
        kline_interval: str = "1m",
        depth_level: int = 5,
        reconnect_delay: float = 3.0,
        max_reconnect_delay: float = 60.0,
    ):
        """
        Args:
            symbols: 交易对列表，如 ["BTCUSDT", "ETHUSDT"]
            streams: 要订阅的流类型列表，可选 "ticker", "kline", "depth"。默认 ["ticker"]
            kline_interval: K 线周期，默认 "1m"
            depth_level: 深度档位，默认 5
            reconnect_delay: 初始重连延迟（秒）
            max_reconnect_delay: 最大重连延迟（秒）
        """
        self.symbols = [s.lower() for s in symbols]
        self.streams = streams or ["ticker"]
        self.kline_interval = kline_interval
        self.depth_level = depth_level
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_delay = max_reconnect_delay

        self._tick_callbacks: list[TickCallback] = []
        self._raw_callbacks: list[Callable[[dict], None]] = []
        self._client: Optional[SpotWebsocketStreamClient] = None
        self._running = False
        self._lock = threading.Lock()
        self._current_delay = reconnect_delay

    # ── 回调注册 ──────────────────────────────────────────────

    def on_tick(self, callback: TickCallback):
        """注册 tick 回调: callback(symbol, price, volume)"""
        self._tick_callbacks.append(callback)
        return self

    def on_raw(self, callback: Callable[[dict], None]):
        """注册原始消息回调: callback(parsed_json)"""
        self._raw_callbacks.append(callback)
        return self

    # ── 生命周期 ──────────────────────────────────────────────

    def start(self):
        """启动 WebSocket 连接并订阅数据流"""
        self._running = True
        self._connect()
        logger.info("WsFeed 已启动, 交易对=%s, 流=%s", self.symbols, self.streams)

    def stop(self):
        """停止 WebSocket 连接"""
        self._running = False
        if self._client:
            try:
                self._client.stop()
            except Exception:
                pass
        logger.info("WsFeed 已停止")

    # ── 内部实现 ──────────────────────────────────────────────

    def _connect(self):
        """创建 WebSocket 客户端并订阅流"""
        with self._lock:
            # 关闭旧连接
            if self._client:
                try:
                    self._client.stop()
                except Exception:
                    pass

            self._client = SpotWebsocketStreamClient(
                on_message=self._on_message,
                on_open=self._on_open,
                on_close=self._on_close,
                on_error=self._on_error,
                is_combined=True,
            )

            # 订阅各流
            for symbol in self.symbols:
                if "ticker" in self.streams:
                    self._client.ticker(symbol=symbol)
                if "kline" in self.streams:
                    self._client.kline(symbol=symbol, interval=self.kline_interval)
                if "depth" in self.streams:
                    self._client.partial_book_depth(
                        symbol=symbol, level=self.depth_level, speed=1000
                    )

    def _on_open(self, _):
        self._current_delay = self.reconnect_delay
        logger.info("WebSocket 连接已建立")

    def _on_close(self, _):
        logger.warning("WebSocket 连接已关闭")
        if self._running:
            self._schedule_reconnect()

    def _on_error(self, _, error):
        logger.error("WebSocket 错误: %s", error)
        if self._running:
            self._schedule_reconnect()

    def _schedule_reconnect(self):
        """指数退避重连"""
        delay = self._current_delay
        self._current_delay = min(delay * 2, self.max_reconnect_delay)
        logger.info("将在 %.1f 秒后重连...", delay)

        def reconnect():
            time.sleep(delay)
            if self._running:
                logger.info("正在重连...")
                try:
                    self._connect()
                except Exception as e:
                    logger.error("重连失败: %s", e)
                    self._schedule_reconnect()

        t = threading.Thread(target=reconnect, daemon=True)
        t.start()

    def _on_message(self, _, raw_message):
        """处理收到的 WebSocket 消息"""
        try:
            data = json.loads(raw_message)
        except (json.JSONDecodeError, TypeError):
            return

        # 组合流格式: {"stream": "...", "data": {...}}
        if "stream" in data and "data" in data:
            payload = data["data"]
        else:
            payload = data

        # 触发原始回调
        for cb in self._raw_callbacks:
            try:
                cb(payload)
            except Exception as e:
                logger.error("raw 回调异常: %s", e)

        # 解析并触发 tick 回调
        self._dispatch_tick(payload)

    def _dispatch_tick(self, payload: dict):
        """从不同流类型中提取 (symbol, price, volume) 并触发 on_tick"""
        event_type = payload.get("e")
        symbol = price = volume = None

        if event_type == "24hrTicker":
            # ticker 流
            symbol = payload.get("s")
            price = float(payload.get("c", 0))  # 最新价
            volume = float(payload.get("q", 0))  # 24h 成交额 (USDT)

        elif event_type == "kline":
            # K 线流
            k = payload.get("k", {})
            symbol = k.get("s")
            price = float(k.get("c", 0))  # 收盘价
            volume = float(k.get("q", 0))  # 成交额

        # depth 流不包含 price/volume，跳过 tick 回调

        if symbol and price and self._tick_callbacks:
            for cb in self._tick_callbacks:
                try:
                    cb(symbol, price, volume or 0.0)
                except Exception as e:
                    logger.error("tick 回调异常: %s", e)


# ── CLI 入口 ──────────────────────────────────────────────────


def _default_tick_handler(symbol: str, price: float, volume: float):
    """默认 tick 处理器：打印到终端"""
    ts = datetime.now().strftime("%H:%M:%S")
    if price >= 1:
        price_str = f"{price:,.2f}"
    else:
        price_str = f"{price:.6f}"
    vol_str = f"{volume / 1e6:.1f}M" if volume >= 1e6 else f"{volume:,.0f}"
    print(f"  [{ts}] {symbol:<12} {price_str:>14}  vol={vol_str}")


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    symbols = sys.argv[1:] if len(sys.argv) > 1 else ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    symbols = [s.upper() for s in symbols]

    print(f"\n  币安 WebSocket 实时行情")
    print(f"  交易对: {', '.join(symbols)}")
    print(f"  {'='*50}")

    feed = WsFeed(symbols=symbols, streams=["ticker"])
    feed.on_tick(_default_tick_handler)
    feed.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n  正在断开连接...")
        feed.stop()
        print("  已退出")


if __name__ == "__main__":
    main()
