import 'package:flutter/material.dart';
import '../../services/service_provider.dart';

const _defaultAvatars = ['🤖', '🐱', '🐶', '🦊', '🐼', '🐸', '🦉', '🐙'];

const _models = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'deepseek-chat',
];

class CreateAgentPage extends StatefulWidget {
  const CreateAgentPage({super.key});

  @override
  State<CreateAgentPage> createState() => _CreateAgentPageState();
}

class _CreateAgentPageState extends State<CreateAgentPage> {
  final _nameController = TextEditingController();
  String _selectedAvatar = '🤖';
  String _selectedModel = _models.first;
  bool _submitting = false;

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    setState(() => _submitting = true);
    final api = ServiceProvider.of(context);
    final res = await api.createAgent(name: name, avatar: _selectedAvatar, model: _selectedModel);
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('创建朋友')),
      body: Padding(
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
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: '名称',
                hintText: '给你的 Agent 起个名字',
                border: OutlineInputBorder(),
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              initialValue: _selectedModel,
              decoration: const InputDecoration(
                labelText: '模型',
                border: OutlineInputBorder(),
              ),
              items: _models.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) {
                if (v != null) setState(() => _selectedModel = v);
              },
            ),
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
