# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal technical blog built with Hugo, deployed on Netlify. Published at https://blog.tomecek.net/.

## Commands

- `hugo` — build the site (output to `public/`)
- `hugo server -wD` — local dev server with file watching and draft rendering

## Architecture

- **Hugo static site generator** with the `hugo-steam-theme` (a forked git submodule)
- **Content**: all blog posts live in `content/post/` as Markdown files
- **Images**: stored in `static/img/`, referenced in posts as `/img/filename.ext`
- **Theme**: `themes/hugo-steam-theme/` (git submodule from TomasTomecek/hugo-steam-theme)
- **Config**: `config.toml` — site settings, analytics, Disqus comments, taxonomies

## Blog Post Conventions

Front matter format (YAML):
```yaml
---
title: "Post Title"
date: "2026-03-19T12:00:00+02:00"
draft: false
tags: ["Tag1", "Tag2"]
---
```

- Use `<!--more-->` to mark the summary/excerpt cutoff point
- File naming: kebab-case (e.g., `my-new-post.md`)
- Unsafe HTML is enabled in Goldmark renderer — posts can embed raw HTML (e.g., `<img>` tags with style attributes)
- Only taxonomy used is tags
- Images use raw HTML: `<img src="/img/filename.jpg" style="width: 800px;">`
- Posts often open with an unrelated nature/landscape photo

## Writing Style

When drafting or editing blog posts, match these patterns:

**Tone**: Casual-professional, like talking to a colleague. Freely uses contractions, dry humor, and emotional honesty (including frustration and self-deprecation). Never stiff or formal.

**Structure**: Open fast with 1-3 sentences that drop the reader right into the context — no preambles. Place `<!--more-->` after the opening paragraph. Use short H2 sections with plain headers. End abruptly — a single sentence conclusion is typical ("That's it!", "Happy hacking!", "Have fun!", "Onto next adventures!").

**Sentences**: Short and punchy. Frequent one-word reactions: "Neat.", "Really?", "Impressive.", "Why?". Active voice, first person singular ("I"). Parenthetical asides for clarification or humor.

**Verbal habits**:
- "Let's" to invite action: "Let's go!", "Let's see", "Let's do it"
- "Pretty" as the go-to intensifier: "pretty impressive", "pretty neat", "pretty solid"
- Rhetorical questions to transition between sections: "But how?", "What would happen?"
- "tl;dr" for quick summaries
- **Bold key terms** in bullet lists: `**Term**: explanation`

**Technical content**: Show-don't-tell. Paste real terminal output (including actual paths like `~/git/foo/bar`). Keep commentary between code blocks brief and conversational ("How does our container look now?", "Let's check"). Let code and output speak for themselves.

**Credits**: Name colleagues and link to their GitHub profiles when relevant.

**Self-referencing**: Occasionally addresses himself in third person ("Tomas, just relax."). Transparent about the writing process itself.
