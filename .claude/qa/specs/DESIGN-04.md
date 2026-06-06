---
id: DESIGN-04
title: Node cards have consistent visual style header color bar handle positions
severity: low
source_files:
  - app/layout.tsx
---

## What this tests
Verifies that all node cards follow a consistent visual structure — dark background, header with icon badge + title + subtitle, color-accented borders on selection, and handle dots that are consistently sized and aligned.

## Prerequisites
- App is running at http://localhost:3000
- A canvas with several different node types (AI, Logic, Transform, Static) is open

## Steps — node card structure

1. Navigate to a canvas with at least 5 different node types
2. For each node, verify the visual structure:
   - **Outer container**: `rounded-2xl`, `border`, dark background `bg-[#1a1a1c]`, shadow
   - **Header**: darker background `bg-[#212124]`, bottom border `border-white/[0.06]`, `rounded-t-2xl` (top corners only)
   - **Icon badge**: `h-8 w-8 rounded-lg` with a color-specific background, icon centered
   - **Title**: `text-[13px] font-semibold text-white`
   - **Subtitle**: `text-[11px]` with accent color at reduced opacity (e.g. `text-violet-300/70`)

## Steps — selection state

3. Click a node to select it — verify:
   - Border changes to `border-{color}-500/50` (colored border matching the node's accent color)
   - Shadow appears: `shadow-{color}-900/20`
4. Click away to deselect — border returns to `border-white/[0.08]` (default faint border)

## Steps — handle dot consistency

5. Inspect input handles (left side) and output handles (right side) on several nodes:
   - Handle size: `!w-2.5 !h-2.5` (10px × 10px)
   - Border: `!border-2 !border-[#1a1a1c]` (dark border matching node background)
   - Color: accent color specific to handle type (violet for main, emerald for success, rose for error, etc.)
6. Verify handles are visually aligned with their labeled rows in the node body

## Steps — color coding by category

7. Verify each node category uses a distinctive accent color:
   - **AI nodes** (Anthropic, Token Counter): violet/amber
   - **Logic nodes** (If, Router, Cache): orange/emerald/teal
   - **Transform nodes** (String Ops, Math): sky/purple
   - **Static nodes** (Text, Number, Boolean): teal/amber/emerald
8. Verify the icon badge, border-on-select, and handle dots all use the same accent color for a given node

## Expected result
- All nodes share the structural pattern: `rounded-2xl bg-[#1a1a1c]` container, `bg-[#212124]` header
- Title: `text-[13px] font-semibold text-white` on all nodes
- Subtitle: `text-[11px]` with category color at ~70% opacity
- Selected: colored border and shadow matching the node's accent color
- Handles: 10×10px, 2px dark border, colored fill

## Failure indicators
- Some nodes have a white or colored background instead of `bg-[#1a1a1c]`
- Node titles use different font sizes (some 12px, some 14px)
- Selection border color doesn't match the node's accent color
- Handles are different sizes on different node types

## Severity rationale
Low: visual inconsistency in node cards would make the canvas feel unpolished; nodes of different categories should be identifiable by their color coding.

## Source reference
Node component files in `components/canvas/nodes/` — all follow the pattern: `w-{N} rounded-2xl shadow-2xl`, selected state `border-{color}-500/50 shadow-{color}-900/20`, header `bg-[#212124]`, handles `!w-2.5 !h-2.5 !border-2 !border-[#1a1a1c] !bg-{color}-400`.
