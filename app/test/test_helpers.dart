import 'dart:convert';
import 'package:clawchat/app.dart';
import 'package:clawchat/services/auth_service.dart';
import 'package:clawchat/services/api_client.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart' as http_testing;

final mockConversations = [
  {
    'id': 'conv-1',
    'type': 'dm',
    'targetId': 'friend-1:test-id',
    'friend': {'id': 'friend-1', 'name': '张三', 'avatar': '👨'},
    'lastMessage': {
      'content': '你好啊',
      'createdAt': '2026-03-13T10:00:00Z',
    },
  },
];

final mockMessages = [
  {
    'id': 'msg-1',
    'conversationId': 'conv-1',
    'content': '你好，在吗？',
    'createdAt': '2026-03-13T10:00:00Z',
    'sender': {'id': 'friend-1', 'name': '张三', 'avatar': '👨', 'type': 'human'},
  },
  {
    'id': 'msg-2',
    'conversationId': 'conv-1',
    'content': '在的，什么事？',
    'createdAt': '2026-03-13T10:01:00Z',
    'sender': {'id': 'test-id', 'name': 'ClawChat 用户', 'avatar': '🐱', 'type': 'human'},
  },
];

/// 创建已登录状态的 ClawChatApp，用于测试首页及子页面
/// 使用 mock HTTP client，所有 API 调用返回空数据
Future<ClawChatApp> loggedInApp() async {
  final authService = AuthService(store: InMemoryTokenStore());
  await authService.saveLogin(
    token: 'test-token',
    name: 'ClawChat 用户',
    email: 'test@clawchat.com',
  );

  final apiClient = ApiClient(
    baseUrl: 'http://localhost:3000',
    authService: authService,
    httpClient: mockHttpClient(),
  );

  return ClawChatApp(authService: authService, apiClient: apiClient);
}

/// 创建 mock ApiClient，可在单独页面测试中使用
Future<ApiClient> mockApiClient({
  List<Map<String, dynamic>>? conversations,
}) async {
  final authService = AuthService(store: InMemoryTokenStore());
  await authService.saveLogin(
    token: 'test-token',
    name: 'ClawChat 用户',
    email: 'test@clawchat.com',
  );
  return ApiClient(
    baseUrl: 'http://localhost:3000',
    authService: authService,
    httpClient: mockHttpClient(conversations: conversations),
  );
}

http.Response _jsonResponse(Object data, int statusCode) {
  return http.Response.bytes(
    utf8.encode(jsonEncode(data)),
    statusCode,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

http_testing.MockClient mockHttpClient({
  List<Map<String, dynamic>>? conversations,
}) {
  final convs = conversations ?? mockConversations;
  return http_testing.MockClient((request) async {
    final path = request.url.path;
    final method = request.method;

    if (path.endsWith('/accounts/me')) {
      return _jsonResponse({
        'id': 'test-id',
        'name': 'ClawChat 用户',
        'email': 'test@clawchat.com',
        'type': 'human',
      }, 200);
    }
    if (path.endsWith('/friends') && method == 'GET') {
      return _jsonResponse([], 200);
    }
    if (path.endsWith('/friends/requests')) {
      return _jsonResponse([], 200);
    }
    if (path.endsWith('/conversations') && method == 'GET') {
      return _jsonResponse(convs, 200);
    }
    if (path.endsWith('/messages') && method == 'GET') {
      return _jsonResponse(mockMessages, 200);
    }
    if (path.endsWith('/messages') && method == 'POST') {
      final body = jsonDecode(request.body);
      return _jsonResponse({
        'id': 'msg-new',
        'conversationId': body['conversationId'],
        'content': body['content'],
        'createdAt': DateTime.now().toIso8601String(),
        'sender': {'id': 'test-id', 'name': 'ClawChat 用户', 'avatar': '🐱', 'type': 'human'},
      }, 201);
    }
    return _jsonResponse({'error': 'not found'}, 404);
  });
}
