# Step 01 — Discover epic and plan destination

## Objective

Collect the epic target (number + title) and define the plan output file path.

## Instructions

1. Read config `{project-root}/_bmad/bmm/config.yaml` and resolve:
   - `output_folder`
   - preferred language variables (communication + document language)

2. Determine epic number/title:
   - If the user already specified an epic (e.g., "Epic 1"), use it.
   - Otherwise ask the user to provide:
     - Epic number (e.g., 1)
     - Epic title (short)

3. Set output path:
   - Create `plans/` folder under `output_folder`.
   - Output file must be:
     - `{output_folder}/plans/epic-{{epic_num}}-plan.md`

4. Proceed to step 02:
   `{project-root}/_bmad/bmm/workflows/3-solutioning/plan-epic/steps/step-02-build-plan.md`
