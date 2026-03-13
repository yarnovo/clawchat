import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/pages/home_page.dart';
import 'package:clawchat/pages/chat/chat_detail_page.dart';

void main() {
  group('Golden 视觉测试', () {
    testWidgets('聊天列表页截图', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: HomePage()),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('chat_list.png'),
      );
    });

    testWidgets('聊天详情页截图', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: ChatDetailPage(name: '张三', avatar: '👨'),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(ChatDetailPage),
        matchesGoldenFile('chat_detail.png'),
      );
    });

    testWidgets('通讯录页截图', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: HomePage()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('contacts.png'),
      );
    });

    testWidgets('发现页截图', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: HomePage()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('discover.png'),
      );
    });

    testWidgets('个人中心截图', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: HomePage()),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('profile.png'),
      );
    });
  });
}
