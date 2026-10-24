import 'dart:math' as math;
import 'package:flutter/material.dart';

class CircularBatteryGauge extends StatefulWidget {
  final double percentage; // 0 to 100
  final bool isCharging;
  final double temperatureC;
  final int voltageMV;
  final String health;

  const CircularBatteryGauge({
    super.key,
    required this.percentage,
    required this.isCharging,
    required this.temperatureC,
    required this.voltageMV,
    required this.health,
  });

  @override
  State<CircularBatteryGauge> createState() => _CircularBatteryGaugeState();
}

class _CircularBatteryGaugeState extends State<CircularBatteryGauge> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _animation = Tween<double>(begin: 0.0, end: widget.percentage).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );
    _animController.forward();
  }

  @override
  void didUpdateWidget(CircularBatteryGauge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.percentage != widget.percentage) {
      _animation = Tween<double>(begin: _animation.value, end: widget.percentage).animate(
        CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
      );
      _animController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Color _getColor(double pct) {
    if (pct > 50) return const Color(0xFF10B981); // Emerald
    if (pct > 20) return const Color(0xFFF59E0B); // Amber
    return const Color(0xFFEF4444); // Rose red
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        final currentPct = _animation.value;
        final gaugeColor = _getColor(currentPct);

        return Center(
          child: SizedBox(
            width: 230,
            height: 230,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size(230, 230),
                  painter: _GaugePainter(
                    percentage: currentPct,
                    gaugeColor: gaugeColor,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.isCharging)
                          const Padding(
                            padding: EdgeInsets.only(left: 4),
                            child: Icon(Icons.bolt, color: Color(0xFF06B6D4), size: 28),
                          ),
                        Text(
                          '${currentPct.toInt()}%',
                          style: TextStyle(
                            fontSize: 44,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -1,
                            shadows: [
                              Shadow(color: gaugeColor.withOpacity(0.5), blurRadius: 16),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: widget.health == 'Good'
                            ? const Color(0xFF10B981).withOpacity(0.15)
                            : const Color(0xFFEF4444).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.parse(
                          '1px solid ${widget.health == 'Good' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}',
                        ),
                      ),
                      child: Text(
                        widget.health == 'Good' ? 'حالة ممتازة' : widget.health,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: widget.health == 'Good' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '🌡️ ${widget.temperatureC.toStringAsFixed(1)}°C',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          '⚡ ${widget.voltageMV} mV',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double percentage;
  final Color gaugeColor;

  _GaugePainter({required this.percentage, required this.gaugeColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 24) / 2;
    const strokeWidth = 14.0;

    // Background circle track
    final bgPaint = Paint()
      ..color = const Color(0xFF1F2937)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    // Glowing shadow for progress arc
    final glowPaint = Paint()
      ..color = gaugeColor.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth + 6
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 10);

    // Active progress arc
    final progressPaint = Paint()
      ..color = gaugeColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final sweepAngle = (percentage / 100.0) * (2 * math.pi);
    const startAngle = -math.pi / 2;

    if (percentage > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        glowPaint,
      );
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.percentage != percentage || oldDelegate.gaugeColor != gaugeColor;
  }
}
