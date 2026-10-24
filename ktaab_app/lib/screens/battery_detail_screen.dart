import 'package:flutter/material.dart';
import '../models/diagnostic_report.dart';
import '../widgets/circular_battery_gauge.dart';

class BatteryDetailScreen extends StatelessWidget {
  final BatteryData battery;

  const BatteryDetailScreen({super.key, required this.battery});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        elevation: 0,
        title: const Text('فحص البطارية العميق', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Gauge Widget
            CircularBatteryGauge(
              percentage: battery.level,
              isCharging: battery.isCharging,
              temperatureC: battery.temperatureC,
              voltageMV: battery.voltageMV,
              health: battery.health,
            ),
            const SizedBox(height: 32),

            // Metrics Grid
            _buildMetricTile(
              icon: Icons.health_and_safety,
              iconColor: battery.health == 'Good' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              title: 'صحة البطارية الفعلية (Battery Health)',
              value: battery.health == 'Good' ? 'سليمة ومثالية (Good)' : battery.health,
              subtitle: 'مأخوذة مباشرة من نظام إدارة الطاقة بالهاتف (BatteryManager)',
            ),
            const SizedBox(height: 12),

            _buildMetricTile(
              icon: Icons.thermostat,
              iconColor: battery.temperatureC > 38 ? const Color(0xFFEF4444) : const Color(0xFF06B6D4),
              title: 'درجة حرارة البطارية الحالية',
              value: '${battery.temperatureC.toStringAsFixed(1)} °C',
              subtitle: battery.temperatureC > 40
                  ? '⚠️ تحذير: حرارة البطارية مرتفعة جداً'
                  : 'درجة حرارة ضمن النطاق الطبيعي المستقر',
            ),
            const SizedBox(height: 12),

            _buildMetricTile(
              icon: Icons.electric_bolt,
              iconColor: const Color(0xFFF59E0B),
              title: 'جهد البطارية الكهربائي (Voltage)',
              value: '${battery.voltageMV} mV (${(battery.voltageMV / 1000.0).toStringAsFixed(2)} V)',
              subtitle: 'مؤشر كفاءة الخلايا الداخلية وتدفق الطاقة',
            ),
            const SizedBox(height: 12),

            _buildMetricTile(
              icon: Icons.power,
              iconColor: const Color(0xFF3B82F6),
              title: 'مصدر وحالة الشحن',
              value: battery.chargingType,
              subtitle: battery.isCharging ? 'جاري تعبئة الطاقة' : 'يتم تفريغ الشحن حالياً عبر الاستخدام',
            ),
            const SizedBox(height: 12),

            _buildMetricTile(
              icon: Icons.memory,
              iconColor: const Color(0xFF8B5CF6),
              title: 'تقنية تصنيع البطارية',
              value: battery.technology,
              subtitle: 'التركيبة الكيميائية للخلايا (Lithium Ion / Polymer)',
            ),
            const SizedBox(height: 12),

            if (battery.capacityMAh != null)
              _buildMetricTile(
                icon: Icons.battery_charging_full,
                iconColor: const Color(0xFF10B981),
                title: 'السعة المقدرة للبطارية',
                value: '${battery.capacityMAh} mAh',
                subtitle: battery.chargeCounter != null ? 'العداد التراكمي: ${battery.chargeCounter} µAh' : null,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile({
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
