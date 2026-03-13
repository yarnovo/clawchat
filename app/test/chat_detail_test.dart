import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/pages/chat/chat_detail_page.dart';

void main() {
  Widget buildTestWidget() {
    return const MaterialApp(
      home: ChatDetailPage(name: '张三', avatar: '👨'),
    );
  }

  group('聊天详情页', () {
    testWidgets('显示历史消息', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('张三'), findsOneWidget);
      expect(find.text('你好，在吗？'), findsOneWidget);
      expect(find.text('在的，什么事？'), findsOneWidget);
      expect(find.text('好的，那我们约在会议室'), findsOneWidget);
    });

    testWidgets('发送消息成功', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // 点击输入框并输入
      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '测试消息');

      // 触发发送（onEditingComplete）
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      // 消息出现在列表中
      expect(find.text('测试消息'), findsOneWidget);
    });

    testWidgets('发送后输入框清空', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '测试消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      // 输入框应该已清空
      final textFieldWidget = tester.widget<TextField>(textField);
      expect(textFieldWidget.controller!.text, isEmpty);
    });

    testWidgets('发送后输入框保持焦点', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '测试消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      // 焦点应该还在输入框上
      final focusNode = tester.widget<TextField>(textField).focusNode!;
      expect(focusNode.hasFocus, isTrue);
    });

    testWidgets('空消息不发送', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      // 记录当前消息数
      final initialCount = find.byType(Flexible).evaluate().length;

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '   ');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      // 消息数量不变
      expect(find.byType(Flexible).evaluate().length, initialCount);
    });
  });
}
