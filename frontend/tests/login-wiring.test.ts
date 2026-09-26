import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('onboarding login wiring', () => {
  it('keeps a single returning-login controller and exposes the modal opener', () => {
    expect((html.match(/function openReturningLogin\(\)/g) ?? []).length).toBe(1);
    expect(html).toContain('window.zenitOpenReturningLogin=openReturningLogin;');
    expect(html).toContain('window.zenitOpenExistingLogin=()=>openReturningLogin();');
  });

  it('keeps the login modal above the onboarding layer', () => {
    expect(html).toContain('.modal-backdrop { position: fixed; z-index: 110;');
  });

  it('does not retain the competing capture-phase login handler', () => {
    expect(html).not.toContain('event.stopImmediatePropagation();openReturningLogin();return;');
  });
});
