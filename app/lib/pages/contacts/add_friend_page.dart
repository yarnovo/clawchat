import 'package:flutter/material.dart';
import '../../services/service_provider.dart';

class AddFriendPage extends StatefulWidget {
  final bool embedded;
  final VoidCallback? onDone;

  const AddFriendPage({super.key, this.embedded = false, this.onDone});

  @override
  State<AddFriendPage> createState() => _AddFriendPageState();
}

class _AddFriendPageState extends State<AddFriendPage> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _message;
  bool _success = false;

  Future<void> _send() async {
    final email = _controller.text.trim();
    if (email.isEmpty) return;

    setState(() {
      _loading = true;
      _message = null;
    });

    final api = ServiceProvider.of(context);
    final res = await api.sendFriendRequest(email: email);

    setState(() {
      _loading = false;
      _success = res.ok;
      _message = res.ok ? '好友申请已发送' : (res.data['error'] ?? '发送失败');
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final body = Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: _controller,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: '输入对方邮箱',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _send(),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                onPressed: _loading ? null : _send,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF07C160),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('发送好友申请'),
              ),
            ),
            if (_message != null) ...[
              const SizedBox(height: 16),
              Text(
                _message!,
                style: TextStyle(
                  color: _success ? const Color(0xFF07C160) : Colors.red,
                ),
              ),
            ],
          ],
        ),
      );

    if (widget.embedded) {
      return Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          title: const Text('添加好友'),
        ),
        body: body,
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('添加好友')),
      body: body,
    );
  }
}
