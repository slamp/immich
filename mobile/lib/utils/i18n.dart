import 'package:intl/message_format.dart';

String tr(String key, [Map<String, Object>? args]) {
  try {
    if (args != null) {
      return MessageFormat(key).format(args);
    }
    return key;
  } catch (e) {
    return key;
  }
}
