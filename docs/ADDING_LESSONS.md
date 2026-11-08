# Add or edit a lesson without changing engine code

`public/lessons.json` is the canonical runtime catalog. You can edit it directly. `scripts/create-content.py` recreates the original authored course and datasets; running that generator later will overwrite manual JSON edits, so choose one authoring source and keep it in version control.

## Edit an existing lesson

Keep its `id` and challenge IDs stable when changing wording or improving feedback. Those IDs connect local saves to the content. Do not reuse an ID for a different concept. If behavior or prerequisites change fundamentally, create a new lesson ID and plan save compatibility.

A lesson contains:

- `id`, `day`, `world` (1-5), `title`, `topic`, and `prerequisites` referencing earlier lessons.
- `story`, one to five `conceptLines`, one Python `example`, a short `takeaway`, and a `rabbitHole` with title/text/experiment.
- `visualizationId`: `variables`, `loops`, `lists`, `dictionary`, `functions`, or `dataframe`.
- `boss`: a Boolean.
- Three to five `challenges`; the last is an `aiAudit`.

The supplied 30 lessons use exactly five challenges each. A new lesson can be appended in an existing world without modifying the game engine. Keep its day and IDs unique, list earlier prerequisites, and update the world's content metadata (`start`/`end`) when its day range changes. Adding a sixth world is a larger design change, not simply adding a lesson.

## Complete write-challenge example

```json
{
  "id": "d31-c1",
  "title": "Double a signal",
  "type": "write",
  "prompt": "Create doubled with the value 14, using signal. Print doubled.",
  "starterCode": "signal = 7\n",
  "solution": "signal = 7\ndoubled = signal * 2\nprint(doubled)",
  "tests": [
    {
      "expression": "doubled == signal * 2 and doubled == 14",
      "message": "Double signal rather than adding two to it.",
      "success": "The signal was doubled correctly."
    },
    {
      "expression": "__output__ == '14'",
      "message": "Print doubled so the output contains 14.",
      "success": "The doubled value is visible."
    }
  ],
  "inputs": [],
  "packages": [],
  "hints": [
    "Doubling means multiplying by two.",
    "Store signal * 2 in doubled, then print it.",
    "signal = 7\ndoubled = signal * 2\nprint(doubled)"
  ],
  "explanation": "The * operator multiplies. Saving the result lets you reuse it.",
  "wrongAnswers": [
    "signal = 7\ndoubled = signal + 2\nprint(doubled)",
    "signal = 7\ndoubled = signal * 2"
  ],
  "conceptTags": ["signal-practice"]
}
```

For this challenge, its containing lesson's `topic` must be `signal-practice`. Add two to four other fully authored challenges, ending with `aiAudit: true`. Copying an existing complete lesson is the easiest way to preserve the schema, then replace all IDs, content, references, and fixtures.

## Other formats

**Predict:** supply `source` containing executable Python; `solution` is the expected stdout, not code. Optional `choices` are displayed as buttons. The grader executes the source and compares the answer to its actual output.

**Fill:** supply a `template` with exactly one `___`. `solution` is the expression replacing that slot. Tests inspect the resulting executed program.

**Reorder:** supply `lines` in the scrambled order and a `solution` string in the correct order, preserving indentation. The UI offers keyboard-accessible up/down controls. Wrong fixtures are full incorrectly ordered code strings.

**Debug / AI audit:** use `type: "debug"`, supply a plausible incorrect `starterCode`, and place the fixed program in `solution`. An AI audit also sets `aiAudit: true`. Prefer a subtle logic issue over an arbitrary typo.

## Packages and inputs

Use `packages: ["pandas"]` for DataFrame tasks and `["pandas", "matplotlib"]` for charts. Only NumPy, pandas, matplotlib, and their downloaded dependency closure are available. New third-party packages require modifying the runtime packaging and security allow-list; that is not a lesson-only change.

Provide one string per `input()` call in `inputs`. The learner can inspect these values in Program inputs. Tests should clearly state when they require those exact supplied values.

## Write useful tests

Test behavior, not exact source code. For numbers use a justified tolerance; for unordered collections compare sets; for DataFrames compare values and required labels; for plots check heights and labels rather than image pixels. Require only the variables explicitly named in the prompt. Provide feedback that points to the failed condition without immediately giving away the answer.

Test at least two believable wrong submissions. A program that raises an unrelated exception is a weaker negative fixture than a plausible wrong answer with the exact misconception you want to catch. Keep both kinds where useful.

## Verify before publishing

```sh
npm run check
npm run test:content
npm run build
npm run test:browser
```

The schema validator runs at boot and in tests. The native report and production-browser report count the catalog's actual submissions. The original five boss-day regression check deliberately locks in Days 6, 12, 19, 25, and 30; adding or moving a boss requires updating that content-specific test expectation, not engine code.

Importing an old save into an expanded catalog keeps known IDs intact. Removing or renaming saved IDs can make old saves fail validation. Export backups and design an explicit migration before doing that.
