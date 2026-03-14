import 'package:flutter/material.dart';
import '../../services/service_provider.dart';
import 'agent_settings_page.dart';

class MyAgentsPage extends StatefulWidget {
  const MyAgentsPage({super.key});

  @override
  State<MyAgentsPage> createState() => _MyAgentsPageState();
}

class _MyAgentsPageState extends State<MyAgentsPage> {
  List<Map<String, dynamic>> _agents = [];
  bool _loading = true;
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_loaded) {
      _loaded = true;
      _load();
    }
  }

  Future<void> _load() async {
    final api = ServiceProvider.of(context);
    final res = await api.getMyAgents();
    if (mounted) {
      setState(() {
        _agents = res.ok ? res.data : [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('我的 Agent')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _agents.isEmpty
              ? const Center(
                  child: Text(
                    '还没有创建 Agent',
                    style: TextStyle(fontSize: 14, color: Color(0xFF999999)),
                  ),
                )
              : ListView.separated(
                  itemCount: _agents.length,
                  separatorBuilder: (_, _) => const Padding(
                    padding: EdgeInsets.only(left: 72),
                    child: Divider(height: 1),
                  ),
                  itemBuilder: (context, index) {
                    final agent = _agents[index];
                    final name = agent['name'] as String;
                    final avatar = agent['avatar'] as String?;
                    final config = agent['config'] as Map<String, dynamic>?;
                    final status = config?['status'] as String? ?? 'stopped';

                    return Container(
                      color: Colors.white,
                      child: ListTile(
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            avatar ?? '🤖',
                            style: const TextStyle(fontSize: 24),
                          ),
                        ),
                        title: Text(name),
                        subtitle: Text(
                          status == 'running' ? '运行中' : '已停止',
                          style: TextStyle(
                            fontSize: 12,
                            color: status == 'running'
                                ? const Color(0xFF4CAF50)
                                : const Color(0xFF999999),
                          ),
                        ),
                        trailing: const Icon(Icons.chevron_right, color: Color(0xFFB0B0B0)),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => AgentSettingsPage(agent: agent),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
