# Step 02 — File Epic and Story issues into Beads

## Objective

Create Beads epic + story issues and connect them with dependencies and labels.

## Instructions

1. Ensure repo is initialized:
   - Run `bd init` if .beads does not exist.

2. Create Epic issue:
   - `bd create "Epic: <epic_title>" -t epic -p 2 -d "<epic summary>" --json`
   - Capture `epic_id`.

3. For each Story in the plan:
   - Create a story issue:
     - `bd create "Story: <story title>" -t task -p 2 -d "<outcome + AC high-level>" --json`
     - Capture `story_id`.
   - Link to epic:
     - `bd dep add <epic_id> <story_id> --type parent-child`
   - Apply labels:
     - `bd label add <story_id> bmad-story`
     - `bd label add <story_id> epic-<N>`
     - `bd label add <story_id> needs-spec`

4. Optional: encode plan link on each story issue:
   - `bd comments add <story_id> "BMAD PLAN LINK v1\nPlan: <plan_path>\nApprovedAt: <timestamp>"`

5. Proceed to Step 03:
   `{project-root}/_bmad/bmm/workflows/4-implementation/file-beads-from-plan/steps/step-03-validate-and-writeback.md`
