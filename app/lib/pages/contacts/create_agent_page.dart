import 'package:flutter/material.dart';
import '../../services/service_provider.dart';

const _defaultAvatars = ['🤖', '🐱', '🐶', '🦊', '🐼', '🐸', '🦉', '🐙'];

const _defaultBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

enum AgentRuntime { openclaw, nanoclaw }

class CreateAgentPage extends StatefulWidget {
  const CreateAgentPage({super.key});

  @override
  State<CreateAgentPage> createState() => _CreateAgentPageState();
}

class _CreateAgentPageState extends State<CreateAgentPage> {
  final _nameController = TextEditingController();
  final _modelController = TextEditingController(text: 'qwen-max');
  final _apiKeyController = TextEditingController();
  final _baseUrlController = TextEditingController(text: _defaultBaseUrl);
  String _selectedAvatar = '🤖';
  AgentRuntime _runtime = AgentRuntime.openclaw;
  bool _showAdvanced = false;
  bool _submitting = false;

  void _onRuntimeChanged(AgentRuntime runtime) {
    setState(() {
      _runtime = runtime;
      if (runtime == AgentRuntime.nanoclaw) {
        _modelController.text = 'claude-sonnet-4-20250514';
        _baseUrlController.text = '';
      } else {
        _modelController.text = 'qwen-max';
        _baseUrlController.text = _defaultBaseUrl;
      }
    });
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    final model = _modelController.text.trim();
    final apiKey = _apiKeyController.text.trim();
    final baseUrl = _baseUrlController.text.trim();

    setState(() => _submitting = true);
    final api = ServiceProvider.of(context);
    final res = await api.createAgent(
      name: name,
      avatar: _selectedAvatar,
      model: model.isNotEmpty ? model : null,
      apiKey: apiKey.isNotEmpty ? apiKey : null,
      apiBaseUrl: baseUrl.isNotEmpty && baseUrl != _defaultBaseUrl ? baseUrl : null,
      runtime: _runtime == AgentRuntime.nanoclaw ? 'nanoclaw' : null,
    );
    if (!mounted) return;

    if (res.ok) {
      // 自动创建会话
      final accountId = res.data['accountId'] as String?;
      if (accountId != null) {
        await api.createConversation(friendId: accountId);
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } else {
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res.data['error'] ?? '创建失败')),
      );
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _modelController.dispose();
    _apiKeyController.dispose();
    _baseUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('创建朋友')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('选择头像', style: TextStyle(fontSize: 14, color: Colors.grey)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 12,
              children: _defaultAvatars.map((emoji) {
                final selected = _selectedAvatar == emoji;
                return GestureDetector(
                  onTap: () => setState(() => _selectedAvatar = emoji),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: selected ? const Color(0xFF07C160).withValues(alpha: 0.15) : const Color(0xFFF0F0F0),
                      borderRadius: BorderRadius.circular(8),
                      border: selected ? Border.all(color: const Color(0xFF07C160), width: 2) : null,
                    ),
                    alignment: Alignment.center,
                    child: Text(emoji, style: const TextStyle(fontSize: 24)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            const Text('运行时', style: TextStyle(fontSize: 14, color: Colors.grey)),
            const SizedBox(height: 8),
            SegmentedButton<AgentRuntime>(
              segments: const [
                ButtonSegment(value: AgentRuntime.openclaw, label: Text('OpenClaw')),
                ButtonSegment(value: AgentRuntime.nanoclaw, label: Text('NanoClaw')),
              ],
              selected: {_runtime},
              onSelectionChanged: (v) => _onRuntimeChanged(v.first),
              style: ButtonStyle(
                visualDensity: VisualDensity.compact,
              ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: '名称',
                hintText: '给你的 Agent 起个名字',
                border: OutlineInputBorder(),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _modelController,
              decoration: const InputDecoration(
                labelText: '模型',
                hintText: 'qwen-max',
                border: OutlineInputBorder(),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _apiKeyController,
              decoration: InputDecoration(
                labelText: _runtime == AgentRuntime.nanoclaw ? 'Anthropic API Key' : 'API Key',
                hintText: _runtime == AgentRuntime.nanoclaw ? 'sk-ant-...' : 'sk-...',
                border: const OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            // 高级设置折叠区
            GestureDetector(
              onTap: () => setState(() => _showAdvanced = !_showAdvanced),
              child: Row(
                children: [
                  Icon(
                    _showAdvanced ? Icons.expand_less : Icons.expand_more,
                    size: 20,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 4),
                  const Text('高级设置', style: TextStyle(fontSize: 14, color: Colors.grey)),
                ],
              ),
            ),
            if (_showAdvanced) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _baseUrlController,
                decoration: InputDecoration(
                  labelText: 'API Base URL',
                  hintText: _runtime == AgentRuntime.nanoclaw
                      ? 'https://openrouter.ai/api'
                      : _defaultBaseUrl,
                  border: const OutlineInputBorder(),
                  helperText: _runtime == AgentRuntime.nanoclaw
                      ? '使用 OpenRouter 等代理时填写'
                      : '大多数模型厂商都兼容 OpenAI API 格式',
                ),
              ),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF07C160),
                  foregroundColor: Colors.white,
                ),
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('创建'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
