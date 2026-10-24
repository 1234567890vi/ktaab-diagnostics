import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/home_dashboard.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Dark navigation bar and status bar
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0B0F19),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const KtaabDiagnosticsApp());
}

class KtaabDiagnosticsApp extends StatelessWidget {
  const KtaabDiagnosticsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'كتاب دياجنوستكس',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        primaryColor: const Color(0xFF06B6D4),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF06B6D4),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF111827),
          error: Color(0xFFEF4444),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0B0F19),
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        cardColor: const Color(0xFF111827),
        dividerColor: const Color(0xFF1F2937),
        fontFamily: 'Roboto',
      ),
      home: const Directionality(
        textDirection: TextDirection.rtl,
        child: HomeDashboard(),
      ),
    );
  }
}
