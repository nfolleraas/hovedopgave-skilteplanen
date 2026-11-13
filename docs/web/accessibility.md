# Accessibility requirements

Accessibility is a required part of every frontend page and component. Build
the web app so that people can understand and operate it regardless of
disability, device, input method, or technical experience. Treat WCAG 2.2 AA
as the minimum target and include accessibility in design, implementation, and
review—not as a later polish step.

## Required outcomes

Every user must be able to:

- understand the page structure and available actions with a screen reader;
- complete all tasks using only a keyboard;
- read and use the interface with low vision, colour-vision deficiency, browser
  zoom, or increased text spacing;
- use every page on popular desktop, tablet, and mobile screen sizes with a
  responsive layout and without losing content or functionality;
- recover from mistakes and understand what the application is doing; and
- use the interface without needing technical knowledge or familiarity with
  the implementation.

## Semantic structure and screen readers

- Use native HTML elements first: headings, `main`, `nav`, `header`, `footer`,
  lists, buttons, links, forms, tables, and landmarks. Do not replace a native
  element with a clickable `div` or `span`.
- Give every page a meaningful, unique document title and one clear `h1`.
  Keep heading levels in a logical order and use headings to describe sections,
  not to create visual styling.
- Set the correct document language and update the page title and announced
  heading when client-side navigation changes the page. Provide a visible
  “Skip to main content” link on pages with repeated navigation.
- Give links and buttons accessible, action-oriented names. The name must make
  sense out of context; avoid labels such as “click here”, “more”, or an icon
  with no accessible label.
- Provide labels for every form control and use appropriate input types and
  `autocomplete` values. Associate help text, required status, constraints,
  and validation errors with the relevant control so assistive technology
  announces them.
- Add alternative text to informative images. Use empty alternative text for
  decorative images and never put essential information only in an image.
- Use ARIA only when native HTML cannot express the required behavior. If ARIA
  is used, provide the complete widget pattern: role, name, state, properties,
  keyboard behavior, focus behavior, and announcements.
- Announce important asynchronous changes, such as save results, errors, and
  loading completion, without moving focus unexpectedly.
- When an operation changes the page or opens a new view, announce the new
  context and place focus where the user can continue. Do not make focus jump
  to the top of the page after every update.

## Keyboard-only operation

- Every interactive feature must work with keyboard input alone. Test the
  complete user journey, not only individual controls.
- Keep a visible, high-contrast focus indicator. Never remove the browser
  outline without providing an equally clear replacement.
- Use a logical focus order that follows the visual and reading order. Do not
  introduce positive `tabindex` values.
- Ensure dialogs, menus, popovers, custom selects, drag-and-drop actions, and
  other widgets have documented keyboard behavior. Focus must move into a
  modal dialog when it opens, remain contained while it is open, and return to
  the triggering control when it closes.
- Provide a keyboard-accessible alternative for every pointer-only gesture,
  hover interaction, and drag-and-drop operation.
- Do not trap focus in a page or component unless the user is inside a modal
  dialog or another interaction that requires a deliberate focus boundary.
- Ensure keyboard users can dismiss temporary content, such as menus and
  dialogs, with the expected key (usually `Escape`) and can reach every control
  without depending on hover.

## Visual accessibility

- Do not communicate meaning by colour alone. Pair colour with text, icons,
  patterns, or another visible distinction.
- Maintain readable contrast for text, controls, focus indicators, and relevant
  graphical objects. Check both normal and hover/focus/disabled states.
- Support browser zoom and text enlargement without loss of content or
  functionality. Responsive layouts must not require horizontal scrolling for
  normal page content.
- Use the documented body text size and line height in the
  [stylesheet](styles/stylesheet.md), and avoid dense layouts, small click
  targets, and long uninterrupted blocks of text.
- Respect user preferences such as reduced motion, increased contrast, and
  dark/light colour schemes when the interface provides motion or themes.
  Never use flashing content.
- Make interactive targets easy to identify and activate, including on touch
  devices. Use at least a 24 by 24 CSS pixel target unless a documented WCAG
  exception applies; prefer larger targets and sufficient space between
  adjacent targets. Keep related labels and controls visually close together.

### Generic responsive layout examples

The following examples illustrate general responsive patterns; they do not
prescribe a specific implementation for any page or component. Choose the
pattern that best preserves the content, relationships, and actions on each
screen size. Common adaptations include:

- presenting a wide data table as a list of labelled cards on narrow screens,
  while keeping every value and row action available;
- replacing a horizontal navigation bar with an accessible menu button and
  navigation drawer (often called a burger menu) on smaller screens;
- stacking columns, form fields, filters, and action groups vertically when
  there is not enough room to display them side by side;
- allowing dialogs to use most or all of the viewport on small screens while
  keeping their title, close control, content, and primary actions visible and
  reachable; and
- wrapping, repositioning, or progressively disclosing secondary controls
  without changing their meaning or removing essential functionality.

Responsive changes must preserve logical reading and focus order. Do not rely
on visual rearrangement alone when the underlying document order would become
confusing for keyboard or screen-reader users.

## Clear and forgiving UX

The interface must be usable by people who are not technically experienced:

- Use plain Danish, sentence case, and familiar words. Explain technical terms
  when they are unavoidable.
- Make the next step and the result of an action clear. Use descriptive labels
  instead of relying on icons or hidden tooltips.
- Prevent errors where possible. For destructive or irreversible actions,
  clearly state what will happen and provide a meaningful confirmation or an
  undo path where appropriate.
- Preserve entered data when validation fails. Put errors next to the affected
  field, explain how to fix them, and provide a summary for long forms. Move
  focus to the summary or first invalid field when that helps the user recover.
- Keep navigation, terminology, controls, and layouts consistent across pages.
  Do not require users to remember information from another screen.
- Ensure loading, empty, success, and failure states are understandable and
  available to screen readers as well as visible users.

## Implementation and review checklist

Before merging a page or component, verify that:

- [ ] It has an appropriate semantic structure, accessible names, and labels.
- [ ] The entire flow works using only `Tab`, `Shift+Tab`, `Enter`, `Space`,
  and the expected arrow-key patterns.
- [ ] Focus is visible, ordered correctly, and managed correctly by overlays.
- [ ] A screen reader can identify headings, landmarks, controls, states, help
  text, validation errors, and asynchronous updates.
- [ ] The page declares the correct language, provides skip navigation where
  needed, and announces client-side route changes.
- [ ] Zoom, text enlargement, responsive widths, and increased text spacing do
  not hide or overlap content.
- [ ] The page is fully usable with a responsive layout on popular desktop,
  tablet, and mobile screen sizes.
- [ ] Interactive controls remain usable at touch sizes and do not rely on
  hover.
- [ ] Contrast and non-colour indicators have been checked in all relevant
  states.
- [ ] Loading, empty, success, and error states are clear and actionable.
- [ ] The wording is understandable to a non-technical user.
- [ ] Automated checks have been run, followed by manual keyboard and screen
  reader testing for the changed flow.

Automated tooling is useful for finding common mistakes, but it cannot prove
that a page is accessible. Manual testing is required for user journeys and
custom interactions. For changed flows, test with only a keyboard and with at
least one screen reader in a supported browser before merging.
