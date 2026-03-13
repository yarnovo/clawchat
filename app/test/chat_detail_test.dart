import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/pages/chat/chat_detail_page.dart';
import 'package:clawchat/services/service_provider.dart';
import 'test_helpers.dart';

void main() {
  Future<Widget> buildTestWidget() async {
    final api = await mockApiClient();
    return MaterialApp(
      home: ServiceProvider(
        apiClient: api,
        child: const ChatDetailPage(
          name: '张三',
          avatar: '👨',
          conversationId: 'conv-1',
        ),
      ),
    );
  }

  group('聊天详情页', () {
    testWidgets('显示历史消息', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('张三'), findsOneWidget);
      expect(find.text('你好，在吗？'), findsOneWidget);
      expect(find.text('在的，什么事？'), findsOneWidget);
    });

    testWidgets('发送消息成功', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '测试消息');

      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      expect(find.text('测试消息'), findsOneWidget);
    });

    testWidgets('发送后输入框清空', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '测试消息');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      final textFieldWidget = tester.widget<TextField>(textField);
      expect(textFieldWidget.controller!.text, isEmpty);
    });

    testWidgets('空消息不发送', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      final initialCount = find.byType(Flexible).evaluate().length;

      final textField = find.byType(TextField);
      await tester.tap(textField);
      await tester.enterText(textField, '   ');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();

      expect(find.byType(Flexible).evaluate().length, initialCount);
    });
  });
}
