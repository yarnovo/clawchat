import 'package:flutter/material.dart';
import 'navigation_state.dart';
import 'sidebar.dart';
import 'detail_panel.dart';
import '../pages/chat/chat_list_page.dart';
import '../pages/contacts/contacts_page.dart';
import '../pages/contacts/add_friend_page.dart';
import '../pages/contacts/create_agent_page.dart';
import '../pages/contacts/friend_requests_page.dart';
import '../pages/discover/discover_page.dart';
import '../pages/profile/profile_page.dart';

class DesktopLayout extends StatefulWidget {
  final NavigationState navigationState;
  final VoidCallback? onLogout;

  const DesktopLayout({
    super.key,
    required this.navigationState,
    this.onLogout,
  });

  @override
  State<DesktopLayout> createState() => _DesktopLayoutState();
}

class _DesktopLayoutState extends State<DesktopLayout> {
  final _chatKey = GlobalKey<ChatListPageState>();
  final _contactsKey = GlobalKey<ContactsPageState>();

  NavigationState get nav => widget.navigationState;

  void _onItemTap(String conversationId, String name, String avatar) {
    nav.showDetail(ChatDetailContent(
      conversationId: conversationId,
      name: name,
      avatar: avatar,
    ));
  }

  void _onNavigate(Widget page) {
    if (page is AddFriendPage) {
      nav.showDetail(AddFriendContent());
    } else if (page is CreateAgentPage) {
      nav.showDetail(CreateAgentContent());
    } else if (page is FriendRequestsPage) {
      nav.showDetail(FriendRequestsContent());
    }
  }

  void _onDetailDone() {
    nav.clearDetail();
    _chatKey.currentState?.reload();
    _contactsKey.currentState?.reload();
  }

  String? get _selectedConversationId {
    final detail = nav.detail;
    if (detail is ChatDetailContent) return detail.conversationId;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: nav,
        builder: (context, _) {
          return Row(
            children: [
              Sidebar(
                currentIndex: nav.currentTab,
                onTap: (index) {
                  nav.selectTab(index);
                  if (index == 0) _chatKey.currentState?.reload();
                  if (index == 1) _contactsKey.currentState?.reload();
                },
              ),
              SizedBox(
                width: 280,
                child: _buildListPanel(),
              ),
              const VerticalDivider(width: 1),
              Expanded(
                child: DetailPanel(
                  content: nav.detail,
                  onDone: _onDetailDone,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildListPanel() {
    return IndexedStack(
      index: nav.currentTab,
      children: [
        ChatListPage(
          key: _chatKey,
          embedded: true,
          selectedConversationId: _selectedConversationId,
          onItemTap: _onItemTap,
          onNavigate: _onNavigate,
        ),
        ContactsPage(
          key: _contactsKey,
          embedded: true,
          onFriendTap: _onItemTap,
          onNavigate: _onNavigate,
        ),
        const DiscoverPage(embedded: true),
        ProfilePage(embedded: true, onLogout: widget.onLogout),
      ],
    );
  }
}
