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
      expect(find.text('标签'), findsOneWidget);
      expect(find.text('公众号'), findsOneWidget);
    });

    testWidgets('显示联系人列表和字母索引', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      // 首个字母索引和联系人可见
      expect(find.text('C'), findsOneWidget);
      expect(find.text('陈七'), findsOneWidget);

      // 滚动到底部验证更多联系人
      await tester.scrollUntilVisible(find.text('赵六'), 200);
      expect(find.text('赵六'), findsOneWidget);
    });

    testWidgets('点击联系人进入聊天', (tester) async {
      await tester.pumpWidget(await loggedInApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('通讯录'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('陈七'));
      await tester.pumpAndSettle();

      // 进入聊天详情
      expect(find.text('你好，在吗？'), findsOneWidget);
    });
  });
}
