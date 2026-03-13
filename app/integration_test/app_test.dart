import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:clawchat/app.dart';
import 'package:clawchat/services/auth_service.dart';

Future<ClawChatApp> _loggedInApp() async {
  final authService = AuthService(store: InMemoryTokenStore());
  await authService.saveLogin(
    token: 'test-token',
    name: 'ClawChat 用户',
    email: 'test@clawchat.com',
  );
  return ClawChatApp(authService: authService);
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('认证流程', () {
    testWidgets('未登录显示登录页', (tester) async {
      final authService = AuthService(store: InMemoryTokenStore());
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      expect(find.text('登录'), findsOneWidget);
      expect(find.text('没有账号？立即注册'), findsOneWidget);
    });

    testWidgets('登录页表单验证', (tester) async {
      final authService = AuthService(store: InMemoryTokenStore());
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      // 空表单提交
      await tester.tap(find.text('登录'));
      await tester.pumpAndSettle();
      expect(find.text('请输入邮箱'), findsOneWidget);
      expect(find.text('请输入密码'), findsOneWidget);
    });

    testWidgets('跳转注册页并验证表单', (tester) async {
      final authService = AuthService(store: InMemoryTokenStore());
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      await tester.tap(find.text('没有账号？立即注册'));
      await tester.pumpAndSettle();

      expect(find.byType(TextFormField), findsNWidgets(3));

      // 空表单提交
      await tester.tap(find.widgetWithText(ElevatedButton, '注册'));
      await tester.pumpAndSettle();
      expect(find.text('请输入昵称'), findsOneWidget);
    });

    testWidgets('已登录直接进首页，退出登录回到登录页', (tester) async {
      final authService = AuthService(store: InMemoryTokenStore());
      await authService.saveLogin(
        token: 'test-token',
        name: 'ClawChat 用户',
        email: 'test@clawchat.com',
      );
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      // 已在首页
      expect(find.text('聊天'), findsOneWidget);

      // 去个人中心
      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();

      // 点退出登录
      await tester.tap(find.text('退出登录'));
      await tester.pumpAndSettle();

      // 回到登录页
      expect(find.text('登录'), findsOneWidget);
    });
  });

  group('端到端测试', () {
    testWidgets('完整聊天流程：列表 → 详情 → 发送 → 返回', (tester) async {
      await tester.pumpWidget(await _loggedInApp());
      await tester.pumpAndSettle();

      expect(find.text('ClawChat'), findsOneWidget);
      expect(find.text('张三'), findsOneWidget);

      await tester.tap(find.text('张三'));
      await tester.pumpAndSettle();
      expect(find.text('你好，在吗？'), findsOneWidget);

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '集成测试消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      expect(find.text('集成测试消息'), findsOneWidget);

      await tester.enterText(textField, '第二条消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      expect(find.text('第二条消息'), findsOneWidget);

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('ClawChat'), findsOneWidget);
    });

    testWidgets('完整导航流程：四个 Tab 全部访问', (tester) async {
      await tester.pumpWidget(await _loggedInApp());
      await tester.pumpAndSettle();

      expect(find.text('ClawChat'), findsOneWidget);

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();
      expect(find.text('新的朋友'), findsOneWidget);
      expect(find.text('陈七'), findsOneWidget);

      await tester.tap(find.text('陈七'));
      await tester.pumpAndSettle();
      expect(find.text('你好，在吗？'), findsOneWidget);

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();

      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();
      expect(find.text('朋友圈'), findsOneWidget);
      expect(find.text('扫一扫'), findsOneWidget);

      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();
      expect(find.text('ClawChat 用户'), findsOneWidget);
      expect(find.text('设置'), findsOneWidget);
    });
  });
}
