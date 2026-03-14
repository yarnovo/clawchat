import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/service_provider.dart';
import '../../services/ws_service.dart';

class ChatDetailPage extends StatefulWidget {
  final String name;
  final String avatar;
  final String conversationId;

  const ChatDetailPage({
    super.key,
    required this.name,
    required this.avatar,
    required this.conversationId,
  });

  @override
  State<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends State<ChatDetailPage> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  String? _myId;
  StreamSubscription? _wsSub;
  bool _initialized = false;
  bool _peerTyping = false;
  Timer? _typingTimer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _loadInitial();
    }
  }

  Future<void> _loadInitial() async {
    final api = ServiceProvider.of(context);
    final meRes = await api.getMe();
    if (meRes.ok) {
      _myId = meRes.data['id'] as String;
    }
    await _loadMessages();
    _listenWs();
  }

  void _listenWs() {
    _wsSub?.cancel();
    _wsSub = WsService.instance.messages.listen((msg) {
      if (!mounted) return;
      final type = msg['type'] as String?;
      final data = msg['data'] as Map<String, dynamic>?;
      if (data == null) return;
      if (data['conversationId'] != widget.conversationId) return;

      if (type == 'typing') {
        setState(() => _peerTyping = true);
        _typingTimer?.cancel();
        _typingTimer = Timer(const Duration(seconds: 30), () {
          if (mounted) setState(() => _peerTyping = false);
        });
        return;
      }

      if (type != 'new_message') return;
      // Clear typing indicator when message arrives
      _typingTimer?.cancel();
      if (_peerTyping) setState(() => _peerTyping = false);
      // Avoid duplicates
      final msgId = data['id'] as String?;
      if (_messages.any((m) => m['id'] == msgId)) return;
      setState(() {
        _messages.add(data);
      });
      _scrollToBottom();
    });
  }

  Future<void> _loadMessages() async {
    final api = ServiceProvider.of(context);
    final res = await api.getMessages(conversationId: widget.conversationId);
    if (mounted) {
      setState(() {
        _loading = false;
        if (res.ok) _messages = res.data;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _controller.clear();
    _focusNode.requestFocus();

    final api = ServiceProvider.of(context);
    final res = await api.sendMessage(
      conversationId: widget.conversationId,
      content: text,
    );
    if (res.ok && mounted) {
      setState(() {
        _messages.add(res.data);
      });
      _scrollToBottom();
    }
  }

  String _formatTime(String? isoTime) {
    if (isoTime == null) return '';
    final dt = DateTime.tryParse(isoTime);
    if (dt == null) return '';
    final local = dt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    _typingTimer?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(widget.name),
            if (_peerTyping)
              const Text(
                '正在输入...',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal, color: Colors.grey),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_horiz, size: 22),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              color: const Color(0xFFEDEDED),
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        final msg = _messages[index];
                        final sender =
                            msg['sender'] as Map<String, dynamic>? ?? {};
                        final isMine = sender['id'] == _myId;
                        return _MessageBubble(
                          content: msg['content'] as String? ?? '',
                          isMine: isMine,
                          avatar: isMine ? '🐱' : widget.avatar,
                          time: _formatTime(msg['createdAt'] as String?),
                        );
                      },
                    ),
            ),
          ),
          Container(
            color: const Color(0xFFF7F7F7),
            padding: EdgeInsets.only(
              left: 8,
              right: 8,
              top: 8,
              bottom: MediaQuery.of(context).padding.bottom + 8,
            ),
            child: Row(
              children: [
                IconButton(
                  icon:
                      const Icon(Icons.keyboard_voice_outlined, size: 28),
                  color: const Color(0xFF191919),
                  onPressed: () {},
                ),
                Expanded(
                  child: Container(
                    constraints: const BoxConstraints(maxHeight: 100),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onEditingComplete: _sendMessage,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.emoji_emotions_outlined, size: 28),
                  color: const Color(0xFF191919),
                  onPressed: () {},
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline, size: 28),
                  color: const Color(0xFF191919),
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final String content;
  final bool isMine;
  final String avatar;
  final String time;

  const _MessageBubble({
    required this.content,
    required this.isMine,
    required this.avatar,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment:
            isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMine) ...[
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F0F0),
                borderRadius: BorderRadius.circular(6),
              ),
              alignment: Alignment.center,
              child: Text(avatar, style: const TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isMine ? const Color(0xFF95EC69) : Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                content,
                style: const TextStyle(
                  fontSize: 16,
                  color: Color(0xFF191919),
                ),
              ),
            ),
          ),
          if (isMine) ...[
            const SizedBox(width: 8),
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFF0F0F0),
                borderRadius: BorderRadius.circular(6),
              ),
              alignment: Alignment.center,
              child: Text(avatar, style: const TextStyle(fontSize: 20)),
            ),
          ],
        ],
      ),
    );
  }
}
