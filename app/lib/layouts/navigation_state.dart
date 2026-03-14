import 'package:flutter/foundation.dart';

/// 右侧详情面板的内容类型
sealed class DetailContent {}

class ChatDetailContent extends DetailContent {
  final String name;
  final String avatar;
  final String conversationId;

  ChatDetailContent({
    required this.name,
    required this.avatar,
    required this.conversationId,
  });
}

class AddFriendContent extends DetailContent {}

class FriendRequestsContent extends DetailContent {}

class CreateAgentContent extends DetailContent {}

/// 统一导航状态，管理 tab 索引 + 右侧面板内容
class NavigationState extends ChangeNotifier {
  int _currentTab = 0;
  DetailContent? _detail;

  int get currentTab => _currentTab;
  DetailContent? get detail => _detail;

  void selectTab(int index) {
    if (_currentTab == index) return;
    _currentTab = index;
    notifyListeners();
  }

  void showDetail(DetailContent content) {
    _detail = content;
    notifyListeners();
  }

  void clearDetail() {
    if (_detail == null) return;
    _detail = null;
    notifyListeners();
  }
}
