import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/services/auth_service.dart';
import 'package:clawchat/services/api_client.dart';
import 'package:clawchat/services/service_provider.dart';
import 'package:clawchat/pages/profile/agent_settings_page.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

http.Response _jsonResponse(Object data, int statusCode) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(data)),
    statusCode,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

Widget _buildTestApp({
  required http.Client httpClient,
  Map<String, dynamic>? agent,
}) {
  final authService = AuthService(store: InMemoryTokenStore());
  authService.saveLogin(token: 'test-token', name: 'Test', email: 't@t.com');
  final apiClient = ApiClient(
    baseUrl: 'http://localhost:3000',
    authService: authService,
    httpClient: httpClient,
  );

  final testAgent = agent ?? {
    'id': 'agent-1',
    'name': '测试Agent',
    'avatar': '🤖',
    'accountId': 'acc-1',
    'config': {'status': 'running', 'runtime': 'openclaw'},
  };

  return MaterialApp(
    home: ServiceProvider(
      apiClient: apiClient,
      child: AgentSettingsPage(agent: testAgent),
    ),
  );
}

void main() {
  group('Agent 设置页', () {
    testWidgets('显示搜索开关和请求列表标题', (tester) async {
      final client = http_testing.MockClient((request) async {
        if (request.url.path.contains('/friend-requests')) {
          return _jsonResponse([], 200);
        }
        return _jsonResponse({'ok': true}, 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      expect(find.text('允许被搜索'), findsOneWidget);
      expect(find.text('待处理的好友请求'), findsOneWidget);
      expect(find.text('暂无待处理的请求'), findsOneWidget);
    });

    testWidgets('有待处理请求时显示接受/拒绝按钮', (tester) async {
      final client = http_testing.MockClient((request) async {
        if (request.url.path.contains('/friend-requests') && request.method == 'GET') {
          return _jsonResponse([
            {
              'id': 'fr-1',
              'status': 'pending',
              'accountA': {'id': 'u1', 'name': '申请者', 'avatar': null, 'type': 'human'},
            },
          ], 200);
        }
        if (request.url.path.contains('/friend-requests/') && request.method == 'PATCH') {
          return _jsonResponse({'id': 'fr-1', 'status': 'accepted'}, 200);
        }
        return _jsonResponse({'ok': true}, 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      expect(find.text('申请者'), findsOneWidget);
      expect(find.text('接受'), findsOneWidget);
      expect(find.text('拒绝'), findsOneWidget);
    });

    testWidgets('接受请求后从列表移除', (tester) async {
      final client = http_testing.MockClient((request) async {
        if (request.url.path.contains('/friend-requests') && request.method == 'GET') {
          return _jsonResponse([
            {
              'id': 'fr-1',
              'status': 'pending',
              'accountA': {'id': 'u1', 'name': '申请者', 'avatar': null, 'type': 'human'},
            },
          ], 200);
        }
        if (request.url.path.contains('/friend-requests/') && request.method == 'PATCH') {
          return _jsonResponse({'id': 'fr-1', 'status': 'accepted'}, 200);
        }
        return _jsonResponse({'ok': true}, 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      expect(find.text('申请者'), findsOneWidget);

      await tester.tap(find.text('接受'));
      await tester.pumpAndSettle();

      expect(find.text('申请者'), findsNothing);
      expect(find.text('暂无待处理的请求'), findsOneWidget);
    });
  });
}
