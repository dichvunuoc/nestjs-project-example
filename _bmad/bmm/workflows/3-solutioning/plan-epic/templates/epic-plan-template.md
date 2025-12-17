---
project: '{{project_name}}'
epic_num: { { epic_num } }
epic_title: '{{epic_title}}'
createdAt: '{{date}}'
approvedForBeads: false
approvedAt: null
beads:
  tool: 'bd'
  epic_id: null
  story_ids: []
  labels:
    canonical:
      - bmad-story
      - needs-spec
      - ready-for-dev
      - in-dev
      - needs-review
      - needs-fix
      - reviewed
      - done
      - bmad-followup
---

## Epic Summary

- **Goal**: <what success looks like>
- **Scope**: <in-scope>
- **Out of scope**: <explicit non-goals>

## Assumptions

- <assumption>

## Risks / Spikes

- <risk and mitigation>

## Dependencies

- <dependency>

## Stories (Beads filing source)

> Each story below will become 1 Beads issue.

### Story {{epic_num}}.1: <title>

- **Outcome**: <user value>
- **Acceptance Criteria (high-level)**:
  - (AC1) ...
  - (AC2) ...
- **Notes**: <key constraints>
- **Blocks**: <optional: other story keys or external deps>

### Story {{epic_num}}.2: <title>

- **Outcome**: ...
- **Acceptance Criteria (high-level)**:
  - (AC1) ...
- **Notes**: ...
- **Blocks**: ...

## Execution Notes

- **Suggested order**: <what to do first and why>
- **Parallelization**: <what can be done concurrently>
- **Quality gates**: tests, lint, review expectations

## Beads Filing Notes

- Use `file-beads-from-plan` to create epic/stories in bd from this plan file.
- Use `create-story-beads` to attach `BMAD STORY SPEC v1` to each story issue.
