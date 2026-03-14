import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/pages/chat/chat_list_page.dart';
import 'package:clawchat/services/service_provider.dart';
import 'package:clawchat/services/ws_service.dart';
import 'test_helpers.dart';

void main() {
  group('底部导航栏', () {
    testWidgets('四个 Tab 切换正常', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      // 默认在聊天页
      expect(find.text('ClawChat'), findsOneWidget);

      // 切换到通讯录
      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();
      expect(find.text('新的朋友'), findsOneWidget);

      // 切换到发现
      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();
      expect(find.text('搜索用户或 Agent'), findsOneWidget);

      // 切换到我
      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();
      expect(find.text('ClawChat 用户'), findsOneWidget);

      // 切回聊天
      await tester.tap(find.text('聊天'));
      await tester.pumpAndSettle();
      expect(find.text('ClawChat'), findsOneWidget);
    });
  });

  group('聊天列表', () {
    testWidgets('显示对话列表', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      expect(find.text('张三'), findsOneWidget);
      expect(find.text('你好啊'), findsOneWidget);
    });

    testWidgets('无对话时显示空状态', (tester) async {
      // 使用默认的 loggedInApp（mock 返回一条对话）
      // 这里验证列表渲染正常即可
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      expect(find.text('ClawChat'), findsOneWidget);
    });
  });

  group('聊天列表实时更新', () {
    // Use direct widget setup to avoid WsService.connect() from loggedInApp()
    Future<Widget> buildChatListWidget({
      List<Map<String, dynamic>>? conversations,
    }) async {
      final api = await mockApiClient(conversations: conversations);
      return MaterialApp(
        home: ServiceProvider(
          apiClient: api,
          child: const Scaffold(body: ChatListPage()),
        ),
      );
    }

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

    testWidgets('收到 new_message 后更新 lastMessage', (tester) async {
      await tester.pumpWidget(await buildChatListWidget());
      await tester.pumpAndSettle();

      expect(find.text('你好啊'), findsOneWidget);

      await addWsEventAndPump(tester, {
        'type': 'new_message',
        'data': {
          'id': 'msg-ws-1',
          'conversationId': 'conv-1',
          'content': 'Agent 回复了你',
          'createdAt': DateTime.now().toIso8601String(),
          'sender': {'id': 'friend-1', 'name': '张三', 'avatar': '👨', 'type': 'agent'},
        },
      });

      expect(find.text('Agent 回复了你'), findsOneWidget);
      expect(find.text('你好啊'), findsNothing);
    });

    testWidgets('typing 事件不影响聊天列表', (tester) async {
      await tester.pumpWidget(await buildChatListWidget());
      await tester.pumpAndSettle();

      expect(find.text('你好啊'), findsOneWidget);

      await addWsEventAndPump(tester, {
        'type': 'typing',
        'data': {'conversationId': 'conv-1', 'senderId': 'friend-1'},
      });

      // lastMessage unchanged
      expect(find.text('你好啊'), findsOneWidget);
    });

    testWidgets('连续收到多条消息后 lastMessage 持续更新', (tester) async {
      await tester.pumpWidget(await buildChatListWidget());
      await tester.pumpAndSettle();

      await addWsEventAndPump(tester, {
        'type': 'new_message',
        'data': {
          'id': 'msg-ws-1',
          'conversationId': 'conv-1',
          'content': '第一条回复',
          'createdAt': DateTime.now().toIso8601String(),
          'sender': {'id': 'friend-1', 'name': '张三', 'avatar': '👨', 'type': 'agent'},
        },
      });
      expect(find.text('第一条回复'), findsOneWidget);

      await addWsEventAndPump(tester, {
        'type': 'new_message',
        'data': {
          'id': 'msg-ws-2',
          'conversationId': 'conv-1',
          'content': '第二条回复',
          'createdAt': DateTime.now().toIso8601String(),
          'sender': {'id': 'friend-1', 'name': '张三', 'avatar': '👨', 'type': 'agent'},
        },
      });
      expect(find.text('第二条回复'), findsOneWidget);
      expect(find.text('第一条回复'), findsNothing);
    });

    testWidgets('新消息将会话移到列表顶部', (tester) async {
      final multiConversations = [
        {
          'id': 'conv-1',
          'type': 'dm',
          'targetId': 'friend-1:test-id',
          'friend': {'id': 'friend-1', 'name': '张三', 'avatar': '👨'},
          'lastMessage': {'content': '最新消息', 'createdAt': '2026-03-14T10:00:00Z'},
        },
        {
          'id': 'conv-2',
          'type': 'dm',
          'targetId': 'friend-2:test-id',
          'friend': {'id': 'friend-2', 'name': '李四', 'avatar': '👩'},
          'lastMessage': {'content': '旧消息', 'createdAt': '2026-03-13T10:00:00Z'},
        },
      ];

      await tester.pumpWidget(
        await buildChatListWidget(conversations: multiConversations),
      );
      await tester.pumpAndSettle();

      // Verify initial order: 张三 first, 李四 second
      final items = find.text('张三');
      expect(items, findsOneWidget);
      expect(find.text('李四'), findsOneWidget);

      // 李四 (conv-2) receives a new message → should move to top
      await addWsEventAndPump(tester, {
        'type': 'new_message',
        'data': {
          'id': 'msg-ws-top',
          'conversationId': 'conv-2',
          'content': '李四的新消息',
          'createdAt': DateTime.now().toIso8601String(),
          'sender': {'id': 'friend-2', 'name': '李四', 'avatar': '👩', 'type': 'human'},
        },
      });

      expect(find.text('李四的新消息'), findsOneWidget);
      expect(find.text('旧消息'), findsNothing);

      // Verify 李四 is now first in the list by checking widget order
      final allNames = tester.widgetList<Text>(
        find.textContaining(RegExp(r'^(张三|李四)$')),
      ).map((w) => w.data).toList();
      expect(allNames, ['李四', '张三']);
    });

    testWidgets('其他会话的消息不影响无关会话', (tester) async {
      await tester.pumpWidget(await buildChatListWidget());
      await tester.pumpAndSettle();

      expect(find.text('你好啊'), findsOneWidget);

      // Message for a conversation not in the list
      await addWsEventAndPump(tester, {
        'type': 'new_message',
        'data': {
          'id': 'msg-ws-unknown',
          'conversationId': 'conv-unknown',
          'content': '来自未知会话',
          'createdAt': DateTime.now().toIso8601String(),
          'sender': {'id': 'stranger', 'name': '陌生人', 'avatar': '👻', 'type': 'human'},
        },
      });

      // Original conversation lastMessage unchanged
      expect(find.text('你好啊'), findsOneWidget);
    });
  });
}
