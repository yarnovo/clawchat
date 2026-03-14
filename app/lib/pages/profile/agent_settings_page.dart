import 'package:flutter/material.dart';
import '../../services/service_provider.dart';

class AgentSettingsPage extends StatefulWidget {
  final Map<String, dynamic> agent;

  const AgentSettingsPage({super.key, required this.agent});

  @override
  State<AgentSettingsPage> createState() => _AgentSettingsPageState();
}

class _AgentSettingsPageState extends State<AgentSettingsPage> {
  bool _searchable = false;
  List<Map<String, dynamic>> _friendRequests = [];
  bool _loadingRequests = true;
  bool _loaded = false;

  String get _agentId => widget.agent['id'] as String;
  String get _agentName => widget.agent['name'] as String;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_loaded) {
      _loaded = true;
      _loadFriendRequests();
    }
  }

  Future<void> _loadFriendRequests() async {
    final api = ServiceProvider.of(context);
    final res = await api.getAgentFriendRequests(agentId: _agentId);
    if (mounted) {
      setState(() {
        _friendRequests = res.ok ? res.data : [];
        _loadingRequests = false;
      });
    }
  }

  Future<void> _toggleSearchable(bool value) async {
    final api = ServiceProvider.of(context);
    final res = await api.setAgentVisibility(agentId: _agentId, searchable: value);
    if (mounted && res.ok) {
      setState(() => _searchable = value);
    }
  }

  Future<void> _handleRequest(String requestId, String status) async {
    final api = ServiceProvider.of(context);
    final res = await api.handleAgentFriendRequest(
      agentId: _agentId,
      requestId: requestId,
      status: status,
    );
    if (mounted && res.ok) {
      setState(() {
        _friendRequests.removeWhere((r) => r['id'] == requestId);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_agentName)),
      body: ListView(
        children: [
          // 可搜索开关
          Container(
            color: Colors.white,
            child: SwitchListTile(
              title: const Text('允许被搜索'),
              subtitle: const Text('开启后其他用户可以搜索到这个 Agent'),
              value: _searchable,
              onChanged: _toggleSearchable,
              activeThumbColor: const Color(0xFF07C160),
            ),
          ),
          const SizedBox(height: 8),
          // 好友请求列表
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              '待处理的好友请求',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
          ),
          if (_loadingRequests)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_friendRequests.isEmpty)
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: const Center(
                child: Text(
                  '暂无待处理的请求',
                  style: TextStyle(fontSize: 14, color: Color(0xFF999999)),
                ),
              ),
            )
          else
            ...List.generate(_friendRequests.length, (index) {
              final req = _friendRequests[index];
              final reqId = req['id'] as String;
              final sender = req['accountA'] as Map<String, dynamic>;
              final senderName = sender['name'] as String;
              final senderAvatar = sender['avatar'] as String?;

              return Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F0F0),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        senderAvatar ?? '👤',
                        style: const TextStyle(fontSize: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        senderName,
                        style: const TextStyle(fontSize: 15),
                      ),
                    ),
                    TextButton(
                      onPressed: () => _handleRequest(reqId, 'rejected'),
                      child: const Text(
                        '拒绝',
                        style: TextStyle(color: Color(0xFF999999)),
                      ),
                    ),
                    const SizedBox(width: 4),
                    ElevatedButton(
                      onPressed: () => _handleRequest(reqId, 'accepted'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF07C160),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      child: const Text('接受'),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
