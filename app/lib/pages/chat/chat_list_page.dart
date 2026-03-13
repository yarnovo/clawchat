import 'package:flutter/material.dart';
import '../../services/service_provider.dart';
import '../contacts/add_friend_page.dart';
import '../contacts/create_agent_page.dart';

class ChatListPage extends StatefulWidget {
  const ChatListPage({super.key});

  @override
  State<ChatListPage> createState() => ChatListPageState();
}

class ChatListPageState extends State<ChatListPage> {
  void reload() => _load();
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _load();
  }

  Future<void> _load() async {
    final api = ServiceProvider.of(context);
    final res = await api.getConversations();
    if (mounted) {
      setState(() {
        _loading = false;
        if (res.ok) _conversations = res.data;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ClawChat'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, size: 22),
            onPressed: () {},
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.add_circle_outline, size: 22),
            onSelected: (value) async {
              Widget page;
              if (value == 'add') {
                page = const AddFriendPage();
              } else {
                page = const CreateAgentPage();
              }
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => page),
              );
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'add', child: Text('添加朋友')),
              PopupMenuItem(value: 'create', child: Text('创建朋友')),
            ],
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _conversations.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 200),
                        Center(
                          child: Text('暂无聊天',
                              style: TextStyle(color: Colors.grey)),
                        ),
                      ],
                    )
                  : ListView.builder(
                      itemCount: _conversations.length,
                      itemBuilder: (context, index) {
                        final conv = _conversations[index];
                        final friend =
                            conv['friend'] as Map<String, dynamic>?;
                        final lastMsg =
                            conv['lastMessage'] as Map<String, dynamic>?;

                        return _ChatItem(
                          name: friend?['name'] ?? '未知',
                          avatar: friend?['avatar'] ?? '👤',
                          lastMessage: lastMsg?['content'] ?? '',
                          time: _formatTime(lastMsg?['createdAt']),
                          onTap: () async {
                            await Navigator.pushNamed(
                              context,
                              '/chat_detail',
                              arguments: {
                                'name': friend?['name'] ?? '未知',
                                'avatar': friend?['avatar'] ?? '👤',
                                'conversationId': conv['id'],
                              },
                            );
                            _load();
                          },
                        );
                      },
                    ),
            ),
    );
  }

  String _formatTime(String? isoTime) {
    if (isoTime == null) return '';
    final dt = DateTime.tryParse(isoTime);
    if (dt == null) return '';
    final now = DateTime.now();
    final local = dt.toLocal();
    if (local.year == now.year &&
        local.month == now.month &&
        local.day == now.day) {
      return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    }
    return '${local.month}/${local.day}';
  }
}

class _ChatItem extends StatelessWidget {
  final String name;
  final String avatar;
  final String lastMessage;
  final String time;
  final VoidCallback onTap;

  const _ChatItem({
    required this.name,
    required this.avatar,
    required this.lastMessage,
    required this.time,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F0F0),
                borderRadius: BorderRadius.circular(6),
              ),
              alignment: Alignment.center,
              child: Text(avatar, style: const TextStyle(fontSize: 24)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(
                              fontSize: 16, color: Color(0xFF191919)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        time,
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFFB0B0B0)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    lastMessage,
                    style: const TextStyle(
                        fontSize: 14, color: Color(0xFF999999)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
