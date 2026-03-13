import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/models/message.dart';

void main() {
  group('Message model', () {
    test('创建自己的消息', () {
      const msg = Message(content: '你好', isMine: true, time: '10:00');
      expect(msg.content, '你好');
      expect(msg.isMine, isTrue);
      expect(msg.time, '10:00');
    });

    test('创建对方的消息', () {
      const msg = Message(content: '在吗', isMine: false, time: '09:00');
      expect(msg.isMine, isFalse);
    });
  });
}
