import 'package:flutter_test/flutter_test.dart';
import 'test_helpers.dart';

void main() {
  group('个人中心页', () {
    testWidgets('显示用户信息', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();

      expect(find.text('ClawChat 用户'), findsOneWidget);
      expect(find.text('微信号: clawchat_001'), findsOneWidget);
    });

    testWidgets('显示功能菜单', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('我'));
      await tester.pumpAndSettle();

      expect(find.text('服务'), findsOneWidget);
      expect(find.text('我的 Agent'), findsOneWidget);
      expect(find.text('设置'), findsOneWidget);
    });
  });
}
