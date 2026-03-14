import 'package:flutter/material.dart';
import 'my_agents_page.dart';

class ProfilePage extends StatelessWidget {
  final VoidCallback? onLogout;
  final bool embedded;

  const ProfilePage({super.key, this.onLogout, this.embedded = false});

  @override
  Widget build(BuildContext context) {
    final body = ListView(
        children: [
          // 个人信息卡片
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: InkWell(
              onTap: () {},
              child: Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F0F0),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text('🐱', style: TextStyle(fontSize: 36)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ClawChat 用户',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF191919),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '微信号: clawchat_001',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.qr_code,
                    color: Color(0xFFB0B0B0),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.chevron_right,
                    color: Color(0xFFB0B0B0),
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          // 功能项
          const _ProfileSection(
            items: [
              _ProfileItem(icon: Icons.payment, title: '服务'),
            ],
          ),
          const SizedBox(height: 8),
          _ProfileSection(
            items: [
              _ProfileItem(
                icon: Icons.smart_toy,
                title: '我的 Agent',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MyAgentsPage()),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          const _ProfileSection(
            items: [
              _ProfileItem(icon: Icons.settings, title: '设置'),
            ],
          ),
          if (onLogout != null) ...[
            const SizedBox(height: 8),
            Container(
              color: Colors.white,
              width: double.infinity,
              child: InkWell(
                onTap: onLogout,
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Text(
                    '退出登录',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.red,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      );

    if (embedded) {
      return Column(
        children: [
          Container(
            color: const Color(0xFFEDEDED),
            padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 8),
            child: const Row(
              children: [
                Text(
                  '我',
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
      appBar: AppBar(title: const Text('我')),
      body: body,
    );
  }
}

class _ProfileSection extends StatelessWidget {
  final List<_ProfileItem> items;

  const _ProfileSection({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            items[i],
            if (i < items.length - 1)
              const Padding(
                padding: EdgeInsets.only(left: 56),
                child: Divider(),
              ),
          ],
        ],
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback? onTap;

  const _ProfileItem({
    required this.icon,
    required this.title,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap ?? () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF576B95), size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  color: Color(0xFF191919),
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: Color(0xFFB0B0B0),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
