import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'test_helpers.dart';

void main() {
  group('发现页', () {
    testWidgets('显示所有功能项', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();

      expect(find.text('朋友圈'), findsOneWidget);
      expect(find.text('扫一扫'), findsOneWidget);
      expect(find.text('摇一摇'), findsOneWidget);
      expect(find.text('附近的人'), findsOneWidget);
      expect(find.text('购物'), findsOneWidget);
      expect(find.text('游戏'), findsOneWidget);
      expect(find.text('小程序'), findsOneWidget);
    });

    testWidgets('每项都有右箭头', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('发现'));
      await tester.pumpAndSettle();

      // 7 个功能项 = 7 个右箭头
      expect(find.byIcon(Icons.chevron_right), findsNWidgets(7));
    });
  });
}
