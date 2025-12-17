# Step 02 — Build Epic Plan file

## Objective

Write a human-reviewable Epic Plan that can later be filed into Beads issues.

## Inputs to load (as available)

- `{output_folder}/*prd*.md`
- `{output_folder}/*architecture*.md`
- `{output_folder}/*ux*.md` (if UI exists)
- `**/project-context.md` (coding standards)
- Epic docs under `{output_folder}/*epic*.md`

## Output

Write `{output_folder}/plans/epic-{{epic_num}}-plan.md` using the template:
`{project-root}/_bmad/bmm/workflows/3-solutioning/plan-epic/templates/epic-plan-template.md`

## Rules

- The plan must be concrete enough that a developer can implement from it.
- The plan must include a **Stories list** that can be converted into Beads issues 1:1.
- Include dependencies/blocks explicitly.
- Do NOT create Beads issues in this workflow.

## Next

After writing the plan file, proceed to step 03:
`{project-root}/_bmad/bmm/workflows/3-solutioning/plan-epic/steps/step-03-review-freeze.md`
