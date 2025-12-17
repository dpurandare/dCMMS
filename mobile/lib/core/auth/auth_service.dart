import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../database/app_database.dart';
import '../providers.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final AppDatabase _db;

  AuthService(this._dio, this._storage, this._db);

  // Stream to notify app of auth state changes (true = logged in, false = logged out)
  final _authStateController = StreamController<bool>.broadcast();
  Stream<bool> get authStateChanges => _authStateController.stream;

  Future<bool> login(String email, String password) async {
    try {
      // 1. Call API
      // Use 10.0.2.2 for Android Emulator to access host localhost
      // In a real app, this should be configurable
      // _dio.options.baseUrl is already set by provider

      final response = await _dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final token = response
            .data['accessToken']; // Was 'token' in previous code, backend sends 'accessToken'
        final refreshToken = response.data['refreshToken'];
        final userData = response.data['user'];

        final user = User(
          id: userData['id'],
          username: userData['username'],
          email: userData['email'],
          role: userData['role'],
        );

        // 2. Store Tokens
        await _storage.write(key: 'auth_token', value: token);
        await _storage.write(key: 'refresh_token', value: refreshToken);

        // 3. Store User Locally
        await _db.insertUser(user);

        _authStateController.add(true);
        return true;
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
    await _storage.delete(key: 'refresh_token');
    _authStateController.add(false);
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'auth_token');
    // We could check expiration here if we decoded JWT, but simple presence is okay for now
    return token != null;
  }

  Future<bool> refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      // Create a temporary Dio instance to avoid interceptor loops
      // We rely on the base URL from the main Dio
      final tempDio = Dio(
        BaseOptions(
          baseUrl: _dio.options.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      final response = await tempDio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        final newAccessToken = response.data['accessToken'];
        final newRefreshToken = response.data['refreshToken'];

        await _storage.write(key: 'auth_token', value: newAccessToken);
        if (newRefreshToken != null) {
          await _storage.write(key: 'refresh_token', value: newRefreshToken);
        }
        return true;
      }
      return false;
    } catch (e) {
      print('Refresh token failed: $e');
      return false;
    }
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final db = ref.watch(databaseProvider);
  final dio = ref.watch(dioProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthService(dio, storage, db);
});
