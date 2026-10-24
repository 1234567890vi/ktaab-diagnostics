import 'package:flutter/material.dart';
import '../models/diagnostic_report.dart';

class HardwareDetailScreen extends StatelessWidget {
  final HardwareData hardware;

  const HardwareDetailScreen({super.key, required this.hardware});

  @override
  Widget build(BuildContext context) {
    final ramUsedPct = hardware.totalRamMB > 0 ? (hardware.usedRamMB / hardware.totalRamMB) : 0.5;
    final usedStorageGB = hardware.totalStorageGB - hardware.freeStorageGB;
    final storageUsedPct = hardware.totalStorageGB > 0 ? (usedStorageGB / hardware.totalStorageGB) : 0.5;

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        elevation: 0,
        title: const Text('فحص العتاد والمعالج والنظام', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Root Status Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: hardware.isRooted
                    ? const Color(0xFFEF4444).withOpacity(0.15)
                    : const Color(0xFF10B981).withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: hardware.isRooted ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    hardware.isRooted ? Icons.warning_amber_rounded : Icons.verified_user_rounded,
                    color: hardware.isRooted ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                    size: 32,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hardware.isRooted ? '⚠️ تم اكتشاف روت (Device Rooted)' : '🛡️ نظام تشغيل أصلي وآمن (No Root)',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: hardware.isRooted ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          hardware.isRooted
                              ? 'تم العثور على ملفات su أو تصاريح الجذر، مما قد يؤثر على حماية الجهاز والتطبيقات البنكية.'
                              : 'لم يتم العثور على أي كسر لحماية النظام أو تصاريح معدلة.',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // RAM Usage Card
            _buildResourceCard(
              title: 'الذاكرة العشوائية (RAM)',
              icon: Icons.memory,
              usedLabel: '${hardware.usedRamMB.toInt()} MB مستخدمة',
              freeLabel: '${hardware.freeRamMB.toInt()} MB حرة',
              totalLabel: 'الإجمالي: ${(hardware.totalRamMB / 1024.0).toStringAsFixed(1)} GB',
              progress: ramUsedPct.clamp(0.0, 1.0),
              progressColor: const Color(0xFF06B6D4),
            ),
            const SizedBox(height: 16),

            // Storage Usage Card
            _buildResourceCard(
              title: 'التخزين الداخلي (Internal Storage)',
              icon: Icons.storage,
              usedLabel: '${usedStorageGB.toStringAsFixed(1)} GB مستخدمة',
              freeLabel: '${hardware.freeStorageGB.toStringAsFixed(1)} GB متبقية',
              totalLabel: 'السعة الكلية: ${hardware.totalStorageGB.toStringAsFixed(1)} GB',
              progress: storageUsedPct.clamp(0.0, 1.0),
              progressColor: const Color(0xFF3B82F6),
            ),
            const SizedBox(height: 24),

            const Text(
              'تفاصيل مواصفات الجهاز والمعالج',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),

            _buildSpecRow('الشركة المصنعة (Manufacturer)', hardware.manufacturer),
            _buildSpecRow('العلامة التجارية (Brand)', hardware.brand),
            _buildSpecRow('اسم الموديل الدقيق (Model)', hardware.model),
            _buildSpecRow('اسم الجهاز في النظام (Device)', hardware.device),
            _buildSpecRow('إصدار نظام التشغيل', hardware.osVersion),
            _buildSpecRow('رقم البناء (Build ID)', hardware.buildId),
            _buildSpecRow('مستوى تصحيح الأمان (Security Patch)', hardware.securityPatch),
            _buildSpecRow('معمارية المعالج (Architecture)', hardware.cpuArchitecture),
            _buildSpecRow('نوع المعالج / العتاد (Hardware)', hardware.cpuModel),
            _buildSpecRow('عدد أنوية المعالج (CPU Cores)', '${hardware.cpuCores} أنوية متزامنة'),
          ],
        ),
      ),
    );
  }

  Widget _buildResourceCard({
    required String title,
    required IconData icon,
    required String usedLabel,
    required String freeLabel,
    required String totalLabel,
    required double progress,
    required Color progressColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, color: progressColor, size: 20),
                  const SizedBox(width: 8),
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ],
              ),
              Text(totalLabel, style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: const Color(0xFF1F2937),
              color: progressColor,
              minHeight: 10,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(usedLabel, style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600)),
              Text(freeLabel, style: const TextStyle(fontSize: 12, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
              textAlign: TextAlign.left,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
