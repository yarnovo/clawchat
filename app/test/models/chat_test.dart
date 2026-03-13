import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/models/chat.dart';

void main() {
  group('Chat model', () {
    test('默认未读数为 0', () {
      const chat = Chat(
        name: '测试',
        avatar: '👤',
        lastMessage: '你好',
        time: '10:00',
      );
      expect(chat.unreadCount, 0);
    });

    test('可设置未读数', () {
      const chat = Chat(
        name: '测试',
        avatar: '👤',
        lastMessage: '你好',
        time: '10:00',
        unreadCount: 5,
      );
      expect(chat.unreadCount, 5);
    });

    test('mockChats 不为空', () {
      expect(mockChats, isNotEmpty);
      expect(mockChats.length, 8);
    });

    test('mockChats 每项字段完整', () {
      for (final chat in mockChats) {
        expect(chat.name, isNotEmpty);
        expect(chat.avatar, isNotEmpty);
        expect(chat.lastMessage, isNotEmpty);
        expect(chat.time, isNotEmpty);
      }
    });
  });
}
