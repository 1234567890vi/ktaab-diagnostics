import 'dart:async';
import 'package:app_links/app_links.dart';

/// Handles Deep Linking via custom scheme (ktaab://inspect)
/// and App Links (https://ktaab.local/inspect)
class DeepLinkService {
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  /// Initializes deep link listener and notifies callback when scan link is received
  Future<void> initDeepLinks({required Function() onScanRequested}) async {
    // 1. Handle app launched from terminated state via deep link
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        _handleIncomingUri(initialUri, onScanRequested);
      }
    } catch (_) {}

    // 2. Handle app running in background or foreground when link is clicked
    _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
      _handleIncomingUri(uri, onScanRequested);
    }, onError: (_) {});
  }

  void _handleIncomingUri(Uri uri, Function() onScanRequested) {
    // Matches: ktaab://inspect or https://.../inspect
    final isInspectScheme = uri.scheme == 'ktaab' && (uri.host == 'inspect' || uri.path.contains('inspect'));
    final isInspectHttp = uri.path.contains('/inspect');

    if (isInspectScheme || isInspectHttp) {
      onScanRequested();
    }
  }

  void dispose() {
    _linkSubscription?.cancel();
  }
}
