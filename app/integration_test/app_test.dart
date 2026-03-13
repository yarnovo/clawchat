import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:clawchat/app.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('端到端测试', () {
    testWidgets('完整聊天流程：列表 → 详情 → 发送 → 返回', (tester) async {
      await tester.pumpWidget(const ClawChatApp());
      await tester.pumpAndSettle();

      // 1. 聊天列表页加载
      expect(find.text('ClawChat'), findsOneWidget);
      expect(find.text('张三'), findsOneWidget);

      // 2. 进入张三的聊天
      await tester.tap(find.text('张三'));
      await tester.pumpAndSettle();
      expect(find.text('你好，在吗？'), findsOneWidget);

      // 3. 发送一条消息
      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '集成测试消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      expect(find.text('集成测试消息'), findsOneWidget);

      // 4. 连续发送第二条（验证焦点保持）
      await tester.enterText(textField, '第二条消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      expect(find.text('第二条消息'), findsOneWidget);

      // 5. 返回聊天列表
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('ClawChat'), findsOneWidget);
    });

    testWidgets('完整导航流程：四个 Tab 全部访问', (tester) async {
      await tester.pumpWidget(const ClawChatApp());
      await tester.pumpAndSettle();

      // 聊天页
      expect(find.text('ClawChat'), findsOneWidget);

      // 通讯录
      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();
      expect(find.text('新的朋友'), findsOneWidget);
      expect(find.text('陈七'), findsOneWidget);

      // 从通讯录进入聊天
      await tester.tap(find.text('陈七'));
      await tester.pumpAndSettle();
      expect(find.text('你好，在吗？'), findsOneWidget);

      // 返回
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();

      // 发现页
      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();
      expect(find.text('朋友圈'), findsOneWidget);
      expect(find.text('扫一扫'), findsOneWidget);

      // 个人中心
      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();
      expect(find.text('ClawChat 用户'), findsOneWidget);
      expect(find.text('设置'), findsOneWidget);
    });
  });
}
