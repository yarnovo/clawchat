import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/service_provider.dart';
import '../../services/ws_service.dart';
import '../contacts/add_friend_page.dart';
import '../contacts/create_agent_page.dart';

class ChatListPage extends StatefulWidget {
  /// 宽屏模式下点击会话的回调，为 null 时使用 Navigator.pushNamed
  final void Function(String conversationId, String name, String avatar)?
      onItemTap;

  /// 宽屏模式下导航到二级页面的回调
  final void Function(Widget page)? onNavigate;

  /// 当前选中的会话 ID（宽屏模式下高亮用）
  final String? selectedConversationId;

  /// 嵌入模式下不包 Scaffold
  final bool embedded;

  const ChatListPage({
    super.key,
    this.onItemTap,
    this.onNavigate,
    this.selectedConversationId,
    this.embedded = false,
  });

  @override
  State<ChatListPage> createState() => ChatListPageState();
}

class ChatListPageState extends State<ChatListPage> {
  void reload() => _load();
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;
  StreamSubscription? _wsSub;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _load();
      _listenWs();
    }
  }

  void _listenWs() {
    _wsSub?.cancel();
    _wsSub = WsService.instance.messages.listen((msg) {
      if (!mounted) return;
      final type = msg['type'] as String?;
      if (type != 'new_message') return;
      final data = msg['data'] as Map<String, dynamic>?;
      if (data == null) return;

      final convId = data['conversationId'] as String?;
      if (convId == null) return;

      setState(() {
        final idx = _conversations.indexWhere((c) => c['id'] == convId);
        if (idx >= 0) {
          _conversations[idx] = {
            ..._conversations[idx],
            'lastMessage': {
              'content': data['content'],
              'createdAt': data['createdAt'],
            },
          };
          if (idx > 0) {
            final conv = _conversations.removeAt(idx);
            _conversations.insert(0, conv);
          }
        } else {
          _load();
        }
      });
    });
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
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

  void _onMenuSelected(String value) async {
    Widget page;
    if (value == 'add') {
      page = const AddFriendPage();
    } else {
      page = const CreateAgentPage();
    }
    if (widget.onNavigate != null) {
      widget.onNavigate!(page);
    } else {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => page),
      );
      _load();
    }
  }

  void _onConversationTap(Map<String, dynamic> conv) async {
    final friend = conv['friend'] as Map<String, dynamic>?;
    final name = friend?['name'] ?? '未知';
    final avatar = friend?['avatar'] ?? '👤';
    final conversationId = conv['id'] as String;

    if (widget.onItemTap != null) {
      widget.onItemTap!(conversationId, name, avatar);
    } else {
      await Navigator.pushNamed(
        context,
        '/chat_detail',
        arguments: {
          'name': name,
          'avatar': avatar,
          'conversationId': conversationId,
        },
      );
      _load();
    }
  }

  Widget _buildAppBarActions() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.search, size: 22),
          onPressed: () {},
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.add_circle_outline, size: 22),
          onSelected: _onMenuSelected,
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'add', child: Text('添加朋友')),
            PopupMenuItem(value: 'create', child: Text('创建朋友')),
          ],
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: _conversations.isEmpty
          ? ListView(
              children: const [
                SizedBox(height: 200),
                Center(
                  child:
                      Text('暂无聊天', style: TextStyle(color: Colors.grey)),
                ),
              ],
            )
          : ListView.builder(
              itemCount: _conversations.length,
              itemBuilder: (context, index) {
                final conv = _conversations[index];
                final friend = conv['friend'] as Map<String, dynamic>?;
                final lastMsg =
                    conv['lastMessage'] as Map<String, dynamic>?;
                final isSelected =
                    widget.selectedConversationId == conv['id'];

                return _ChatItem(
                  name: friend?['name'] ?? '未知',
                  avatar: friend?['avatar'] ?? '👤',
                  lastMessage: lastMsg?['content'] ?? '',
                  time: _formatTime(lastMsg?['createdAt']),
                  selected: isSelected,
                  onTap: () => _onConversationTap(conv),
                );
              },
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
                    'ClawChat',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF191919),
                    ),
                  ),
                ),
                _buildAppBarActions(),
              ],
            ),
          ),
          Expanded(child: _buildBody()),
        ],
      );
    }

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
            onSelected: _onMenuSelected,
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'add', child: Text('添加朋友')),
              PopupMenuItem(value: 'create', child: Text('创建朋友')),
            ],
          ),
        ],
      ),
      body: _buildBody(),
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
  final bool selected;
  final VoidCallback onTap;

  const _ChatItem({
    required this.name,
    required this.avatar,
    required this.lastMessage,
    required this.time,
    this.selected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: selected ? const Color(0xFFD8D8D8) : Colors.white,
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
