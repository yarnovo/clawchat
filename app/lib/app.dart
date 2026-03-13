import 'package:flutter/material.dart';
import 'pages/home_page.dart';
import 'pages/chat/chat_detail_page.dart';
import 'pages/auth/login_page.dart';
import 'pages/auth/register_page.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/service_provider.dart';

class ClawChatApp extends StatefulWidget {
  final AuthService? authService;
  final ApiClient? apiClient;

  const ClawChatApp({super.key, this.authService, this.apiClient});

  @override
  State<ClawChatApp> createState() => _ClawChatAppState();
}

class _ClawChatAppState extends State<ClawChatApp> {
  late final AuthService _authService;
  late final ApiClient _apiClient;
  bool? _isLoggedIn;

  @override
  void initState() {
    super.initState();
    _authService = widget.authService ?? AuthService();
    _apiClient = widget.apiClient ??
        ApiClient(
          baseUrl: 'http://localhost:3000',
          authService: _authService,
        );
    _checkLogin();
  }

  Future<void> _checkLogin() async {
    final loggedIn = await _authService.isLoggedIn();
    setState(() => _isLoggedIn = loggedIn);
  }

  void _onAuthSuccess() {
    setState(() => _isLoggedIn = true);
  }

  void _onLogout() async {
    await _authService.logout();
    setState(() => _isLoggedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    return ServiceProvider(
      apiClient: _apiClient,
      child: MaterialApp(
      title: 'ClawChat',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF07C160),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFEDEDED),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFEDEDED),
          foregroundColor: Color(0xFF191919),
          elevation: 0,
          scrolledUnderElevation: 0.5,
          titleTextStyle: TextStyle(
            color: Color(0xFF191919),
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: Color(0xFFE0E0E0),
          thickness: 0.5,
          space: 0,
        ),
      ),
      home: _buildHome(),
      onGenerateRoute: (settings) {
        if (settings.name == '/chat_detail') {
          final args = settings.arguments as Map<String, dynamic>;
          return MaterialPageRoute(
            builder: (_) => ChatDetailPage(
              name: args['name'] as String,
              avatar: args['avatar'] as String,
              conversationId: args['conversationId'] as String,
            ),
          );
        }
        if (settings.name == '/register') {
          return MaterialPageRoute(
            builder: (_) => RegisterPage(
              apiClient: _apiClient,
              authService: _authService,
              onRegisterSuccess: _onAuthSuccess,
            ),
          );
        }
        return null;
      },
    ),
    );
  }

  Widget _buildHome() {
    if (_isLoggedIn == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_isLoggedIn!) {
      return HomePage(onLogout: _onLogout);
    }
    return LoginPage(
      apiClient: _apiClient,
      authService: _authService,
      onLoginSuccess: _onAuthSuccess,
    );
  }
}
