import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb, visibleForTesting;
import 'package:web_socket_channel/web_socket_channel.dart';

/// Global WebSocket service — singleton, connects once after login.
class WsService {
  WsService._();
  static final instance = WsService._();

  WebSocketChannel? _channel;
  final _controller = StreamController<Map<String, dynamic>>.broadcast();
  Timer? _reconnectTimer;
  String? _url;

  /// Stream of parsed JSON messages from server.
  Stream<Map<String, dynamic>> get messages => _controller.stream;

  /// Connect to the im-server WebSocket.
  /// [baseUrl] should be the HTTP origin (e.g. "http://localhost:3000").
  /// On web with empty baseUrl, uses the current page origin.
  void connect(String baseUrl, String token) {
    String wsUrl;
    if (baseUrl.isEmpty && kIsWeb) {
      // Web: derive WS URL from current page origin
      // Uri.base gives us http://localhost:5555/
      final origin = Uri.base;
      final scheme = origin.scheme == 'https' ? 'wss' : 'ws';
      wsUrl = '$scheme://${origin.host}:${origin.port}';
    } else {
      wsUrl = baseUrl
          .replaceFirst('https://', 'wss://')
          .replaceFirst('http://', 'ws://');
    }
    _url = '$wsUrl/v1/im/ws?token=$token';
    _doConnect();
  }

  void _doConnect() {
    if (_url == null) return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_url!));
      _channel!.stream.listen(
        (data) {
          try {
            final msg = jsonDecode(data as String) as Map<String, dynamic>;
            _controller.add(msg);
          } catch (_) {}
        },
        onDone: _scheduleReconnect,
        onError: (_) => _scheduleReconnect(),
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), _doConnect);
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _url = null;
  }

  @visibleForTesting
  void addTestEvent(Map<String, dynamic> event) {
    _controller.add(event);
  }
}
