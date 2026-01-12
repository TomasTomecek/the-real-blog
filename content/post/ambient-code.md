---
title: "Ambient Code: first impressions"
date: "2026-01-12T19:00:00+02:00"
draft: false
tags: ["AI", "Agents", "Claude"]
---

Ambient Code is a platform (not covered here) and a collection of AI coding agents and workflows designed to help with software development. I decided to give it a shot and see how well their agents can analyze and contribute to one of our projects in Packit org.

The first tool we are going to use is called [agentready](https://github.com/ambient-code/agentready). It checks how well a project is maintained and suited for AI-assisted development.

From the README:

> AgentReady evaluates your repository across multiple dimensions of code quality, documentation, testing, and infrastructure to determine how well-suited it is for AI-assisted development workflows. The tool generates comprehensive reports with:

Let's jump right into the output for packit-service:

```
$ uvx --from git+https://github.com/ambient-code/agentready agentready -- assess .
Installed 54 packages in 408ms

Assessment complete!
  Score: 35.2/100 (Needs Improvement)
  Assessed: 22
  Skipped: 3
  Total: 25
  Duration: 6.1s

Assessment Results:
----------------------------------------------------------------------------------------------------
Test Name                           Test Result    Notes
----------------------------------------------------------------------------------------------------
architecture_decisions              ❌ FAIL         no ADR directory (need: ADR directory with deci...
branch_protection                   ⏭️ NOT_APPLICABLE Requires GitHub API integration for branch prot...
cicd_pipeline_visibility            ❌ FAIL         basic config (need: CI with best practices)
claude_md_file                      ❌ FAIL         missing (need: present)
code_smells                         ❌ FAIL         ruff (need: ≥60% of applicable linters configured)
concise_documentation               ❌ FAIL         24 lines, 3 headings, 3 bullets (need: <500 lin...
container_setup                     ⏭️ NOT_APPLICABLE Not applicable to ['YAML', 'Markdown', 'Python'...
conventional_commits                ❌ FAIL         not configured (need: configured)
cyclomatic_complexity               ✅ PASS         100/100
dependency_security                 ❌ FAIL         Security tools configured: gitleaks (need: ≥60 ...
file_size_limits                    ❌ FAIL         20 huge, 23 large out of 333 (need: <5% files >...
gitignore_completeness              ❌ FAIL         2/12 patterns (need: ≥70% of language-specific ...
inline_documentation                ❌ FAIL         19.3% (need: ≥80%)
issue_pr_templates                  ❌ FAIL         PR:False, Issues:5 (need: PR template + ≥2 issu...
lock_files                          ❌ FAIL         none (need: lock file with pinned versions)
one_command_setup                   ❌ FAIL         multi-step setup (need: single command)
openapi_specs                       ⏭️ NOT_APPLICABLE Not applicable to ['YAML', 'Markdown', 'Python'...
precommit_hooks                     ✅ PASS         100/100
readme_structure                    ❌ FAIL         1/3 sections (need: 3/3 sections)
semantic_naming                     ✅ PASS         100/100
separation_of_concerns              ❌ FAIL         organization:100, cohesion:87, naming:0 (need: ...
standard_layout                     ❌ FAIL         1/2 directories (need: 2/2 directories)
structured_logging                  ❌ FAIL         not configured (need: structured logging library)
test_coverage                       ❌ FAIL         not configured (need: configured with >80% thre...
type_annotations                    ❌ FAIL         50.6% (need: ≥80%)
----------------------------------------------------------------------------------------------------
```

Unfortunately, it seems that packit-service is just too big of a codebase. Let's try something smaller.

Specfile library has better results, though still a lot of failures:
```
$ uvx --from git+https://github.com/ambient-code/agentready agentready -- assess .

Assessment complete!
  Score: 48.0/100 (Bronze)
  Assessed: 22
  Skipped: 3
  Total: 25
  Duration: 1.3s

Assessment Results:
----------------------------------------------------------------------------------------------------
Test Name                           Test Result    Notes
----------------------------------------------------------------------------------------------------
architecture_decisions              ❌ FAIL         no ADR directory (need: ADR directory with deci...
branch_protection                   ⏭️  NOT_APPLICABLE Requires GitHub API integration for branch prot...
cicd_pipeline_visibility            ❌ FAIL         basic config (need: CI with best practices)
claude_md_file                      ❌ FAIL         missing (need: present)
code_smells                         ✅ PASS         67/100
concise_documentation               ❌ FAIL         323 lines, 49 headings, 0 bullets (need: <500 l...
container_setup                     ⏭️  NOT_APPLICABLE Not applicable to ['YAML', 'Markdown', 'Python']
conventional_commits                ❌ FAIL         not configured (need: configured)
cyclomatic_complexity               ✅ PASS         100/100
dependency_security                 ❌ FAIL         No security scanning tools configured (need: ≥6...
file_size_limits                    ❌ FAIL         1 huge, 6 large out of 73 (need: <5% files >500...
gitignore_completeness              ❌ FAIL         8/12 patterns (need: ≥70% of language-specific ...
inline_documentation                ❌ FAIL         39.2% (need: ≥80%)
issue_pr_templates                  ❌ FAIL         PR:False, Issues:0 (need: PR template + ≥2 issu...
lock_files                          ❌ FAIL         none (need: lock file with pinned versions)
one_command_setup                   ❌ FAIL         multi-step setup (need: single command)
openapi_specs                       ⏭️  NOT_APPLICABLE Not applicable to ['YAML', 'Markdown', 'Python']
precommit_hooks                     ✅ PASS         100/100
readme_structure                    ✅ PASS         100/100
semantic_naming                     ✅ PASS         99/100
separation_of_concerns              ✅ PASS         85/100
standard_layout                     ❌ FAIL         1/2 directories (need: 2/2 directories)
structured_logging                  ❌ FAIL         not configured (need: structured logging library)
test_coverage                       ❌ FAIL         not configured (need: configured with >80% thre...
type_annotations                    ✅ PASS         86/100
----------------------------------------------------------------------------------------------------
```

We are going to use this one to try the Ambient Code agents. So, let's see what they can do.

## Agents

We will run the agents inside Claude Code environment. We can ask Claude what agents are available in the [ambient-code/workflows](https://github.com/ambient-code/workflows) repo:
```
❯ What agents are available in this repository that you can utilize?

● Based on my exploration of this repository, here are the available agents and workflows you can utilize:

  Agents (in /agents and /agent bullpen)

  Active Agents (/agents/):
  - Parker - Product Manager
  - Ryan - UX Researcher
  - Stella - Staff Engineer
  - Steve - UX Designer
  - Terry - Technical Writer
```

Let's utilize Parker first. I picked an easy bugfix [issue 216](https://github.com/packit/specfile/issues/216), so let's see what Parker thinks about it:
```
❯ First task is for agent Parker. Work in repository cloned in path "~/g/packit/specfile". What is the priority to address issue "https://github.com/packit/specfile/issues/216"?

● Let me start by reading Parker's agent definition and fetching the GitHub issue to assess its priority.

● Read(agents/parker-product_manager.md)
  ⎿  Read 58 lines

● Bash(cd ~/g/packit/specfile && gh issue view 216)
  ⎿  title:     Ignore clearly incorrect entries when guessing day of month padding when adding changelog entry
     state:     OPEN
     author:    nforro
     … +15 lines (ctrl+o to expand)
  ⎿  Shell cwd was reset to /home/tt/g/workflows
```
At this point, I had to install `gh` since I don't normally use that tool.

The agent evaluated all issues in the project, not just the 216, and proposed this:
```
● Based on my analysis as Parker (Product Manager), here's the priority assessment for issue #216:

  Priority: LOW

  RICE Score: ~1.1

  Breakdown:

  - Reach: 1.5/13 - Minimal user impact
    - Only affects users encountering old, incorrectly-formatted spec files (like scipy from 2006)
    - Edge case scenario - most modern spec files follow proper formatting
    - Comment confirms: "some older specfiles"
  - Impact: 1.5/13 - Low business value
    - Cosmetic issue with changelog padding
    - Doesn't break parsing or core functionality
    - Minor annoyance, not a blocker
    - Labels confirm: gain/low, impact/low
  - Confidence: 75% - Moderate confidence
    - Issue is well-defined with clear example
    - Solution path is straightforward
    - complexity/single-task indicates feasibility
  - Effort: 1.5/13 - Low effort
    - Single-task complexity
    - Simple logic fix in padding detection algorithm

  Market Context:

  Looking at the backlog, higher priority issues exist:
  - Issue #483: Parsing bcond conditions (gain/high)
  - Issue #365: Condition splitting between sections (gain/high)
  - Issue #434: RPM-free mode (likely strategic feature)

  Recommendation:

  Backlog placement - Address when:
  1. Sprint has capacity for low-priority bugs
  2. Good first issue for community contributors
  3. Bundled with other changelog-related improvements

  Not recommended for immediate sprint planning. The team member comment confirms this: "really low prio." Focus resources on higher-impact items that affect broader user base and deliver measurable business outcomes.
```

Pretty impressive analysis. I have to agree with Parker.

Nevertheless, let's continue with agent Stella (staff engineer) and see what implementation she proposes:
```
Nevertheless, let's fix this issue. Please propose a plan how this issue can be fixed in specfile codebase.
```

Claude Code switched to plan mode and started examining specfile's codebase.
```
● Explore(Explore changelog padding logic)
  ⎿  Done (38 tool uses · 52.7k tokens · 3m 39s)
```

It followed with creating test cases. Since I'm running this in a toolbox environment, not all dependencies are installed and the development environment isn't fully set up.

I also noticed that agent Stella wasn't involved since I hadn't requested her. All of this was Claude Code. Let's see what it came up with.
```
● Perfect! I've created a comprehensive implementation plan. Let me present it for your approval.

● User approved Claude's plan
  ⎿  Plan saved to: ~/.claude/plans/imperative-finding-allen.md · /plan to edit
     Implementation Plan: Fix Issue #216 - Ignore Incorrect Padding in Changelog Entries

     Problem Summary

     When adding changelog entries, the code currently selects day-of-month padding by taking the longest padding from existing entries. This causes malformed entries (like "* Mon Dec  11 2006" with 2 spaces
     before double-digit day "11") to propagate incorrect formatting to new entries.

     The Bug Location: /home/tt/g/packit/specfile/specfile/specfile.py:643-650

     Root Cause

     Correct RPM changelog date formatting:
     - Single-digit days (1-9): "Dec  4" (2 spaces total) OR "Dec 04" (zero-padded) OR "Dec 4" (no padding)
     - Double-digit days (10-31): "Dec 11" (1 space total, no extra padding)

     The current code extracts padding " " from malformed entries like "Dec  11" and applies it to new entries, creating incorrect formatting like "Dec  15" instead of "Dec 15".

     Solution Approach

     Add a validation property to ChangelogEntry class to detect invalid padding (double-digit days with non-empty padding), then filter these entries when selecting padding in add_changelog_entry().

     Implementation Steps

     Step 1: Add validation property to ChangelogEntry class

     File: /home/tt/g/packit/specfile/specfile/changelog.py
     Location: After line 188 (after day_of_month_padding property)

     Add the following property:
     <code>

     Step 2: Update add_changelog_entry() to filter invalid entries

     File: /home/tt/g/packit/specfile/specfile/specfile.py
     Location: Lines 643-650

     Replace the existing padding selection logic:
     <code>

     Step 3: Add unit test for validation

     File: /home/tt/g/packit/specfile/tests/unit/test_changelog.py
     Location: After line 100 (after test_entry_day_of_month_padding)

     Add test for the validation property:
     <even-more-code>

     Step 4: Add integration test

     File: /home/tt/g/packit/specfile/tests/integration/test_specfile.py
     Location: After line 226 (after test_add_changelog_entry)

     Add integration test to verify filtering behavior:
     <yep-even-more-code>

          Critical Files to Modify

     1. /home/tt/g/packit/specfile/specfile/changelog.py - Add has_valid_day_padding property
     2. /home/tt/g/packit/specfile/specfile/specfile.py - Update add_changelog_entry() method
     3. /home/tt/g/packit/specfile/tests/unit/test_changelog.py - Add unit test
     4. /home/tt/g/packit/specfile/tests/integration/test_specfile.py - Add integration test

     Edge Cases Handled

     - All entries invalid: Falls back to zero-padding ("0")
     - Empty changelog: Maintains existing behavior (uses "0")
     - Extended timestamps: Works correctly (looks for space after day)
     - openSUSE-style changelogs: Compatible with same date format

     Verification Steps

     1. Run unit tests: cd ~/g/packit/specfile && pytest tests/unit/test_changelog.py::test_entry_has_valid_day_padding -v
     2. Run integration tests: cd ~/g/packit/specfile && pytest tests/integration/test_specfile.py::test_add_changelog_entry_ignores_invalid_padding -v
     3. Run full test suite: cd ~/g/packit/specfile && pytest
     4. Manual test: Create a spec file with malformed entries (like scipy) and verify new entries use correct padding
```

Impressive output, very convincing. I'd have to verify the code manually to see if the proposal is solid.

But first, let's ask Stella.

```
❯ Consult the plan with existing agents, especially Stella and Steve

● Let me consult with the agents Stella (Staff Engineer) and Steve (UX Designer) about this implementation plan.

● Read(agents/stella-staff_engineer.md)
  ⎿  Read 52 lines

● Read(agents/steve-ux_designer.md)
  ⎿  Read 48 lines

● Let me present the implementation plan to Stella (Staff Engineer) for technical review, as this is primarily a technical implementation issue. Steve's UX expertise is less applicable to this backend RPM spec fil
e parsing library.

  ---
  Consultation with Stella (Staff Engineer)

  Implementation Plan Review: Issue #216 - Changelog Padding Bug

  Context: We're fixing a bug where malformed changelog entries (like "* Mon Dec  11 2006" with extra spacing) propagate incorrect date formatting to new entries due to the max(..., key=len) selection logic.

  Proposed Solution:
  1. Add has_valid_day_padding property to ChangelogEntry class for validation
  2. Filter invalid entries before selecting padding in add_changelog_entry()
  3. Add comprehensive unit and integration tests

  ---
  Stella's Technical Assessment:

  Technical Soundness: ✓ Approved with Recommendations

  Strengths:

  1. Minimal Surface Area: The fix is surgical - only touches the selection logic, not the parsing or formatting logic. This minimizes regression risk.
  2. Single Responsibility: The has_valid_day_padding property encapsulates validation logic in the right place (ChangelogEntry class), making it testable and reusable.
  3. Backward Compatibility: Existing valid entries continue to work. The filter only removes malformed entries from consideration.
  4. Sensible Fallback: Using "0" (zero-padding) when all entries are invalid is safe and matches existing behavior for empty changelogs.

  Technical Concerns & Recommendations:

  1. Regex Pattern Duplication:
  The has_valid_day_padding property duplicates the regex from day_of_month_padding. This creates maintenance burden.

  Recommendation: Consider extracting the regex pattern and parsing logic into a private helper method that both properties can use:

  def _parse_day_info(self) -> Optional[Tuple[str, int]]:
      """
      Parse day of month information from header.

      Returns:
          Tuple of (whitespace_padding, day_number) or None if unparseable
      """
      weekdays = "|".join(WEEKDAYS)
      months = "|".join(MONTHS)
      m = re.search(
          rf"""
          ({weekdays})                 # weekday
          [ ]
          ({months})                   # month
          [ ]
          (?P<wsp>[ ]*)                # optional whitespace padding
          (?P<day>(?P<zp>0)?[1-9]\d*)  # day of month
          [ ]                          # space after day
          """,
          self.header,
          re.VERBOSE,
      )
      if not m:
          return None

      wsp = m.group("wsp")
      zp = m.group("zp") or ""
      day_str = m.group("day")

      try:
          day_num = int(day_str)
      except (ValueError, TypeError):
          return None

      return (wsp, zp, day_num)

  Then both properties use this helper. However, this refactoring adds scope - acceptable to defer to a follow-up PR if we want minimal changes now.

  2. Edge Case: Zero-Padded Double-Digit Days:

  The plan mentions "* Mon Oct  18 12:34:45..." as invalid, but I need to verify: what about "* Mon Oct 018..." (zero-padded double-digit)? While nonsensical, the regex (?P<day>(?P<zp>0)?[1-9]\d*) would match it.

  Recommendation: The current validation logic if day_num >= 10: return wsp == "" would correctly reject this as invalid (since wsp would capture spaces). This is correct behavior. No change needed, but add a test
 case for completeness.

  3. Performance Consideration:

  The validation property is called for every changelog entry when adding a new entry. For spec files with hundreds of changelog entries, this could be noticeable.

  Analysis: The regex is already compiled at runtime in Python 3.6+, and we're only processing changelogs once per add_changelog_entry() call. Performance impact is negligible for typical use cases (< 1000 entries
).

  4. Test Coverage Gap:

  The integration test only checks for "Jan 15" presence, which could pass even if the padding is wrong (since "15" is double-digit and doesn't show padding anyway).

  Recommendation: Enhance the integration test to also add an entry with a single-digit day to verify the padding is actually applied correctly:

  spec.add_changelog_entry("test entry", timestamp=datetime.date(2024, 1, 5))  # single-digit day

  with spec.sections() as sections:
      new_entry = sections.changelog[0]
      # Should use zero-padding: "Jan 05", not space-padding "Jan  5"
      assert "Jan 05" in new_entry
      assert "Jan  5" not in new_entry

  Architecture Alignment:

  Design Pattern Consistency: ✓ The approach follows existing patterns in the codebase:
  - Properties for metadata extraction (day_of_month_padding, evr, etc.)
  - List comprehension with filtering in add_changelog_entry()
  - Minimal changes to existing logic

  Testing Strategy: ✓ Matches existing test structure:
  - Parametrized unit tests for property behavior
  - Integration tests for end-to-end workflow
  - Test data using realistic spec file examples

    Risk Assessment:
  ┌───────────────────────────────────────┬────────────┬────────┬─────────────────────────────────────────────────────────────────────┐
  │                 Risk                  │ Likelihood │ Impact │                             Mitigation                              │
  ├───────────────────────────────────────┼────────────┼────────┼─────────────────────────────────────────────────────────────────────┤
  │ Breaking valid edge cases             │ Low        │ High   │ Comprehensive parametrized tests cover valid/invalid boundary cases │
  ├───────────────────────────────────────┼────────────┼────────┼─────────────────────────────────────────────────────────────────────┤
  │ Regex performance on large changelogs │ Low        │ Low    │ Regex is efficient; typical changelogs are < 100 entries            │
  ├───────────────────────────────────────┼────────────┼────────┼─────────────────────────────────────────────────────────────────────┤
  │ Maintenance burden from duplication   │ Medium     │ Low    │ Document with TODO comment; can refactor later                      │
  └───────────────────────────────────────┴────────────┴────────┴─────────────────────────────────────────────────────────────────────┘
  Final Recommendation:

  Approve for implementation with the following adjustments:

  1. Must have: Enhance integration test to verify single-digit day padding
  2. Should have: Add test case for nonsensical zero-padded double-digit (e.g., "Dec 018")
  3. Nice to have: Add TODO comment about potential regex deduplication for future refactoring
  4. Documentation: Add docstring examples to has_valid_day_padding showing valid/invalid cases

  Estimated Effort: 1-2 hours for implementation + testing
  Technical Debt Introduced: Minimal (potential regex duplication)
  Regression Risk: Low (well-isolated change with good test coverage)

  ---
  Stella's Code Review Checklist for Implementation:

  When I review the PR, I'll verify:

  - Regex pattern correctly matches all valid RPM date formats
  - Validation logic handles all edge cases (single-digit, double-digit, zero-padded, space-padded)
  - Tests cover boundary cases comprehensively
  - No performance regressions (run pytest with -v to check test execution time)
  - Code follows existing style conventions in the module
  - Docstrings are clear and include examples

  ---
  Summary: This is a well-scoped, technically sound fix. The approach is conservative and minimizes risk. With the recommended test enhancements, this will be a solid, maintainable solution.
```

The feedback from Stella is pretty solid, with very nice improvements for more test cases and reducing tech debt.

One thing I'd love to see is more concise output from these agents. I really appreciate the structured output so one can skip sections that are not that important. But in the end there is just too much text printed.

Other than that, it was amazing to see these agents collaborate, and especially refine an existing proposal. Let's create that PR, that will be our next blog post.