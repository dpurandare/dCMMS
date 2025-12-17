import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final genAIRepositoryProvider = Provider<GenAIRepository>((ref) {
  // Assuming Dio is provided elsewhere or creating a new instance
  // In a real app, you'd get the authenticated Dio client from another provider
  return GenAIRepository(
    Dio(
      BaseOptions(
        baseUrl:
            'http://localhost:3001/api/v1', // Update with actual API URL for emulator (10.0.2.2 usually)
        // headers: {'Authorization': 'Bearer ...'}
      ),
    ),
  );
});

class GenAIRepository {
  final Dio _dio;

  GenAIRepository(this._dio);

  Future<Map<String, dynamic>> chat(String query) async {
    try {
      final response = await _dio.post('/genai/chat', data: {'query': query});
      return response.data;
    } catch (e) {
      throw Exception('Failed to send message: $e');
    }
  }

  Future<Map<String, dynamic>> uploadDocument(
    File file, {
    String? assetId,
    String category = 'manual',
  }) async {
    try {
      String fileName = file.path.split('/').last;

      FormData formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
        'category': category,
        if (assetId != null) 'assetId': assetId,
      });

      final response = await _dio.post('/genai/upload', data: formData);
      return response.data;
    } catch (e) {
      throw Exception('Failed to upload document: $e');
    }
  }
}
