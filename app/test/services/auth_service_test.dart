import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/services/auth_service.dart';

void main() {
  group('AuthService', () {
    late AuthService authService;

    setUp(() {
      authService = AuthService(store: InMemoryTokenStore());
    });

    test('初始状态未登录', () async {
      expect(await authService.isLoggedIn(), false);
      expect(await authService.getToken(), null);
    });

    test('saveLogin 保存并读取', () async {
      await authService.saveLogin(
        token: 'test-token',
        name: '测试',
        email: 'test@test.com',
      );

      expect(await authService.isLoggedIn(), true);
      expect(await authService.getToken(), 'test-token');
      expect(await authService.getName(), '测试');
      expect(await authService.getEmail(), 'test@test.com');
    });

    test('logout 清除数据', () async {
      await authService.saveLogin(
        token: 'test-token',
        name: '测试',
        email: 'test@test.com',
      );
      await authService.logout();

      expect(await authService.isLoggedIn(), false);
      expect(await authService.getToken(), null);
      expect(await authService.getName(), null);
    });
  });
}
