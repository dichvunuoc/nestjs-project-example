---
name: plan-epic
description: 'Plan-first: produce an Epic Plan file (human-reviewable) before filing Beads (bd) issues.'
web_bundle: true
---

# Plan Epic (Plan-first)

**Goal:** Create a single Epic Plan file that is easy for humans to review, and easy to later convert into Beads (`bd`) epics/issues.

## Initialization

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`

Then load and execute step file:
`{project-root}/_bmad/bmm/workflows/3-solutioning/plan-epic/steps/step-01-init.md`
