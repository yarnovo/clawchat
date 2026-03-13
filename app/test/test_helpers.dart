import 'dart:convert';
import 'package:clawchat/app.dart';
import 'package:clawchat/services/auth_service.dart';
import 'package:clawchat/services/api_client.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

/// 创建已登录状态的 ClawChatApp，用于测试首页及子页面
/// 使用 mock HTTP client，所有 API 调用返回空数据
Future<ClawChatApp> loggedInApp() async {
  final authService = AuthService(store: InMemoryTokenStore());
  await authService.saveLogin(
    token: 'test-token',
    name: 'ClawChat 用户',
    email: 'test@clawchat.com',
  );

  final mockClient = http_testing.MockClient((request) async {
    final path = request.url.path;

    if (path.endsWith('/friends')) {
      return http.Response(jsonEncode([]), 200);
    }
    if (path.endsWith('/friends/requests')) {
      return http.Response(jsonEncode([]), 200);
    }
    if (path.endsWith('/accounts/me')) {
      return http.Response(
        jsonEncode({
          'id': 'test-id',
          'name': 'ClawChat 用户',
          'email': 'test@clawchat.com',
          'type': 'human',
        }),
        200,
      );
    }
    return http.Response(jsonEncode({'error': 'not found'}), 404);
  });

  final apiClient = ApiClient(
    baseUrl: 'http://localhost:3000',
    authService: authService,
    httpClient: mockClient,
  );

  return ClawChatApp(authService: authService, apiClient: apiClient);
}
