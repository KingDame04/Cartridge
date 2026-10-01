import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/constants/app_colors.dart';
import '../widgets/app_header_logo.dart';
import 'game_entry_form_screen.dart';

// Fallback for when a searched game isn't found in the cache or on RAWG.
// Only Name is required here — everything else is optional metadata that
// would normally come from the game database automatically.
class ManualGameFormScreen extends StatefulWidget {
  final String initialName;
  final List<MapEntry<String, String>> availableLists;

  const ManualGameFormScreen({
    super.key,
    required this.initialName,
    this.availableLists = const [],
  });

  @override
  State<ManualGameFormScreen> createState() => _ManualGameFormScreenState();
}

class _ManualGameFormScreenState extends State<ManualGameFormScreen> {
  late final TextEditingController _nameController;
  final _coverImageController = TextEditingController();
  final _genresController = TextEditingController();
  final _platformsController = TextEditingController();
  final _developerController = TextEditingController();
  DateTime? _releaseDate;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _nameController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _nameController.removeListener(_onFieldChanged);
    _nameController.dispose();
    _coverImageController.dispose();
    _genresController.dispose();
    _platformsController.dispose();
    _developerController.dispose();
    super.dispose();
  }

  List<String> _splitCommaList(String text) {
    return text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
  }

  // Hands the manually-entered game details off to the entry form, which
  // will send them as `newGame` when the entry gets created
  Future<void> _continue() async {
    final platforms = _splitCommaList(_platformsController.text);
    final coverImage = _coverImageController.text.trim();
    final developer = _developerController.text.trim();

    final newGame = {
      'name': _nameController.text.trim(),
      'coverImage': coverImage.isEmpty ? null : coverImage,
      'genres': _splitCommaList(_genresController.text),
      'platforms': platforms,
      'releaseDate': _releaseDate?.toIso8601String(),
      'developers': developer.isEmpty ? <String>[] : [developer],
    };

    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => GameEntryFormScreen(
          newGame: newGame,
          gameName: _nameController.text.trim(),
          gameCoverImage: coverImage.isEmpty ? null : coverImage,
          platforms: platforms,
          availableLists: widget.availableLists,
        ),
      ),
    );
    // Bubble the "saved" signal up through AddGameScreen too, same as the
    // RAWG-search path, so it also pops back to wherever Add Game was
    // opened from instead of leaving this filled-out form sitting exposed.
    if (saved == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  // A white input box whose border and floating label turn dark green
  // (instead of the app's default purple theme color) when focused —
  // matches the treatment used on the Settings screen
  InputDecoration _fieldDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: GoogleFonts.inter(),
      floatingLabelStyle: GoogleFonts.inter(color: AppColors.darkGreen),
      border: const OutlineInputBorder(),
      focusedBorder: const OutlineInputBorder(
        borderSide: BorderSide(color: AppColors.darkGreen, width: 2),
      ),
    );
  }

  // Screen contents
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(76),
        child: Container(
          height: 76,
          color: AppColors.darkGreen,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SafeArea(
            bottom: false,
            child: Align(
              alignment: Alignment.topLeft,
              child: const AppHeaderLogo(),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.darkGreen,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(
                    Icons.arrow_back,
                    size: 18,
                    color: AppColors.darkGreen,
                  ),
                  label: Text(
                    'Go Back',
                    style: GoogleFonts.inter(
                      color: AppColors.darkGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.lightGreen,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Create a New Game Entry',
                style: GoogleFonts.vt323(
                  fontSize: 30,
                  color: AppColors.darkGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Theme(
                  data: Theme.of(context).copyWith(
                    textSelectionTheme: TextSelectionThemeData(
                      cursorColor: AppColors.darkGreen,
                      selectionColor: AppColors.lightGreen.withOpacity(0.4),
                      selectionHandleColor: AppColors.lightGreen,
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16.0),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight,
                      ),
                      child: IntrinsicHeight(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            TextField(
                              controller: _nameController,
                              style: GoogleFonts.inter(),
                              cursorColor: AppColors.darkGreen,
                              decoration: _fieldDecoration('Game Name'),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _coverImageController,
                              style: GoogleFonts.inter(),
                              cursorColor: AppColors.darkGreen,
                              decoration: _fieldDecoration(
                                'Cover Image URL (optional)',
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _genresController,
                              style: GoogleFonts.inter(),
                              cursorColor: AppColors.darkGreen,
                              decoration: _fieldDecoration(
                                'Genres (comma-separated, optional)',
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _platformsController,
                              style: GoogleFonts.inter(),
                              cursorColor: AppColors.darkGreen,
                              decoration: _fieldDecoration(
                                'Platforms (comma-separated, optional)',
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _developerController,
                              style: GoogleFonts.inter(),
                              cursorColor: AppColors.darkGreen,
                              decoration: _fieldDecoration(
                                'Developer (optional)',
                              ),
                            ),
                            const SizedBox(height: 16),
                            InkWell(
                              borderRadius: BorderRadius.circular(4),
                              onTap: () async {
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: _releaseDate ?? DateTime.now(),
                                  firstDate: DateTime(1950),
                                  lastDate: DateTime.now(),
                                  builder: (context, child) {
                                    return Theme(
                                      data: Theme.of(context).copyWith(
                                        colorScheme: Theme.of(context)
                                            .colorScheme
                                            .copyWith(
                                              primary: AppColors.lightGreen,
                                              onPrimary: AppColors.darkGreen,
                                            ),
                                        textButtonTheme: TextButtonThemeData(
                                          style: TextButton.styleFrom(
                                            foregroundColor:
                                                AppColors.darkGreen,
                                          ),
                                        ),
                                      ),
                                      child: child!,
                                    );
                                  },
                                );
                                if (picked != null) {
                                  setState(() => _releaseDate = picked);
                                }
                              },
                              child: InputDecorator(
                                decoration:
                                    _fieldDecoration(
                                      'Release Date (optional)',
                                    ).copyWith(
                                      floatingLabelBehavior:
                                          FloatingLabelBehavior.always,
                                      suffixIcon: Icon(
                                        Icons.calendar_today,
                                        size: 18,
                                        color: AppColors.darkGreen,
                                      ),
                                    ),
                                child: Text(
                                  _releaseDate == null
                                      ? 'Not set'
                                      : '${_releaseDate!.year}-${_releaseDate!.month.toString().padLeft(2, '0')}-${_releaseDate!.day.toString().padLeft(2, '0')}',
                                  style: GoogleFonts.inter(),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.lightGreen,
                                foregroundColor: AppColors.darkGreen,
                              ),
                              onPressed: _nameController.text.trim().isEmpty
                                  ? null
                                  : _continue,
                              child: Text(
                                'Continue',
                                style: GoogleFonts.inter(
                                  color: AppColors.darkGreen,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
