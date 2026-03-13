import 'package:flutter/material.dart';
import '../../models/contact.dart';

class ContactsPage extends StatelessWidget {
  const ContactsPage({super.key});

  @override
  Widget build(BuildContext context) {
    // 按字母分组
    final grouped = <String, List<Contact>>{};
    for (final c in mockContacts) {
      grouped.putIfAbsent(c.letter, () => []).add(c);
    }
    final letters = grouped.keys.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: const Text('通讯录'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined, size: 22),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        children: [
          // 功能入口
          _FunctionEntry(
            icon: Icons.group,
            color: const Color(0xFF07C160),
            title: '新的朋友',
          ),
          _FunctionEntry(
            icon: Icons.people,
            color: const Color(0xFF576B95),
            title: '群聊',
          ),
          _FunctionEntry(
            icon: Icons.local_offer,
            color: const Color(0xFF576B95),
            title: '标签',
          ),
          _FunctionEntry(
            icon: Icons.work_outline,
            color: const Color(0xFF576B95),
            title: '公众号',
          ),
          // 联系人列表
          for (final letter in letters) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: const Color(0xFFEDEDED),
              child: Text(
                letter,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF888888),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            for (final contact in grouped[letter]!)
              _ContactItem(contact: contact),
          ],
        ],
      ),
    );
  }
}

class _FunctionEntry extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;

  const _FunctionEntry({
    required this.icon,
    required this.color,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          InkWell(
            onTap: () {},
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(icon, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Color(0xFF191919),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(left: 68),
            child: Divider(),
          ),
        ],
      ),
    );
  }
}

class _ContactItem extends StatelessWidget {
  final Contact contact;

  const _ContactItem({required this.contact});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          InkWell(
            onTap: () {
              Navigator.pushNamed(
                context,
                '/chat_detail',
                arguments: {'name': contact.name, 'avatar': contact.avatar},
              );
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F0F0),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      contact.avatar,
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    contact.name,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Color(0xFF191919),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(left: 68),
            child: Divider(),
          ),
        ],
      ),
    );
  }
}
