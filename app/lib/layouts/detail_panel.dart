import 'package:flutter/material.dart';
import 'navigation_state.dart';
import '../pages/chat/chat_detail_page.dart';
import '../pages/contacts/add_friend_page.dart';
import '../pages/contacts/create_agent_page.dart';
import '../pages/contacts/friend_requests_page.dart';

class DetailPanel extends StatelessWidget {
  final DetailContent? content;
  final VoidCallback? onDone;

  const DetailPanel({super.key, this.content, this.onDone});

  @override
  Widget build(BuildContext context) {
    final detail = content;

    if (detail == null) {
      return Container(
        color: const Color(0xFFF5F5F5),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.chat_bubble_outline, size: 64, color: Color(0xFFCCCCCC)),
              SizedBox(height: 16),
              Text(
                '选择一个聊天',
                style: TextStyle(fontSize: 16, color: Color(0xFFAAAAAA)),
              ),
            ],
          ),
        ),
      );
    }

    if (detail is ChatDetailContent) {
      return ChatDetailPage(
        key: ValueKey('chat_${detail.conversationId}'),
        name: detail.name,
        avatar: detail.avatar,
        conversationId: detail.conversationId,
        embedded: true,
      );
    }

    if (detail is AddFriendContent) {
      return AddFriendPage(
        key: const ValueKey('add_friend'),
        embedded: true,
        onDone: onDone,
      );
    }

    if (detail is CreateAgentContent) {
      return CreateAgentPage(
        key: const ValueKey('create_agent'),
        embedded: true,
        onDone: onDone,
      );
    }

    if (detail is FriendRequestsContent) {
      return FriendRequestsPage(
        key: const ValueKey('friend_requests'),
        embedded: true,
        onDone: onDone,
      );
    }

    return const SizedBox.shrink();
  }
}
