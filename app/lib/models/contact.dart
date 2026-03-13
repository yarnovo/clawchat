class Contact {
  final String name;
  final String avatar;
  final String letter;

  const Contact({
    required this.name,
    required this.avatar,
    required this.letter,
  });
}

final List<Contact> mockContacts = [
  const Contact(name: '陈七', avatar: '👨‍💼', letter: 'C'),
  const Contact(name: '陈八', avatar: '👩‍💼', letter: 'C'),
  const Contact(name: '杜九', avatar: '🧔', letter: 'D'),
  const Contact(name: '冯十', avatar: '👲', letter: 'F'),
  const Contact(name: '韩梅梅', avatar: '👧', letter: 'H'),
  const Contact(name: '李四', avatar: '👩', letter: 'L'),
  const Contact(name: '李雷', avatar: '👦', letter: 'L'),
  const Contact(name: '王五', avatar: '🧑', letter: 'W'),
  const Contact(name: '王芳', avatar: '👩‍🦰', letter: 'W'),
  const Contact(name: '张三', avatar: '👨', letter: 'Z'),
  const Contact(name: '赵六', avatar: '👦', letter: 'Z'),
  const Contact(name: '周杰', avatar: '🧑‍🎤', letter: 'Z'),
];
