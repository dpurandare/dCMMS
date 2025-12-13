import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/work_orders/screens/work_order_list_screen.dart';
import '../features/work_orders/screens/work_order_detail_screen.dart';
import 'auth/auth_service.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authService = ref.watch(authServiceProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final isLoggedIn = await authService.isAuthenticated();
      final isLoginRoute = state.uri.toString() == '/login';

      if (!isLoggedIn && !isLoginRoute) return '/login';
      if (isLoggedIn && isLoginRoute) return '/work-orders';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/work-orders',
        builder: (context, state) => const WorkOrderListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return WorkOrderDetailScreen(id: id);
            },
          ),
        ],
      ),
    ],
  );
});
