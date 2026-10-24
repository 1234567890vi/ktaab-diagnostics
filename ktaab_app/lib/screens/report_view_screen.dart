import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/diagnostic_report.dart';
import '../services/api_service.dart';

class ReportViewScreen extends StatefulWidget {
  final DiagnosticReport report;

  const ReportViewScreen({super.key, required this.report});

  @override
  State<ReportViewScreen> createState() => _ReportViewScreenState();
}

class _ReportViewScreenState extends State<ReportViewScreen> {
  bool _isSending = false;
  String? _statusMessage;
  bool _isSuccess = false;

  Future<void> _sendReportToServer() async {
    setState(() {
      _isSending = true;
      _statusMessage = null;
    });

    final res = await ApiService.sendReport(widget.report);

    setState(() {
      _isSending = false;
      _isSuccess = res['success'] as bool? ?? false;
      _statusMessage = res['message']?.toString();
    });

    if (mounted && _isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_statusMessage ?? 'تم الإرسال بنجاح!'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final prettyJson = const JsonEncoder.withIndent('  ').convert(widget.report.toJson());

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        elevation: 0,
        title: const Text('تقرير الفحص الشامل (JSON)', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy, color: Color(0xFF06B6D4)),
            tooltip: 'نسخ التقرير',
            onPressed: () {
              Clipboard.setData(ClipboardData(text: prettyJson));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('تم نسخ تقرير JSON إلى الحافظة!')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Server destination bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: const Color(0xFF111827),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.dns, size: 16, color: Color(0xFF06B6D4)),
                    SizedBox(width: 6),
                    Text('السيرفر المستهدف:', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                  ],
                ),
                Text(
                  ApiService.serverUrl,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
                ),
              ],
            ),
          ),

          if (_statusMessage != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isSuccess ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFFEF4444).withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                ),
              ),
              child: Row(
                children: [
                  Icon(_isSuccess ? Icons.check_circle : Icons.error, color: _isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444), size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _statusMessage!,
                      style: TextStyle(
                        color: _isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // JSON Content
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1F2937)),
              ),
              child: SingleChildScrollView(
                child: SelectableText(
                  prettyJson,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: Color(0xFF06B6D4),
                    height: 1.4,
                  ),
                ),
              ),
            ),
          ),

          // Bottom Action
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFF111827),
              border: Border(top: BorderSide(color: Color(0xFF1F2937))),
            ),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF06B6D4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSending ? null : _sendReportToServer,
                icon: _isSending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF05131A)))
                    : const Icon(Icons.cloud_upload, color: Color(0xFF05131A)),
                label: Text(
                  _isSending ? 'جاري إرسال التقرير...' : 'إرسال التقرير للسيرفر الآن',
                  style: const TextStyle(color: Color(0xFF05131A), fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
