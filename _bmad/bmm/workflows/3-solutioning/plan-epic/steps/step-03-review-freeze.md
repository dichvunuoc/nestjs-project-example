# Step 03 — Review and freeze for Beads filing

## Objective

Get user confirmation that the plan file is ready to file into Beads (bd).

## Instructions

1. Present a short summary (1–5 bullets) of what the plan contains:
   - Epic goal
   - Story count
   - Known dependencies/risks

2. Ask the user:
   - Approve this plan for filing into Beads?

3. If approved:
   - Update the plan file frontmatter: `approvedForBeads: true` and `approvedAt: <timestamp>`.
   - Output next step command:
     - Run Scrum Master workflow: `file-beads-from-plan`

4. If not approved:
   - Apply requested edits to the plan file.
   - Re-ask for approval.
