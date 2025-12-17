import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';

final genAIRepositoryProvider = Provider<GenAIRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return GenAIRepository(dio);
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

      // Expecting 202 Accepted with jobId, or 201 Created for sync (legacy)
      final response = await _dio.post('/genai/upload', data: formData);
      return response.data;
    } catch (e) {
      throw Exception('Failed to upload document: $e');
    }
  }

  Future<List<dynamic>> getDocuments() async {
    try {
      final response = await _dio.get('/genai/documents');
      return response.data;
    } catch (e) {
      throw Exception('Failed to get documents: $e');
    }
  }

  Future<void> deleteDocument(String filename) async {
    try {
      await _dio.delete('/genai/documents/$filename');
    } catch (e) {
      throw Exception('Failed to delete document: $e');
    }
  }

  Future<Map<String, dynamic>?> getJobStatus(String jobId) async {
    try {
      final response = await _dio.get('/genai/jobs/$jobId');
      return response.data;
    } catch (e) {
      // logic to handle 404 if needed, or rethrow
      if (e is DioException && e.response?.statusCode == 404) {
        return null;
      }
      throw Exception('Failed to check job status: $e');
    }
  }
}
