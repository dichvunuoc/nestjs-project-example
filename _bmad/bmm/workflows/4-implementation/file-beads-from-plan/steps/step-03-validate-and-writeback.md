# Step 03 — Validate graph and write back IDs

## Objective

Verify Beads graph health and write Beads IDs back into the plan file.

## Instructions

1. Validate that work exists:
   - `bd list --json`
   - `bd ready --json`
   - `bd dep cycles --json` (if available)

2. Write back to the plan file (append or update frontmatter fields):
   - `beads.epic_id = <epic_id>`
   - `beads.story_ids = [<story_id_1>, <story_id_2>, ...]`

3. Output next recommended execution steps:
   - Run `create-story-beads` on stories labeled `needs-spec`.
   - Then run `auto-sprint-loop-beads` to execute labels+ready queue.
