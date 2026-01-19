---
title: "Ambient Code followup: PR merged"
date: "2026-01-19T09:00:00+02:00"
draft: false
tags: ["AI", "Agents", "Claude"]
---

This is a followup to [my previous post about how I tried Ambient Code]({{< ref "ambient-code.md" >}}).

TL;DR: [I opened a PR (#specfile/508)](https://github.com/packit/specfile/pull/508) and had to take over in the end.

<img src="/img/ice.JPG" style="width: 640px;">

## Where did we end?

Claude Code proposed a solid implementation plan to us, Stella (the staff engineer agent) approved it.

<!--more-->

I said yes to Claude and opened [the PR: #specfile/508](https://github.com/packit/specfile/pull/508).

## Review

Thankfully, we have an exceptional engineer, [Nikola](https://github.com/nforro), on our team who's the lead maintainer of the Specfile library.

I did not inspect the changes in detail and this is not a codebase I'm familiar with much. But Nikola is and did not enjoy the pull request - he asked for several improvements:
1. Simplify the implementation and reduce newly introduced tech debt with too many code changes and a newly added function that dupes an existing one.
2. Improve and fix docstrings and comments.
3. Drop code changes that are not needed

Well, I asked Claude Code to get back to work:
```
❯ The implementation is not good enough. The maintainer requested merging the functionality of has_valid_day_padding into property day_of_month_padding. Propose an implementation that
  addresses this request and consult it with Stella.

● Let me consult with Stella on the best approach to merge the validation functionality into the day_of_month_padding property.
```

It laid out multiple options and I picked number four.
```
  Option 4: Inline Validation in Property (Maintainer's Likely Intent)

  Modify day_of_month_padding to include validation comment, remove separate property:

  @property
  def day_of_month_padding(self) -> str:
      """
      Padding of day of month in the entry header timestamp.

      Returns empty string for invalid entries (e.g., double-digit days with
      space padding like "Dec  11") to prevent propagating formatting errors.
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
          (?P<day>(?P<zp>0)?[1-9]\d*)  # day of month (1-31)
          [ ]                          # space after day
          """,
          self.header,
          re.VERBOSE,
      )

      if not m:
          return ""

      wsp = m.group("wsp")
      zp = m.group("zp") or ""
      day_str = m.group("day")

      try:
          day_num = int(day_str)
      except (ValueError, TypeError):
          return ""

      # Reject invalid padding: double-digit days with whitespace
      if day_num >= 10 and wsp:
          return ""

      return wsp + zp

  Calling code (simplified):
  if changelog:
      padding = max(
          (e.day_of_month_padding for e in reversed(changelog)),
          key=len,
          default="0"
      )
  else:
      padding = "0"

  Stella's Assessment:
  - ✅ Pros: Simplest solution, removes duplicate property
  - ✅ Pros: Maintains str return type (no breaking changes)
  - ✅ Pros: max(..., key=len) automatically filters out "" (invalid entries) in favor of valid padding
  - ⚠️ Cons: Semantic ambiguity (same as Option 2)
  - ⚠️ Cons: Slightly reduces code clarity - validation is hidden inside property
  - ✅ Mitigation: Clear docstring explains the behavior

  Verdict: ✅ Best compromise for maintainer's request. Simple, no API breakage, reduces code.

  ---
  Stella's Final Recommendation

  Recommended Approach: Option 4 (Inline Validation)

  Rationale:
  1. Maintainer's Intent: They want to eliminate the duplicate property - Option 4 does this
  2. Backward Compatibility: No type changes, existing code continues working
  3. Simplicity: Single property, minimal code, clear docstring
  4. Correctness: max(..., key=len) already filters invalid "" returns naturally

  Implementation Changes:

  1. Modify day_of_month_padding property to include validation logic
  2. Remove has_valid_day_padding property entirely
  3. Simplify calling code in add_changelog_entry() (no filter needed)
  4. Update tests to test validation through day_of_month_padding return values
  5. Add test case: Verify that entries with double-digit day + space padding return ""

  Trade-off Accepted: Slight semantic ambiguity ("" means both "no padding" and "invalid") is acceptable because:
  - It's documented clearly
  - The behavior is intuitive (max prefers longer valid padding)
  - No breaking changes to public API

  ---
  Alternative If Maintainer Rejects Option 4

  Fallback: Option 3 (Shared Helper)
  - Maintains code clarity with explicit validation property
  - Eliminates regex duplication (the real technical debt)
  - Keeps API unchanged

  ---
  Should I proceed with Option 4 implementation?

✻ Baked for 1m 14s

❯ yes, proceed with option 4
```

But even this implementation was poor. At this point I relied 90% on AI to do the work for me so it was frustrating to answer PR comments for code I technically did not write (but was accountable for).

Surprisingly, Gemini Code Assist wasn't useful on this PR either, even though it often provides solid feedback. Most of its comments were pointless (one was spot on, though), it missed issues Nikola caught, and on several occasions it was outright wrong.

And that was enough for me. I took over, inspected the code changes in detail, played with tests locally, applied suggestions, simplified the changes. Cursor suggested a perfect regex for day of month parsing (thanks mate).

## Conclussion

AI is a powerful tool, it can be very helpful. But it's still a tool and you need to use it properly. You wouldn't ask your fridge to perform a C-section for a complicated birth.

It's frustrating how convincing LLMs can act. Don't get fooled! Their output can still be incorrect.
An example from this session:
```
  1. Minimal Surface Area: The fix is surgical - only touches the selection logic, not the parsing or formatting logic. This minimizes regression risk.
```

I can honestly say that statement is completely wrong: the initial proposal wasn't surgical nor minimal.

Even though Claude Code had several shots with the implementation, its work was poor in this realworld scenario. I'm sure I'd get better results with better prompts, but in that case, I can do the work myself. I absolutely enjoy engineering more than writing prompts.

As for Ambient Code, I definitely enjoyed the PM agent. Even though I didn't need a thorough breakdown of a feature, I truly enjoyed PM-like review of the Github issue.