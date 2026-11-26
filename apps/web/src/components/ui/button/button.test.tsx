import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './button.js';

describe('Button', () => {
  it('renders a native button element with text', () => {
    const html = renderToStaticMarkup(<Button type="button">Save</Button>);
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('Save');
  });

  it('passes through props', () => {
    const html = renderToStaticMarkup(
      <Button aria-label="Primary action" disabled type="submit" />,
    );

    expect(html).toContain('aria-label="Primary action"');
    expect(html).toContain('disabled');
    expect(html).toContain('type="submit"');
  });
});
