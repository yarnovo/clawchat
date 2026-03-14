import 'package:flutter/material.dart';

class DiscoverPage extends StatelessWidget {
  final bool embedded;

  const DiscoverPage({super.key, this.embedded = false});

  @override
  Widget build(BuildContext context) {
    final body = ListView(
        children: const [
          SizedBox(height: 8),
          _DiscoverSection(
            items: [
              _DiscoverItem(
                icon: Icons.camera_alt,
                color: Color(0xFF576B95),
                title: '朋友圈',
              ),
            ],
          ),
          SizedBox(height: 8),
          _DiscoverSection(
            items: [
              _DiscoverItem(
                icon: Icons.qr_code_scanner,
                color: Color(0xFF576B95),
                title: '扫一扫',
              ),
              _DiscoverItem(
                icon: Icons.vibration,
                color: Color(0xFF576B95),
                title: '摇一摇',
              ),
            ],
          ),
          SizedBox(height: 8),
          _DiscoverSection(
            items: [
              _DiscoverItem(
                icon: Icons.location_on,
                color: Color(0xFF576B95),
                title: '附近的人',
              ),
            ],
          ),
          SizedBox(height: 8),
          _DiscoverSection(
            items: [
              _DiscoverItem(
                icon: Icons.shopping_bag,
                color: Color(0xFF07C160),
                title: '购物',
              ),
              _DiscoverItem(
                icon: Icons.games,
                color: Color(0xFF07C160),
                title: '游戏',
              ),
            ],
          ),
          SizedBox(height: 8),
          _DiscoverSection(
            items: [
              _DiscoverItem(
                icon: Icons.article,
                color: Color(0xFF576B95),
                title: '小程序',
              ),
            ],
          ),
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
}

class _DiscoverSection extends StatelessWidget {
  final List<_DiscoverItem> items;

  const _DiscoverSection({required this.items});

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

class _DiscoverItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;

  const _DiscoverItem({
    required this.icon,
    required this.color,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
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
