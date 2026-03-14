@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/pages/home_page.dart';
import 'package:clawchat/pages/chat/chat_detail_page.dart';
import 'package:clawchat/services/service_provider.dart';
import '../test_helpers.dart';

/// 手机尺寸，确保走窄屏布局（< 768px 断点）
const _phoneSize = Size(375, 812);

void _setPhoneSize(WidgetTester tester) {
  tester.view.physicalSize = _phoneSize;
  tester.view.devicePixelRatio = 1.0;
}

/// 不连 WebSocket 的简单 HomePage 包装
Future<Widget> _goldenApp() async {
  final api = await mockApiClient();
  return MaterialApp(
    home: ServiceProvider(
      apiClient: api,
      child: const HomePage(),
    ),
  );
}

void main() {
  group('Golden 视觉测试', () {
    testWidgets('聊天列表页截图', (tester) async {
      _setPhoneSize(tester);
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(await _goldenApp());
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('chat_list.png'),
      );
    });

    testWidgets('聊天详情页截图', (tester) async {
      _setPhoneSize(tester);
      addTearDown(() => tester.view.resetPhysicalSize());

      final api = await mockApiClient();
      await tester.pumpWidget(
        MaterialApp(
          home: ServiceProvider(
            apiClient: api,
            child: const ChatDetailPage(name: '张三', avatar: '👨', conversationId: 'conv-1'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(ChatDetailPage),
        matchesGoldenFile('chat_detail.png'),
      );
    });

    testWidgets('通讯录页截图', (tester) async {
      _setPhoneSize(tester);
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(await _goldenApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('contacts.png'),
      );
    });

    testWidgets('发现页截图', (tester) async {
      _setPhoneSize(tester);
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(await _goldenApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HomePage),
        matchesGoldenFile('discover.png'),
      );
    });

    testWidgets('个人中心截图', (tester) async {
      _setPhoneSize(tester);
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(await _goldenApp());
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
