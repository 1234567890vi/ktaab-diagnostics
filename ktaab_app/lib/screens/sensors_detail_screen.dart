import 'dart:async';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../models/diagnostic_report.dart';

class SensorsDetailScreen extends StatefulWidget {
  final DisplayData display;
  final NetworkData network;
  final SensorsData initialSensors;

  const SensorsDetailScreen({
    super.key,
    required this.display,
    required this.network,
    required this.initialSensors,
  });

  @override
  State<SensorsDetailScreen> createState() => _SensorsDetailScreenState();
}

class _SensorsDetailScreenState extends State<SensorsDetailScreen> {
  Vector3D _accel = Vector3D(x: 0, y: 0, z: 0);
  Vector3D _gyro = Vector3D(x: 0, y: 0, z: 0);
  StreamSubscription? _accelSub;
  StreamSubscription? _gyroSub;

  @override
  void initState() {
    super.initState();
    _accel = widget.initialSensors.accelerometer ?? Vector3D(x: 0, y: 0, z: 0);
    _gyro = widget.initialSensors.gyroscope ?? Vector3D(x: 0, y: 0, z: 0);

    try {
      _accelSub = accelerometerEventStream().listen((e) {
        if (mounted) {
          setState(() {
            _accel = Vector3D(x: e.x, y: e.y, z: e.z);
          });
        }
      });
      _gyroSub = gyroscopeEventStream().listen((e) {
        if (mounted) {
          setState(() {
            _gyro = Vector3D(x: e.x, y: e.y, z: e.z);
          });
        }
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _accelSub?.cancel();
    _gyroSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        elevation: 0,
        title: const Text('الشاشة والمستشعرات والشبكة', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Display Specs
            const Text(
              'خصائص الشاشة والعرض',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),
            _buildInfoCard(
              icon: Icons.aspect_ratio,
              iconColor: const Color(0xFF06B6D4),
              title: 'دقة وأبعاد الشاشة (Resolution)',
              value: widget.display.resolution,
              subtitle: 'العرض × الارتفاع بالبكسل الفعلي للشاشة',
            ),
            const SizedBox(height: 10),
            _buildInfoCard(
              icon: Icons.speed,
              iconColor: const Color(0xFF10B981),
              title: 'معدل تحديث الشاشة (Refresh Rate)',
              value: '${widget.display.refreshRateHz.toInt()} Hz',
              subtitle: widget.display.refreshRateHz >= 90
                  ? 'شاشة سريعة وسلسة تدعم الترددات العالية'
                  : 'معدل التحديث القياسي للهواتف الذكية',
            ),
            const SizedBox(height: 10),
            _buildInfoCard(
              icon: Icons.density_medium,
              iconColor: const Color(0xFFF59E0B),
              title: 'كثافة البكسل التقريبية (DPI)',
              value: '${widget.display.dpi.toInt()} dpi',
              subtitle: 'مستوى حدة ووضوح النصوص والعناصر',
            ),
            const SizedBox(height: 24),

            // Network Specs
            const Text(
              'حالة الاتصال والشبكة',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),
            _buildInfoCard(
              icon: Icons.wifi,
              iconColor: const Color(0xFF3B82F6),
              title: 'نوع الاتصال النشط',
              value: widget.network.connectionType,
              subtitle: 'بروتوكول نقل البيانات المستخدم لإرسال التقرير',
            ),
            const SizedBox(height: 10),
            _buildInfoCard(
              icon: Icons.lan,
              iconColor: const Color(0xFF8B5CF6),
              title: 'عنوان IP المحلي للجهاز',
              value: widget.network.localIp,
              subtitle: 'معرف الجهاز على الشبكة الداخلية',
            ),
            const SizedBox(height: 24),

            // Live Sensors Reading
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'قراءات المستشعرات الحية (Live Sensors)',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.circle, color: Color(0xFF10B981), size: 8),
                      SizedBox(width: 4),
                      Text('بث مباشر', style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Accelerometer Card
            _buildSensorVectorCard(
              title: 'مستشعر التسارع (Accelerometer)',
              description: 'يقيس قوة الجاذبية والتسارع الخطي على المحاور الثلاثة (م/ث²)',
              vector: _accel,
              color: const Color(0xFF06B6D4),
            ),
            const SizedBox(height: 14),

            // Gyroscope Card
            _buildSensorVectorCard(
              title: 'مستشعر الدوران (Gyroscope)',
              description: 'يقيس سرعة ومعدل الدوران الزاوي للهاتف (راديان/ثانية)',
              vector: _gyro,
              color: const Color(0xFFF59E0B),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String value,
    String? subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSensorVectorCard({
    required String title,
    required String description,
    required Vector3D vector,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(description, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          const SizedBox(height: 14),
          Row(
            children: [
              _buildAxisChip('X', vector.x.toStringAsFixed(2), color),
              const SizedBox(width: 10),
              _buildAxisChip('Y', vector.y.toStringAsFixed(2), color),
              const SizedBox(width: 10),
              _buildAxisChip('Z', vector.z.toStringAsFixed(2), color),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAxisChip(String axis, String val, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF0B0F19),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF1F2937)),
        ),
        child: Column(
          children: [
            Text('محور $axis', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
            const SizedBox(height: 4),
            Text(val, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
