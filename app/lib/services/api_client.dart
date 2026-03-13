import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiClient {
  final String baseUrl;
  final AuthService authService;
  final http.Client _http;

  ApiClient({
    required this.baseUrl,
    required this.authService,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  Future<Map<String, String>> _headers() async {
    final headers = {'Content-Type': 'application/json'};
    final token = await authService.getToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<ApiResponse> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/v1/im/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  Future<ApiResponse> login({
    required String email,
    required String password,
  }) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/v1/im/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  Future<ApiResponse> getMe() async {
    final res = await _http.get(
      Uri.parse('$baseUrl/v1/im/accounts/me'),
      headers: await _headers(),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  // ---- Friends ----

  Future<ApiListResponse> getFriends() async {
    final res = await _http.get(
      Uri.parse('$baseUrl/v1/im/friends'),
      headers: await _headers(),
    );
    return ApiListResponse(res.statusCode, List<Map<String, dynamic>>.from(jsonDecode(res.body)));
  }

  Future<ApiResponse> sendFriendRequest({required String email}) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/v1/im/friends/request'),
      headers: await _headers(),
      body: jsonEncode({'email': email}),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  Future<ApiListResponse> getFriendRequests() async {
    final res = await _http.get(
      Uri.parse('$baseUrl/v1/im/friends/requests'),
      headers: await _headers(),
    );
    return ApiListResponse(res.statusCode, List<Map<String, dynamic>>.from(jsonDecode(res.body)));
  }

  Future<ApiResponse> handleFriendRequest({
    required String id,
    required String status,
  }) async {
    final res = await _http.patch(
      Uri.parse('$baseUrl/v1/im/friends/request/$id'),
      headers: await _headers(),
      body: jsonEncode({'status': status}),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  Future<ApiResponse> deleteFriend({required String id}) async {
    final res = await _http.delete(
      Uri.parse('$baseUrl/v1/im/friends/$id'),
      headers: await _headers(),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  // ---- Agents ----

  Future<ApiResponse> createAgent({
    required String name,
    String? avatar,
    String? model,
  }) async {
    final me = await getMe();
    final res = await _http.post(
      Uri.parse('$baseUrl/v1/agents'),
      headers: await _headers(),
      body: jsonEncode({
        'ownerId': me.data['id'],
        'name': name,
        'avatar': avatar,
        if (model != null) 'model': model, // ignore: use_null_aware_elements
      }),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  // ---- Conversations ----

  Future<ApiResponse> createConversation({required String friendId}) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/v1/im/conversations'),
      headers: await _headers(),
      body: jsonEncode({'friendId': friendId}),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  Future<ApiListResponse> getConversations() async {
    final res = await _http.get(
      Uri.parse('$baseUrl/v1/im/conversations'),
      headers: await _headers(),
    );
    return ApiListResponse(res.statusCode, List<Map<String, dynamic>>.from(jsonDecode(res.body)));
  }

  // ---- Messages ----

  Future<ApiResponse> sendMessage({
    required String conversationId,
    required String content,
  }) async {
    final res = await _http.post(
      Uri.parse('$baseUrl/v1/im/messages'),
      headers: await _headers(),
      body: jsonEncode({'conversationId': conversationId, 'content': content}),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }

  Future<ApiListResponse> getMessages({
    required String conversationId,
    String? before,
    int limit = 50,
  }) async {
    var url = '$baseUrl/v1/im/messages?conversationId=$conversationId&limit=$limit';
    if (before != null) url += '&before=$before';
    final res = await _http.get(
      Uri.parse(url),
      headers: await _headers(),
    );
    return ApiListResponse(res.statusCode, List<Map<String, dynamic>>.from(jsonDecode(res.body)));
  }

  Future<ApiResponse> deleteMessage({required String id}) async {
    final res = await _http.delete(
      Uri.parse('$baseUrl/v1/im/messages/$id'),
      headers: await _headers(),
    );
    return ApiResponse(res.statusCode, jsonDecode(res.body));
  }
}

class ApiListResponse {
  final int statusCode;
  final List<Map<String, dynamic>> data;

  ApiListResponse(this.statusCode, this.data);

  bool get ok => statusCode >= 200 && statusCode < 300;
}

class ApiResponse {
  final int statusCode;
  final Map<String, dynamic> data;

  ApiResponse(this.statusCode, this.data);

  bool get ok => statusCode >= 200 && statusCode < 300;
}
