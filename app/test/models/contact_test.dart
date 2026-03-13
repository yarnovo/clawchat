import 'package:flutter_test/flutter_test.dart';
import 'package:clawchat/models/contact.dart';

void main() {
  group('Contact model', () {
    test('mockContacts 不为空', () {
      expect(mockContacts, isNotEmpty);
    });

    test('按字母排序', () {
      for (int i = 0; i < mockContacts.length - 1; i++) {
        expect(
          mockContacts[i].letter.compareTo(mockContacts[i + 1].letter) <= 0,
          isTrue,
          reason: '${mockContacts[i].name}(${mockContacts[i].letter}) 应在 ${mockContacts[i + 1].name}(${mockContacts[i + 1].letter}) 前面',
        );
      }
    });

    test('每个联系人字段完整', () {
      for (final c in mockContacts) {
        expect(c.name, isNotEmpty);
        expect(c.avatar, isNotEmpty);
        expect(c.letter, hasLength(1));
      }
    });
  });
}
