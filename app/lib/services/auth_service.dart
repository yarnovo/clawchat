import 'package:shared_preferences/shared_preferences.dart';

/// 存储接口，方便测试注入
abstract class TokenStore {
  Future<String?> get(String key);
  Future<void> set(String key, String value);
  Future<void> remove(String key);
}

class SharedPrefsTokenStore implements TokenStore {
  final SharedPreferencesAsync _prefs;
  SharedPrefsTokenStore() : _prefs = SharedPreferencesAsync();

  @override
  Future<String?> get(String key) => _prefs.getString(key);
  @override
  Future<void> set(String key, String value) => _prefs.setString(key, value);
  @override
  Future<void> remove(String key) => _prefs.remove(key);
}

class InMemoryTokenStore implements TokenStore {
  final Map<String, String> _data = {};

  @override
  Future<String?> get(String key) async => _data[key];
  @override
  Future<void> set(String key, String value) async => _data[key] = value;
  @override
  Future<void> remove(String key) async => _data.remove(key);
}

class AuthService {
  static const _tokenKey = 'auth_token';
  static const _nameKey = 'auth_name';
  static const _emailKey = 'auth_email';

  final TokenStore _store;

  AuthService({TokenStore? store})
      : _store = store ?? SharedPrefsTokenStore();

  Future<String?> getToken() => _store.get(_tokenKey);

  Future<void> saveLogin({
    required String token,
    required String name,
    required String email,
  }) async {
    await _store.set(_tokenKey, token);
    await _store.set(_nameKey, name);
    await _store.set(_emailKey, email);
  }

  Future<void> logout() async {
    await _store.remove(_tokenKey);
    await _store.remove(_nameKey);
    await _store.remove(_emailKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<String?> getName() => _store.get(_nameKey);
  Future<String?> getEmail() => _store.get(_emailKey);
}
