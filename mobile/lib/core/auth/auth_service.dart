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

  Future<bool> login(String email, String password) async {
    try {
      // 1. Call API
      // final response = await _dio.post('/auth/login', data: {'email': email, 'password': password});
      // final token = response.data['token'];
      // final user = response.data['user'];

      // MOCK implementation for now
      await Future.delayed(const Duration(seconds: 1));
      if (email == 'fail') throw Exception('Invalid credentials');

      const token = 'mock_token_123';
      final user = User(
        id: 'user_1',
        username: 'Test User',
        email: email,
        role: 'technician',
      );

      // 2. Store Token
      await _storage.write(key: 'auth_token', value: token);

      // 3. Store User Locally
      await _db.insertUser(user);

      return true;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null;
  }
}

final authServiceProvider = Provider<AuthService>((ref) {
  final db = ref.watch(databaseProvider);
  return AuthService(Dio(), const FlutterSecureStorage(), db);
});
