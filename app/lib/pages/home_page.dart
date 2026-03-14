import 'package:flutter/material.dart';
import '../layouts/navigation_state.dart';
import '../layouts/desktop_layout.dart';
import 'chat/chat_list_page.dart';
import 'contacts/contacts_page.dart';
import 'discover/discover_page.dart';
import 'profile/profile_page.dart';

/// 宽屏断点
const double kDesktopBreakpoint = 768;

class HomePage extends StatefulWidget {
  final VoidCallback? onLogout;

  const HomePage({super.key, this.onLogout});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _navigationState = NavigationState();
  final _chatKey = GlobalKey<ChatListPageState>();
  final _contactsKey = GlobalKey<ContactsPageState>();

  late final List<Widget> _mobilePages = [
    ChatListPage(key: _chatKey),
    ContactsPage(key: _contactsKey),
    const DiscoverPage(),
    ProfilePage(onLogout: widget.onLogout),
  ];

  @override
  void dispose() {
    _navigationState.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isDesktop = width >= kDesktopBreakpoint;

    if (isDesktop) {
      return DesktopLayout(
        navigationState: _navigationState,
        onLogout: widget.onLogout,
      );
    }

    return ListenableBuilder(
      listenable: _navigationState,
      builder: (context, _) {
        return Scaffold(
          body: IndexedStack(
            index: _navigationState.currentTab,
            children: _mobilePages,
          ),
          bottomNavigationBar: Theme(
            data: Theme.of(context).copyWith(
              splashFactory: NoSplash.splashFactory,
            ),
            child: BottomNavigationBar(
              currentIndex: _navigationState.currentTab,
              onTap: (index) {
                _navigationState.selectTab(index);
                if (index == 0) _chatKey.currentState?.reload();
                if (index == 1) _contactsKey.currentState?.reload();
              },
              type: BottomNavigationBarType.fixed,
              backgroundColor: const Color(0xFFF7F7F7),
              selectedItemColor: const Color(0xFF07C160),
              unselectedItemColor: const Color(0xFF191919),
              selectedFontSize: 11,
              unselectedFontSize: 11,
              iconSize: 24,
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.chat_bubble_outline),
                  activeIcon: Icon(Icons.chat_bubble),
                  label: '聊天',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.contacts_outlined),
                  activeIcon: Icon(Icons.contacts),
                  label: '通讯录',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.explore_outlined),
                  activeIcon: Icon(Icons.explore),
                  label: '发现',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  activeIcon: Icon(Icons.person),
                  label: '我',
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
