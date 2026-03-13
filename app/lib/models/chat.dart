class Chat {
  final String name;
  final String avatar;
  final String lastMessage;
  final String time;
  final int unreadCount;

  const Chat({
    required this.name,
    required this.avatar,
    required this.lastMessage,
    required this.time,
    this.unreadCount = 0,
  });
}

final List<Chat> mockChats = [
  const Chat(
    name: '文件传输助手',
    avatar: '📁',
    lastMessage: '[文件] 项目设计文档.pdf',
    time: '10:30',
  ),
  const Chat(
    name: '张三',
    avatar: '👨',
    lastMessage: '明天下午开会，记得带笔记本',
    time: '10:15',
    unreadCount: 2,
  ),
  const Chat(
    name: '前端开发群',
    avatar: '👥',
    lastMessage: '李四: 新版本已经发布了',
    time: '09:45',
    unreadCount: 5,
  ),
  const Chat(
    name: '李四',
    avatar: '👩',
    lastMessage: '好的，收到',
    time: '昨天',
  ),
  const Chat(
    name: '产品需求讨论',
    avatar: '💬',
    lastMessage: '王五: 需求文档已经更新',
    time: '昨天',
    unreadCount: 12,
  ),
  const Chat(
    name: '王五',
    avatar: '🧑',
    lastMessage: '[图片]',
    time: '周三',
  ),
  const Chat(
    name: '公司通知',
    avatar: '📢',
    lastMessage: '下周一全员大会通知',
    time: '周二',
  ),
  const Chat(
    name: '赵六',
    avatar: '👦',
    lastMessage: '周末一起打球吗？',
    time: '周一',
  ),
];
