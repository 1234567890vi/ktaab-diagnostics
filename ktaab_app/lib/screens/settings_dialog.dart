import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SettingsDialog extends StatefulWidget {
  const SettingsDialog({super.key});

  @override
  State<SettingsDialog> createState() => _SettingsDialogState();
}

class _SettingsDialogState extends State<SettingsDialog> {
  late TextEditingController _urlController;
  bool _isTesting = false;
  String? _testResult;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: ApiService.serverUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    ApiService.setServerUrl(_urlController.text);
    final ok = await ApiService.testConnection();

    setState(() {
      _isTesting = false;
      _testSuccess = ok;
      _testResult = ok ? '✅ تم الاتصال بالسيرفر بنجاح!' : '❌ تعذر الوصول للسيرفر. تحقق من الـ IP والشبكة.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF111827),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFF1F2937)),
      ),
      title: const Row(
        children: [
          Icon(Icons.dns, color: Color(0xFF06B6D4)),
          SizedBox(width: 8),
          Text(
            'إعدادات السيرفر الخلفي',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'أدخل عنوان السيرفر (IP:Port) لاستقبال تقارير الفحص من الهاتف:',
              style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _urlController,
              style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF0B0F19),
                hintText: 'http://192.168.1.50:3000',
                hintStyle: const TextStyle(color: Color(0xFF4B5563)),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF1F2937)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF1F2937)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF06B6D4)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '• لمستخدمي المحاكي (Android Emulator): http://10.0.2.2:3000\n• للهواتف الحقيقية: استخدم عنوان الـ IP الخاص بحاسوبك على نفس شبكة الـ Wi-Fi',
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 11),
            ),
            if (_testResult != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _testSuccess ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFFEF4444).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _testResult!,
                  style: TextStyle(
                    color: _testSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isTesting ? null : _testConnection,
          child: _isTesting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('فحص الاتصال', style: TextStyle(color: Color(0xFF06B6D4))),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF06B6D4),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () {
            ApiService.setServerUrl(_urlController.text);
            Navigator.pop(context);
          },
          child: const Text('حفظ', style: TextStyle(color: Color(0xFF05131A), fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
