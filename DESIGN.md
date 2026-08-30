# MealTalk Design Contract

## Product character

MealTalk is a calm, practical wellness journal, not a clinical dashboard or a gamified diet app. Interfaces should feel warm, direct, and trustworthy: generous breathing room, strong hierarchy, plain Korean copy, and one clear action per surface. Nutrition data must remain readable without making body metrics feel judgmental.

## Foundations

The executable source of truth is `src/constants/theme.ts`. Product UI must consume those tokens through `useTheme`, `ThemedText`, `ThemedView`, or a shared primitive. Do not introduce one-off colors, spacing values, type sizes, radii, or shadows in a screen.

### Color

Semantic roles exist in both light and dark themes:

- `background`: page canvas.
- `surface` / `surfaceRaised`: grouped content and emphasized cards.
- `border`: separators and input outlines.
- `text` / `textSecondary`: primary and supporting copy.
- `primary` / `onPrimary`: the dominant action and its foreground.
- `success`, `warning`, `error`, `info`: status meaning only; never decoration alone.
- `focus`: keyboard and assistive focus indication.

Color never carries status by itself. Pair it with a label, icon, or explanatory copy. Text/background combinations must meet WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text and controls).

### Typography

Use the distinctive rounded display family for titles and the readable sans family for body text. The supported scale is `display`, `heading1`, `heading2`, `heading3`, `heading4`, `body`, `bodyStrong`, `small`, and `caption`; code-like nutrition values may use `mono`. Preserve dynamic type on native platforms and browser zoom on web. Do not communicate hierarchy through size alone: use weight, spacing, and semantic labels.

### Spacing and shape

Spacing follows the 4/8-based `Spacing` scale (`half` through `six`). The default page rhythm is `three` between related controls and `five` between sections. Use `Radius` tokens for controls, cards, pills, and modal surfaces. Interactive controls use the shared minimum touch target token (44 px minimum); dense nutrition tables must not shrink their actions below it.

Elevation is rare. Prefer a border or tonal surface; reserve shared shadows for floating navigation, dialogs, and destructive confirmations.

## Composition

Build screens from themed primitives rather than raw styled containers. Every remote-data surface must render an explicit loading, empty, error, and content state. Use the shared state primitives in `src/components/async-state.tsx`; write contextual titles and recovery copy rather than generic “Something went wrong” text.

Forms keep labels visible, place units beside values, preserve entered values after recoverable errors, and show field errors adjacent to the field. Disable duplicate submission while a request is pending, but never disable a control without exposing why. Server data is authoritative for nutrition totals.

## Responsive layout

- Compact (under 600 px): one column, edge padding from the spacing scale, bottom navigation, and full-width primary actions when appropriate.
- Medium (600-899 px): one centered content column with optional side-by-side related fields.
- Wide (900 px and above): cap reading/form content at `MaxContentWidth`; journals may use a secondary summary rail while preserving task order in the DOM.
- Respect safe-area insets on native devices. Web layouts must work at 320 px width and at 200% zoom without horizontal scrolling, except genuinely tabular nutrition data.
- Do not hide required actions on hover. Pointer hover may enhance an existing affordance only.

## Interaction and motion

Use motion to explain state changes, not to decorate routine input. Prefer short opacity/position transitions and stagger only meaningful journal groups. Respect reduced-motion settings; no required information may depend on animation completion. Loading indicators must have an accessible label and must not cause layout jumps.

## Accessibility

- Every control has a programmatic name, role, state, and at least the shared minimum target size.
- Keyboard focus order follows visual/task order. Web focus indication uses `focus` and is never removed.
- Validation and request failures use live/alert semantics and move focus only when that helps recovery.
- Inputs expose label, hint, error, required state, and suitable keyboard/input mode.
- Icons supplement text for unfamiliar actions; icon-only actions require an accessibility label.
- Support screen readers, keyboard-only use, dynamic type, browser zoom, reduced motion, and light/dark contrast.

## Destructive actions

Archive and delete are never the default action. Use explicit verbs naming the affected record. Require confirmation for irreversible deletion and for archive actions that remove an item from active workflows. Confirmation explains impact, keeps cancel as the initial/safe action, prevents duplicate submission, and reports failure without dismissing the dialog. Never use color alone to distinguish the destructive action.

## Visual QA gate

For each product screen, verify compact and wide web viewports plus one native-sized viewport in light and dark mode. Check default, loading, empty, validation error, server error, stale/404, pending submission, and success states. Exercise keyboard navigation, visible focus, 200% zoom, reduced motion, long Korean labels, and large text. Capture screenshots only after fonts and data settle, and record viewport, theme, route, and fixture used.

A change is not ready when it introduces hardcoded visual values, clips text, relies on color alone, lacks a remote-data state, or cannot be completed by keyboard.

## Accepted design debt

The repository began from an Expo starter. Starter routes, imagery, English copy, and tab labels remain temporary until their planned product slices replace them. Existing splash/icon colors live in Expo asset configuration rather than runtime tokens. Google sign-in retains Google’s required brand treatment. These exceptions must not be copied into new product UI, and this foundation task does not redesign authenticated product screens.
