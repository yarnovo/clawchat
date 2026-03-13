import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/app.dart';

void main() {
  group('底部导航栏', () {
    testWidgets('四个 Tab 切换正常', (tester) async {
      await tester.pumpWidget(const ClawChatApp());
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
      expect(find.text('朋友圈'), findsOneWidget);

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
    testWidgets('显示所有聊天项', (tester) async {
      await tester.pumpWidget(const ClawChatApp());
      await tester.pumpAndSettle();

      expect(find.text('文件传输助手'), findsOneWidget);
      expect(find.text('张三'), findsOneWidget);
      expect(find.text('前端开发群'), findsOneWidget);
    });

    testWidgets('显示未读角标', (tester) async {
      await tester.pumpWidget(const ClawChatApp());
      await tester.pumpAndSettle();

      // 张三有 2 条未读
      expect(find.text('2'), findsOneWidget);
      // 前端开发群有 5 条未读
      expect(find.text('5'), findsOneWidget);
    });

    testWidgets('点击聊天项进入详情页', (tester) async {
      await tester.pumpWidget(const ClawChatApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('张三'));
      await tester.pumpAndSettle();

      // 进入张三的聊天详情
      expect(find.text('你好，在吗？'), findsOneWidget);
      expect(find.text('在的，什么事？'), findsOneWidget);
    });
  });
}
