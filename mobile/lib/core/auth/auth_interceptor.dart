import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'auth_service.dart';

class AuthInterceptor extends Interceptor {
  final Ref _ref;
  final FlutterSecureStorage _storage;

  AuthInterceptor(this._ref, this._storage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: 'auth_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Attempt refresh
      try {
        // Read AuthService lazily to avoid circular dependency loop during initialization
        final authService = _ref.read(authServiceProvider);

        final refreshed = await authService.refreshToken();
        if (refreshed) {
          // Retry original request with new token
          final newToken = await _storage.read(key: 'auth_token');
          final options = err.requestOptions;
          options.headers['Authorization'] = 'Bearer $newToken';

          // We need a Dio instance to retry. We can use the one that triggered the error?
          // Or just create a new one. Using the one from the error request might re-trigger interceptor context?
          // Yes, we should use a new Dio or the base API one?
          // Creating a temporary Dio for the retry is safest to avoid complex loop states,
          // but normally we want to use the same client configuration.
          // However, err.requestOptions doesn't include the client.

          final retryDio = Dio(
            BaseOptions(
              baseUrl: options.baseUrl,
              connectTimeout: options.connectTimeout,
              receiveTimeout: options.receiveTimeout,
            ),
          );

          final response = await retryDio.request(
            options.path,
            data: options.data,
            queryParameters: options.queryParameters,
            options: Options(method: options.method, headers: options.headers),
          );

          return handler.resolve(response);
        } else {
          // Refresh failed
          await authService.logout();
        }
      } catch (e) {
        // Double fail
        final authService = _ref.read(authServiceProvider);
        await authService.logout();
      }
    }
    handler.next(err);
  }
}
