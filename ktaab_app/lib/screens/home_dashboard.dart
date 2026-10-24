import 'package:flutter/material.dart';
import '../models/diagnostic_report.dart';
import '../services/api_service.dart';
import '../services/deep_link_service.dart';
import '../services/diagnostics_service.dart';
import '../widgets/circular_battery_gauge.dart';
import '../widgets/section_header.dart';
import '../widgets/stat_card.dart';
import 'battery_detail_screen.dart';
import 'hardware_detail_screen.dart';
import 'report_view_screen.dart';
import 'sensors_detail_screen.dart';
import 'settings_dialog.dart';

class HomeDashboard extends StatefulWidget {
  const HomeDashboard({super.key});

  @override
  State<HomeDashboard> createState() => _HomeDashboardState();
}

class _HomeDashboardState extends State<HomeDashboard> {
  final DiagnosticsService _diagnosticsService = DiagnosticsService();
  final DeepLinkService _deepLinkService = DeepLinkService();

  DiagnosticReport? _currentReport;
  bool _isLoading = true;
  bool _isAutoSending = false;
  String? _autoSendStatus;

  @override
  void initState() {
    super.initState();
    _diagnosticsService.startSensorListening();

    // 1. Run initial scan on startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _executeScan(autoSend: true);
    });

    // 2. Setup Deep Link listener (e.g. ktaab://inspect or https://.../inspect)
    _deepLinkService.initDeepLinks(onScanRequested: () {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('⚡ تم فتح الرابط العميق: بدء الفحص التلقائي...'),
            backgroundColor: Color(0xFF06B6D4),
          ),
        );
        _executeScan(autoSend: true);
      }
    });
  }

  @override
  void dispose() {
    _diagnosticsService.stopSensorListening();
    _deepLinkService.dispose();
    super.dispose();
  }

  Future<void> _executeScan({bool autoSend = false}) async {
    setState(() {
      _isLoading = true;
      _autoSendStatus = null;
    });

    try {
      final report = await _diagnosticsService.runFullScan(context);
      setState(() {
        _currentReport = report;
        _isLoading = false;
      });

      if (autoSend) {
        _autoSendReport(report);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _autoSendStatus = 'حدث خطأ أثناء الفحص: $e';
      });
    }
  }

  Future<void> _autoSendReport(DiagnosticReport report) async {
    setState(() {
      _isAutoSending = true;
    });

    final res = await ApiService.sendReport(report);

    if (mounted) {
      setState(() {
        _isAutoSending = false;
        _autoSendStatus = res['success'] == true
            ? '✅ تم إرسال تقرير الفحص للسيرفر تلقائياً'
            : '⚠️ تعذر الإرسال التلقائي: ${res['message']}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF06B6D4).withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.bolt, color: Color(0xFF06B6D4), size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'كتاب دياجنوستكس',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Text(
                  'فحص الهواتف والبطارية العميق',
                  style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Color(0xFF9CA3AF)),
            tooltip: 'إعدادات السيرفر',
            onPressed: () {
              showDialog(context: context, builder: (_) => const SettingsDialog());
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF06B6D4)),
            tooltip: 'إعادة الفحص',
            onPressed: _isLoading ? null : () => _executeScan(autoSend: true),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Color(0xFF06B6D4)),
                  SizedBox(height: 16),
                  Text(
                    'جاري فحص العتاد ومستشعرات البطارية...',
                    style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              color: const Color(0xFF06B6D4),
              backgroundColor: const Color(0xFF111827),
              onRefresh: () => _executeScan(autoSend: false),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Auto-send status notification pill
                    if (_autoSendStatus != null || _isAutoSending)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF111827),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF1F2937)),
                        ),
                        child: Row(
                          children: [
                            if (_isAutoSending)
                              const Padding(
                                padding: EdgeInsets.only(left: 8),
                                child: SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF06B6D4)),
                                ),
                              ),
                            Expanded(
                              child: Text(
                                _isAutoSending ? 'جاري مزامنة التقرير مع سيرفر الإدارة...' : _autoSendStatus!,
                                style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Main Battery Gauge
                    if (_currentReport != null)
                      CircularBatteryGauge(
                        percentage: _currentReport!.battery.level,
                        isCharging: _currentReport!.battery.isCharging,
                        temperatureC: _currentReport!.battery.temperatureC,
                        voltageMV: _currentReport!.battery.voltageMV,
                        health: _currentReport!.battery.health,
                      ),
                    const SizedBox(height: 28),

                    // Section: Quick Diagnostics
                    SectionHeader(
                      title: 'لوحة التحكم والتشخيص السريع',
                      subtitle: 'اضغط على أي قسم للاطلاع على الفحص التفصيلي',
                      trailing: TextButton.icon(
                        icon: const Icon(Icons.document_scanner, size: 16, color: Color(0xFF06B6D4)),
                        label: const Text('تقرير JSON', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 13)),
                        onPressed: () {
                          if (_currentReport != null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => ReportViewScreen(report: _currentReport!)),
                            );
                          }
                        },
                      ),
                    ),

                    // Grid of 4 Spec Cards
                    if (_currentReport != null) ...[
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 14,
                        childAspectRatio: 1.15,
                        children: [
                          // 1. Battery Detail Card
                          StatCard(
                            title: 'صحة البطارية',
                            value: _currentReport!.battery.health == 'Good' ? 'سليمة (Good)' : _currentReport!.battery.health,
                            subtitle: '${_currentReport!.battery.temperatureC.toStringAsFixed(1)}°C | ${_currentReport!.battery.technology}',
                            icon: Icons.battery_charging_full,
                            iconColor: const Color(0xFF10B981),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => BatteryDetailScreen(battery: _currentReport!.battery),
                                ),
                              );
                            },
                          ),

                          // 2. Hardware / OS Card
                          StatCard(
                            title: 'الجهاز والنظام',
                            value: '${_currentReport!.hardware.brand} ${_currentReport!.hardware.model}',
                            subtitle: _currentReport!.hardware.osVersion,
                            icon: Icons.phone_android,
                            iconColor: const Color(0xFF3B82F6),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => HardwareDetailScreen(hardware: _currentReport!.hardware),
                                ),
                              );
                            },
                          ),

                          // 3. RAM & Root Check Card
                          StatCard(
                            title: 'الذاكرة وحالة الروت',
                            value: _currentReport!.hardware.isRooted ? '⚠️ مروّت (Root)' : '🛡️ نظام آمن',
                            subtitle: 'RAM: ${(_currentReport!.hardware.totalRamMB / 1024).toStringAsFixed(1)} GB',
                            icon: Icons.shield,
                            iconColor: _currentReport!.hardware.isRooted ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => HardwareDetailScreen(hardware: _currentReport!.hardware),
                                ),
                              );
                            },
                          ),

                          // 4. Screen & Sensors Card
                          StatCard(
                            title: 'الشاشة والمستشعرات',
                            value: '${_currentReport!.display.refreshRateHz.toInt()} Hz',
                            subtitle: _currentReport!.display.resolution,
                            icon: Icons.sensors,
                            iconColor: const Color(0xFFF59E0B),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => SensorsDetailScreen(
                                    display: _currentReport!.display,
                                    network: _currentReport!.network,
                                    initialSensors: _currentReport!.sensors,
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Big Action Button: Manual Full Upload
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF06B6D4),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          if (_currentReport != null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => ReportViewScreen(report: _currentReport!)),
                            );
                          }
                        },
                        icon: const Icon(Icons.send_rounded, color: Color(0xFF05131A)),
                        label: const Text(
                          'معاينة التقرير ومشاركته مع السيرفر',
                          style: TextStyle(
                            color: Color(0xFF05131A),
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}
