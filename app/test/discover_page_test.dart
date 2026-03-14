import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/services/auth_service.dart';
import 'package:clawchat/services/api_client.dart';
import 'package:clawchat/services/service_provider.dart';
import 'package:clawchat/pages/discover/discover_page.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

Widget _buildTestApp({required http.Client httpClient}) {
  final authService = AuthService(store: InMemoryTokenStore());
  authService.saveLogin(token: 'test-token', name: 'Test', email: 't@t.com');
  final apiClient = ApiClient(
    baseUrl: 'http://localhost:3000',
    authService: authService,
    httpClient: httpClient,
  );

  return MaterialApp(
    home: ServiceProvider(
      apiClient: apiClient,
      child: const Scaffold(body: DiscoverPage()),
    ),
  );
}

http.Response _jsonResponse(Object data, int statusCode) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(data)),
    statusCode,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

void main() {
  group('发现页', () {
    testWidgets('初始显示搜索框和引导文案', (tester) async {
      final client = http_testing.MockClient((_) async {
        return _jsonResponse([], 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('搜索用户或 Agent'), findsOneWidget);
      expect(find.text('搜索用户名或 Agent 名称\n发现有趣的 AI Agent'), findsOneWidget);
    });

    testWidgets('搜索返回结果并显示', (tester) async {
      final client = http_testing.MockClient((request) async {
        if (request.url.path.contains('/accounts/search')) {
          return _jsonResponse([
            {'id': 'a1', 'name': '测试Agent', 'avatar': '🤖', 'type': 'agent'},
            {'id': 'a2', 'name': '测试用户', 'avatar': null, 'type': 'human'},
          ], 200);
        }
        return _jsonResponse([], 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '测试');
      // 等待 debounce + API 调用
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();

      expect(find.text('测试Agent'), findsOneWidget);
      expect(find.text('测试用户'), findsOneWidget);
      expect(find.text('Agent'), findsOneWidget);
      expect(find.text('用户'), findsOneWidget);
    });

    testWidgets('点击加好友后按钮变灰', (tester) async {
      final client = http_testing.MockClient((request) async {
        if (request.url.path.contains('/accounts/search')) {
          return _jsonResponse([
            {'id': 'a1', 'name': '目标', 'avatar': null, 'type': 'human'},
          ], 200);
        }
        if (request.url.path.contains('/friends/request')) {
          return _jsonResponse({'id': 'fr-1', 'status': 'pending'}, 201);
        }
        return _jsonResponse([], 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '目标');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();

      expect(find.text('加好友'), findsOneWidget);
      await tester.tap(find.text('加好友'));
      await tester.pumpAndSettle();

      expect(find.text('已申请'), findsOneWidget);
      expect(find.text('加好友'), findsNothing);
    });

    testWidgets('空结果显示提示', (tester) async {
      final client = http_testing.MockClient((request) async {
        return _jsonResponse([], 200);
      });

      await tester.pumpWidget(_buildTestApp(httpClient: client));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'xyz');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();

      expect(find.text('没有找到匹配的结果'), findsOneWidget);
    });
  });
}
