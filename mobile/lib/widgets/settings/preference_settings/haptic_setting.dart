import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/i18n/strings.g.dart';
import 'package:immich_mobile/services/app_settings.service.dart';
import 'package:immich_mobile/utils/i18n.dart';
import 'package:immich_mobile/widgets/settings/settings_sub_title.dart';
import 'package:immich_mobile/widgets/settings/settings_switch_list_tile.dart';
import 'package:immich_mobile/utils/hooks/app_settings_update_hook.dart';

class HapticSetting extends HookConsumerWidget {
  const HapticSetting({
    super.key,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hapticFeedbackSetting =
        useAppSettingsState(AppSettingsEnum.enableHapticFeedback);
    final isHapticFeedbackEnabled =
        useValueNotifier(hapticFeedbackSetting.value);

    onHapticFeedbackChange(bool isEnabled) {
      hapticFeedbackSetting.value = isEnabled;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SettingsSubTitle(title: tr(t.haptic_feedback)),
        SettingsSwitchListTile(
          valueNotifier: isHapticFeedbackEnabled,
          title: tr(t.haptic_feedback_description),
          onChanged: onHapticFeedbackChange,
        ),
      ],
    );
  }
}
