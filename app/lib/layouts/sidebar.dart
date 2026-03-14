import 'package:flutter/material.dart';

class Sidebar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const Sidebar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      color: const Color(0xFFE7E7E7),
      child: Column(
        children: [
          const SizedBox(height: 16),
          _SidebarIcon(
            icon: Icons.chat_bubble_outline,
            activeIcon: Icons.chat_bubble,
            label: '聊天',
            selected: currentIndex == 0,
            onTap: () => onTap(0),
          ),
          _SidebarIcon(
            icon: Icons.contacts_outlined,
            activeIcon: Icons.contacts,
            label: '通讯录',
            selected: currentIndex == 1,
            onTap: () => onTap(1),
          ),
          _SidebarIcon(
            icon: Icons.explore_outlined,
            activeIcon: Icons.explore,
            label: '发现',
            selected: currentIndex == 2,
            onTap: () => onTap(2),
          ),
          _SidebarIcon(
            icon: Icons.person_outline,
            activeIcon: Icons.person,
            label: '我',
            selected: currentIndex == 3,
            onTap: () => onTap(3),
          ),
        ],
      ),
    );
  }
}

class _SidebarIcon extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SidebarIcon({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 56,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFD6D6D6) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                selected ? activeIcon : icon,
                size: 24,
                color: selected
                    ? const Color(0xFF07C160)
                    : const Color(0xFF191919),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  color: selected
                      ? const Color(0xFF07C160)
                      : const Color(0xFF191919),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
