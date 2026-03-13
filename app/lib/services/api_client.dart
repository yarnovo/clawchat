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
}

class ApiResponse {
  final int statusCode;
  final Map<String, dynamic> data;

  ApiResponse(this.statusCode, this.data);

  bool get ok => statusCode >= 200 && statusCode < 300;
}
