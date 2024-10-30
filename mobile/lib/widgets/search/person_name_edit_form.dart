import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/extensions/build_context_extensions.dart';
import 'package:immich_mobile/i18n/strings.g.dart';
import 'package:immich_mobile/utils/i18n.dart';
import 'package:immich_mobile/providers/search/people.provider.dart';

class PersonNameEditFormResult {
  final bool success;
  final String updatedName;

  PersonNameEditFormResult(this.success, this.updatedName);
}

class PersonNameEditForm extends HookConsumerWidget {
  final String personId;
  final String personName;

  const PersonNameEditForm({
    super.key,
    required this.personId,
    required this.personName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = useTextEditingController(text: personName);
    final isError = useState(false);

    return AlertDialog(
      title: Text(
        tr(t.add_a_name),
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      content: SingleChildScrollView(
        child: TextFormField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(
            hintText: tr(t.name_or_nickname),
            border: const OutlineInputBorder(),
            errorText: isError.value ? 'Error occured' : null,
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => context.pop(
            PersonNameEditFormResult(false, ''),
          ),
          child: Text(
            tr(t.cancel),
            style: TextStyle(
              color: Colors.red[300],
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        TextButton(
          onPressed: () async {
            isError.value = false;
            final result = await ref.read(
              updatePersonNameProvider(personId, controller.text).future,
            );
            isError.value = !result;
            if (result) {
              context.pop(PersonNameEditFormResult(true, controller.text));
            }
          },
          child: Text(
            tr(t.save),
            style: TextStyle(
              color: context.primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}
