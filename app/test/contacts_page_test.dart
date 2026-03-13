import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'test_helpers.dart';

void main() {
  group('通讯录页', () {
    testWidgets('显示功能入口', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      expect(find.text('新的朋友'), findsOneWidget);
      expect(find.text('群聊'), findsOneWidget);
    });

    testWidgets('无好友时显示暂无好友', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      expect(find.text('暂无好友'), findsOneWidget);
    });

    testWidgets('添加好友按钮可点击', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.person_add_outlined));
      await tester.pumpAndSettle();

      expect(find.text('添加好友'), findsOneWidget);
      expect(find.text('发送好友申请'), findsOneWidget);
    });
  });
}
