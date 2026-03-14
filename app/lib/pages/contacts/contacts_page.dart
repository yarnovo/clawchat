import 'package:flutter/material.dart';
import '../../services/service_provider.dart';
import 'add_friend_page.dart';
import 'friend_requests_page.dart';

class ContactsPage extends StatefulWidget {
  /// 宽屏模式下点击好友的回调
  final void Function(String conversationId, String name, String avatar)?
      onFriendTap;

  /// 宽屏模式下导航到二级页面的回调
  final void Function(Widget page)? onNavigate;

  /// 嵌入模式下不包 Scaffold
  final bool embedded;

  const ContactsPage({
    super.key,
    this.onFriendTap,
    this.onNavigate,
    this.embedded = false,
  });

  @override
  State<ContactsPage> createState() => ContactsPageState();
}

class ContactsPageState extends State<ContactsPage> {
  void reload() => _load();
  List<Map<String, dynamic>> _friends = [];
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _load();
  }

  Future<void> _load() async {
    final api = ServiceProvider.of(context);
    final res = await api.getFriends();
    if (mounted) {
      setState(() {
        _loading = false;
        if (res.ok) _friends = res.data;
      });
    }
  }

  void _onAddFriend() async {
    if (widget.onNavigate != null) {
      widget.onNavigate!(const AddFriendPage());
    } else {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const AddFriendPage()),
      );
      _load();
    }
  }

  void _onFriendRequests() async {
    if (widget.onNavigate != null) {
      widget.onNavigate!(const FriendRequestsPage());
    } else {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const FriendRequestsPage()),
      );
      _load();
    }
  }

  void _onFriendTap(Map<String, dynamic> item) async {
    final api = ServiceProvider.of(context);
    final res = await api.createConversation(
      friendId: item['friend']['id'],
    );
    if (res.ok && mounted) {
      final name = item['friend']['name'] ?? '';
      final avatar = item['friend']['avatar'] ?? '👤';
      final conversationId = res.data['id'] as String;

      if (widget.onFriendTap != null) {
        widget.onFriendTap!(conversationId, name, avatar);
      } else {
        Navigator.pushNamed(
          context,
          '/chat_detail',
          arguments: {
            'name': name,
            'avatar': avatar,
            'conversationId': conversationId,
          },
        );
      }
    }
  }

  Widget _buildBody() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        children: [
          _FunctionEntry(
            icon: Icons.group,
            color: const Color(0xFF07C160),
            title: '新的朋友',
            onTap: _onFriendRequests,
          ),
          _FunctionEntry(
            icon: Icons.people,
            color: const Color(0xFF576B95),
            title: '群聊',
            onTap: () {},
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_friends.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(
                child:
                    Text('暂无好友', style: TextStyle(color: Colors.grey)),
              ),
            )
          else
            for (final item in _friends)
              _FriendItem(
                name: item['friend']['name'] ?? '',
                avatar: item['friend']['avatar'],
                email: item['friend']['email'] ?? '',
                onTap: () => _onFriendTap(item),
              ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.embedded) {
      return Column(
        children: [
          Container(
            color: const Color(0xFFEDEDED),
            padding: const EdgeInsets.only(left: 16, right: 4, top: 8),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    '通讯录',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF191919),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.person_add_outlined, size: 22),
                  onPressed: _onAddFriend,
                ),
              ],
            ),
          ),
          Expanded(child: _buildBody()),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('通讯录'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined, size: 22),
            onPressed: _onAddFriend,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }
}

class _FunctionEntry extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final VoidCallback onTap;

  const _FunctionEntry({
    required this.icon,
    required this.color,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          InkWell(
            onTap: onTap,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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

class _FriendItem extends StatelessWidget {
  final String name;
  final String? avatar;
  final String email;
  final VoidCallback onTap;

  const _FriendItem({
    required this.name,
    required this.avatar,
    required this.email,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          InkWell(
            onTap: onTap,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                      avatar ?? '👤',
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    name,
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
