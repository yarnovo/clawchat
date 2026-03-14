import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/pages/chat/chat_detail_page.dart';
import 'package:clawchat/services/service_provider.dart';
import 'package:clawchat/services/ws_service.dart';
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

  group('正在输入指示器', () {
    // Helper: add WS event and pump — uses runAsync because the WsService
    // broadcast StreamController was created outside the FakeAsync zone,
    // so microtask-based event delivery won't happen inside pump().
    Future<void> addWsEventAndPump(
      WidgetTester tester,
      Map<String, dynamic> event,
    ) async {
      await tester.runAsync(() async {
        WsService.instance.addTestEvent(event);
        await Future<void>.delayed(Duration.zero);
      });
      await tester.pump();
    }

    testWidgets('收到 typing 事件后显示"正在输入..."', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      // Initially no typing indicator
      expect(find.text('正在输入...'), findsNothing);

      // Simulate typing event from WebSocket
      await addWsEventAndPump(tester, {
        'type': 'typing',
        'data': {'conversationId': 'conv-1', 'senderId': 'friend-1'},
      });

      expect(find.text('正在输入...'), findsOneWidget);
    });

    testWidgets('收到 new_message 后清除 typing 指示器', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      // Show typing indicator
      await addWsEventAndPump(tester, {
        'type': 'typing',
        'data': {'conversationId': 'conv-1', 'senderId': 'friend-1'},
      });
      expect(find.text('正在输入...'), findsOneWidget);

      // New message arrives — typing should clear
      await addWsEventAndPump(tester, {
        'type': 'new_message',
        'data': {
          'id': 'msg-new-1',
          'conversationId': 'conv-1',
          'content': '新消息',
          'createdAt': DateTime.now().toIso8601String(),
          'sender': {'id': 'friend-1', 'name': '张三', 'avatar': '👨', 'type': 'human'},
        },
      });

      expect(find.text('正在输入...'), findsNothing);
      expect(find.text('新消息'), findsOneWidget);
    });

    testWidgets('其他会话的 typing 事件不影响当前页面', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      // Typing event for a different conversation
      await addWsEventAndPump(tester, {
        'type': 'typing',
        'data': {'conversationId': 'conv-other', 'senderId': 'friend-2'},
      });

      expect(find.text('正在输入...'), findsNothing);
    });

    testWidgets('typing 指示器 30 秒后自动消失', (tester) async {
      await tester.pumpWidget(await buildTestWidget());
      await tester.pumpAndSettle();

      await addWsEventAndPump(tester, {
        'type': 'typing',
        'data': {'conversationId': 'conv-1', 'senderId': 'friend-1'},
      });
      expect(find.text('正在输入...'), findsOneWidget);

      // Advance time past the 30-second timeout
      await tester.pump(const Duration(seconds: 31));

      expect(find.text('正在输入...'), findsNothing);
    });
  });
}
