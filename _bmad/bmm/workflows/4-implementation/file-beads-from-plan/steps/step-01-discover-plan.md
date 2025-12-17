# Step 01 — Locate Epic Plan file

## Objective

Find the plan file to file into Beads.

## Instructions

1. Ensure Beads CLI is available:
   - Verify `bd --version` works (or `bd version`). If not, HALT with install instructions.

2. Determine plan path:
   - If the user provided a path, use it.
   - Otherwise, look under:
     - `{output_folder}/plans/`
   - Prefer the most recently modified `epic-*-plan.md`.

3. Load the plan file and verify:
   - `approvedForBeads: true` in frontmatter.
   - It contains a "Stories (Beads filing source)" section with Story entries.

4. Proceed to Step 02:
   `{project-root}/_bmad/bmm/workflows/4-implementation/file-beads-from-plan/steps/step-02-file-epic-and-stories.md`
