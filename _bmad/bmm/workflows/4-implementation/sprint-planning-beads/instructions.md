# Sprint Planning (Beads / bd)

<critical>The workflow execution engine is governed by: {project-root}/\_bmad/core/tasks/workflow.xml</critical>
<critical>You MUST have already loaded and processed: {project-root}/\_bmad/bmm/workflows/4-implementation/sprint-planning-beads/workflow.yaml</critical>

<critical>
This workflow integrates with REAL Beads (steveyegge/beads) using the `bd` CLI.

- Canonical tracker: Beads issues + dependencies (epics are parent issues).
- Do NOT generate or rely on sprint-status.yaml.
- Never edit .beads/\* directly.

Minimum required commands:

- bd init
- bd create ... --json
- bd dep add ... --type parent-child
- bd label add ...

Idempotency rules (IMPORTANT):

- This workflow MUST be safe to run multiple times.
- It MUST NOT re-create existing epics/stories. Instead, it must **detect and reuse** them.
- Detection is based on a stable key stored on the issue:
  - Epic key label: `epic-<N>` or `epic-<slug>`
  - Story key label: `story-<N>-<M>` or `story-<slug>`
- If duplicates are detected (same key matches multiple issues), HALT and ask the user to resolve (rename/merge/delete).
  </critical>

<workflow>

<step n="1" goal="Initialize Beads and load epics">
  <action>Ensure `bd` is installed and available on PATH; if not, HALT with installation instructions.</action>
  <action>Run `bd init` if this repo is not initialized with Beads.</action>
  <action>Load all epic files via input patterns (FULL_LOAD).</action>
  <action>If epics docs contain placeholders only (no real epics/stories), HALT and instruct to run PM `create-epics-and-stories` to produce real epic/story definitions.</action>
</step>

<step n="2" goal="Idempotent filing: create or reuse bd epics + child story issues">
  <action>Preload existing Beads issues so we can reuse them:</action>
  <action>
    - Run: bd list --json
    - Build an in-memory index of existing issues by:
      - label keys: epic-*, story-*
      - exact title match: "Epic: <title>", "Story: <title>"
  </action>

<action>For each Epic found in epics docs:</action>
<action> 1) Determine a stable epic key: - Preferred: parse epic number from docs (e.g., "Epic 1: ...") and set epic_key = epic-1 - Fallback: epic_key = epic-<slug-of-title> - Enforce: no two epics in the plan may have the same epic_key

    2) Find or create the Beads epic issue:
       - Try find by label epic_key (exact match).
       - If not found, try find by exact title "Epic: <epic title>".
       - If multiple matches are found, HALT (duplicate epic).
       - If exactly one match is found:
         - Reuse epic_id and ensure it has:
           - label: bmad-epic
           - label: <epic_key>
           - (optional) comment: "BMAD EPIC KEY v1\nKey: <epic_key>\nSource: <epics doc path>"
       - If no match is found:
         - Create:
           - bd create "Epic: <epic title>" -t epic -p 2 -d "<epic summary>" --json
           - Capture epic_id
         - Add labels:
           - bd label add <epic_id> bmad-epic
           - bd label add <epic_id> <epic_key>
         - Add key comment (recommended):
           - bd comments add <epic_id> "BMAD EPIC KEY v1\nKey: <epic_key>\nSource: <epics doc path>"

    3) For each Story under that epic:
       - Determine stable story key:
         - Preferred: parse story number from docs (e.g., "Story 1.2: ...") and set story_key = story-1-2
         - Fallback: story_key = story-<slug-of-title>
         - Enforce: story_key must be unique across the project

       - Find or create the story issue:
         - Try find by label story_key, else exact title "Story: <story title>"
         - If multiple matches are found, HALT (duplicate story)
         - If found exactly one:
           - Reuse story_id
         - If none:
           - bd create "Story: <story title>" -t task -p 2 -d "<short story summary>" --json
           - Capture story_id

       - Ensure parent-child link exists (idempotent):
         - bd dep add <epic_id> <story_id> --type parent-child

       - Ensure labels exist (idempotent):
         - bd label add <story_id> bmad-story
         - bd label add <story_id> <epic_key>
         - bd label add <story_id> <story_key>
         - bd label add <story_id> needs-spec

       - Add key comment (recommended; append-only):
         - bd comments add <story_id> "BMAD STORY KEY v1\nKey: <story_key>\nEpic: <epic_key>\nSource: <epics doc path>"

  </action>

<output>✅ Sprint planning complete (idempotent). Existing epics/stories were reused; only new items were created. Use `bd ready` to find next work.</output>
</step>

</workflow>
