import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/service_provider.dart';

class DiscoverPage extends StatefulWidget {
  final bool embedded;

  const DiscoverPage({super.key, this.embedded = false});

  @override
  State<DiscoverPage> createState() => _DiscoverPageState();
}

class _DiscoverPageState extends State<DiscoverPage> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;
  final Set<String> _sentRequests = {};

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _doSearch(query);
    });
  }

  Future<void> _doSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _loading = false;
      });
      return;
    }

    setState(() => _loading = true);

    final api = ServiceProvider.of(context);
    final res = await api.searchAccounts(query: query.trim());
    if (mounted) {
      setState(() {
        _results = res.ok ? res.data : [];
        _loading = false;
      });
    }
  }

  Future<void> _sendRequest(String accountId) async {
    final api = ServiceProvider.of(context);
    final res = await api.sendFriendRequest(accountId: accountId);
    if (mounted && res.ok) {
      setState(() => _sentRequests.add(accountId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = Column(
      children: [
        // 搜索框
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: TextField(
            controller: _controller,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: '搜索用户或 Agent',
              prefixIcon: const Icon(Icons.search, color: Color(0xFFB0B0B0)),
              filled: true,
              fillColor: const Color(0xFFF0F0F0),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              suffixIcon: _controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18, color: Color(0xFFB0B0B0)),
                      onPressed: () {
                        _controller.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
            ),
          ),
        ),
        // 内容区
        Expanded(
          child: _buildContent(),
        ),
      ],
    );

    if (widget.embedded) {
      return Column(
        children: [
          Container(
            color: const Color(0xFFEDEDED),
            padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 8),
            child: const Row(
              children: [
                Text(
                  '发现',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF191919),
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: body),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('发现')),
      body: body,
    );
  }

  Widget _buildContent() {
    if (_controller.text.trim().isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search, size: 64, color: Color(0xFFD0D0D0)),
            SizedBox(height: 16),
            Text(
              '搜索用户名或 Agent 名称\n发现有趣的 AI Agent',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Color(0xFF999999)),
            ),
          ],
        ),
      );
    }

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_results.isEmpty) {
      return const Center(
        child: Text(
          '没有找到匹配的结果',
          style: TextStyle(fontSize: 14, color: Color(0xFF999999)),
        ),
      );
    }

    return ListView.separated(
      itemCount: _results.length,
      separatorBuilder: (_, _) => const Padding(
        padding: EdgeInsets.only(left: 72),
        child: Divider(height: 1),
      ),
      itemBuilder: (context, index) {
        final account = _results[index];
        final id = account['id'] as String;
        final name = account['name'] as String;
        final type = account['type'] as String;
        final avatar = account['avatar'] as String?;
        final sent = _sentRequests.contains(id);

        return Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // 头像
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: type == 'agent' ? const Color(0xFFE8F5E9) : const Color(0xFFF0F0F0),
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Text(
                  avatar ?? (type == 'agent' ? '🤖' : '👤'),
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(width: 12),
              // 名称 + 类型标签
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF191919),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: type == 'agent'
                            ? const Color(0xFFE8F5E9)
                            : const Color(0xFFF0F0F0),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        type == 'agent' ? 'Agent' : '用户',
                        style: TextStyle(
                          fontSize: 11,
                          color: type == 'agent'
                              ? const Color(0xFF4CAF50)
                              : const Color(0xFF999999),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // 加好友按钮
              SizedBox(
                height: 32,
                child: sent
                    ? OutlinedButton(
                        onPressed: null,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          side: const BorderSide(color: Color(0xFFD0D0D0)),
                        ),
                        child: const Text(
                          '已申请',
                          style: TextStyle(fontSize: 13, color: Color(0xFFB0B0B0)),
                        ),
                      )
                    : ElevatedButton(
                        onPressed: () => _sendRequest(id),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF07C160),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          elevation: 0,
                        ),
                        child: const Text('加好友', style: TextStyle(fontSize: 13)),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
