import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/app.dart';
import 'package:clawchat/services/auth_service.dart';

void main() {
  group('登录页', () {
    late AuthService authService;

    setUp(() {
      authService = AuthService(store: InMemoryTokenStore());
    });

    testWidgets('未登录时显示登录页', (tester) async {
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      expect(find.text('ClawChat'), findsOneWidget);
      expect(find.text('登录'), findsOneWidget);
      expect(find.text('没有账号？立即注册'), findsOneWidget);
    });

    testWidgets('邮箱和密码不能为空', (tester) async {
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      await tester.tap(find.text('登录'));
      await tester.pumpAndSettle();

      expect(find.text('请输入邮箱'), findsOneWidget);
      expect(find.text('请输入密码'), findsOneWidget);
    });

    testWidgets('已登录时直接进入首页', (tester) async {
      await authService.saveLogin(
        token: 'existing-token',
        name: '已登录用户',
        email: 'logged@test.com',
      );

      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      expect(find.text('聊天'), findsOneWidget);
      expect(find.text('通讯录'), findsOneWidget);
    });
  });

  group('注册页', () {
    late AuthService authService;

    setUp(() {
      authService = AuthService(store: InMemoryTokenStore());
    });

    testWidgets('点击注册链接进入注册页', (tester) async {
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      await tester.tap(find.text('没有账号？立即注册'));
      await tester.pumpAndSettle();

      expect(find.text('注册'), findsWidgets);
      expect(find.byType(TextFormField), findsNWidgets(3));
    });

    testWidgets('注册页表单验证', (tester) async {
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      await tester.tap(find.text('没有账号？立即注册'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, '注册'));
      await tester.pumpAndSettle();

      expect(find.text('请输入昵称'), findsOneWidget);
      expect(find.text('请输入邮箱'), findsOneWidget);
      expect(find.text('请输入密码'), findsOneWidget);
    });

    testWidgets('密码少于6位提示', (tester) async {
      await tester.pumpWidget(ClawChatApp(authService: authService));
      await tester.pumpAndSettle();

      await tester.tap(find.text('没有账号？立即注册'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).at(0), '测试');
      await tester.enterText(find.byType(TextFormField).at(1), 'a@b.com');
      await tester.enterText(find.byType(TextFormField).at(2), '123');
      await tester.tap(find.widgetWithText(ElevatedButton, '注册'));
      await tester.pumpAndSettle();

      expect(find.text('密码至少6位'), findsOneWidget);
    });
  });
}
