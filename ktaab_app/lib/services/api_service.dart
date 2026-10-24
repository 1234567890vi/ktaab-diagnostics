import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/diagnostic_report.dart';

class ApiService {
  // Default server address: 10.0.2.2 for Android emulator, localhost for others
  static String _serverUrl = Platform.isAndroid ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

  static String get serverUrl => _serverUrl;

  static void setServerUrl(String newUrl) {
    String cleaned = newUrl.trim();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'http://$cleaned';
    }
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    _serverUrl = cleaned;
  }

  /// Sends the full DiagnosticReport to the backend server via POST /api/report
  static Future<Map<String, dynamic>> sendReport(DiagnosticReport report) async {
    final endpoint = Uri.parse('$_serverUrl/api/report');

    try {
      final response = await http
          .post(
            endpoint,
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode(report.toJson()),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = jsonDecode(response.body);
        return {
          'success': true,
          'message': 'تم إرسال التقرير للسيرفر بنجاح!',
          'data': decoded,
        };
      } else {
        return {
          'success': false,
          'message': 'استجاب السيرفر برمز خطأ: ${response.statusCode}',
          'body': response.body,
        };
      }
    } on SocketException catch (e) {
      return {
        'success': false,
        'message': 'تعذر الاتصال بالسيرفر على $_serverUrl. يرجى التأكد من تشغيل السيرفر ومن عنوان الـ IP.',
        'error': e.message,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'حدث خطأ أثناء إرسال التقرير: $e',
      };
    }
  }

  /// Tests connectivity with the backend server
  static Future<bool> testConnection() async {
    try {
      final endpoint = Uri.parse('$_serverUrl/api/stats');
      final res = await http.get(endpoint).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
