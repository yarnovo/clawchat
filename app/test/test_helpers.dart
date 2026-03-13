import 'package:clawchat/app.dart';
import 'package:clawchat/services/auth_service.dart';

/// 创建已登录状态的 ClawChatApp，用于测试首页及子页面
Future<ClawChatApp> loggedInApp() async {
  final authService = AuthService(store: InMemoryTokenStore());
  await authService.saveLogin(
    token: 'test-token',
    name: 'ClawChat 用户',
    email: 'test@clawchat.com',
  );
  return ClawChatApp(authService: authService);
}
