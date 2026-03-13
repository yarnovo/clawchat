import 'package:flutter/material.dart';
import 'api_client.dart';

class ServiceProvider extends InheritedWidget {
  final ApiClient apiClient;

  const ServiceProvider({
    super.key,
    required this.apiClient,
    required super.child,
  });

  static ApiClient of(BuildContext context) {
    final provider = context.dependOnInheritedWidgetOfExactType<ServiceProvider>();
    assert(provider != null, 'No ServiceProvider found in context');
    return provider!.apiClient;
  }

  @override
  bool updateShouldNotify(ServiceProvider oldWidget) =>
      apiClient != oldWidget.apiClient;
}
