import {
  ASTWithSource,
  ImplicitReceiver,
  Interpolation,
  PropertyRead,
  TmplAstBoundText,
  TmplAstElement,
  TmplAstTemplate,
  parseTemplate
} from '@angular/compiler';
import type { TmplAstNode } from '@angular/compiler';
import { readFileSync } from 'node:fs';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginComponent } from './login.component';
import type { AuthService } from '../services/auth.service';
import type { UserPreferences } from '../models/api.models';
import * as ts from 'typescript';

describe('H-05 architecture invariants', () => {
  const productionFiles = [
    './login.component.ts',
    '../dashboard/dashboard.component.ts',
    '../services/auth.service.ts',
    '../services/tasks.service.ts',
    '../services/session.service.ts',
    '../models/api.models.ts',
    '../utils/api-error.ts',
    '../utils/legacy-format.ts',
    '../../environments/environment.ts'
  ];

  function readSource(file: string): ts.SourceFile {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8');
    return ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  }

  function collectNodes(source: ts.Node): ts.Node[] {
    const nodes: ts.Node[] = [];
    function visit(node: ts.Node): void {
      nodes.push(node);
      ts.forEachChild(node, visit);
    }
    visit(source);
    return nodes;
  }

  it.each(productionFiles)('has no explicit any in %s', (file) => {
    const source = readSource(file);
    const violations = collectNodes(source).filter((node) => node.kind === ts.SyntaxKind.AnyKeyword)
      .map((node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);

    expect(violations).toEqual([]);
  });

  it.each(['./login.component.ts', '../dashboard/dashboard.component.ts'])(
    'keeps HTTP and browser storage out of component %s', (file) => {
      const nodes = collectNodes(readSource(file));
      const directHttpImports = nodes.filter(ts.isImportDeclaration).filter((node) =>
        ts.isStringLiteral(node.moduleSpecifier)
        && ['axios', '@angular/common/http'].includes(node.moduleSpecifier.text));
      const storageReferences = nodes.filter(ts.isIdentifier).filter((node) =>
        ['localStorage', 'sessionStorage'].includes(node.text));

      expect(directHttpImports).toEqual([]);
      expect(storageReferences).toEqual([]);
    }
  );

  it.each(productionFiles)('keeps URL and session-key literals in their owners in %s', (file) => {
    const literals = collectNodes(readSource(file)).filter(ts.isStringLiteral);
    const backendUrls = literals.filter((node) => node.text.startsWith('http://') || node.text.startsWith('https://'));
    const sessionKeys = literals.filter((node) => node.text.startsWith('workshop_'));

    if (file !== '../../environments/environment.ts') {
      expect(backendUrls).toEqual([]);
    }
    if (file !== '../services/session.service.ts') {
      expect(sessionKeys).toEqual([]);
    }
  });

  it('keeps login validation free of nested if statements', () => {
    const source = readSource('./login.component.ts');
    const loginMethod = collectNodes(source).filter(ts.isMethodDeclaration).find((method) =>
      ts.isIdentifier(method.name) && method.name.text === 'login');
    expect(loginMethod).toBeDefined();
    const nestedConditions = collectNodes(loginMethod!).filter(ts.isIfStatement).filter((condition) => {
      let ancestor = condition.parent;
      while (ancestor && ancestor !== loginMethod) {
        if (ts.isIfStatement(ancestor)) {
          return true;
        }
        ancestor = ancestor.parent;
      }
      return false;
    });

    expect(nestedConditions).toEqual([]);
  });
});

describe('LoginComponent', () => {
  let authenticate: ReturnType<typeof vi.fn<AuthService['login']>>;
  let loadPreferences: ReturnType<typeof vi.fn<AuthService['loadPreferences']>>;
  let navigate: ReturnType<typeof vi.fn<(commands: unknown[]) => Promise<boolean>>>;
  let preferences: UserPreferences;

  function createComponent(): LoginComponent {
    const router: Pick<Router, 'navigate'> = { navigate };
    const auth: Pick<AuthService, 'login' | 'loadPreferences'> = { login: authenticate, loadPreferences };
    return new LoginComponent(router as Router, auth as AuthService);
  }

  beforeEach(() => {
    preferences = { theme: 'light', showTips: true, compact: false };
    authenticate = vi.fn<AuthService['login']>().mockResolvedValue(true);
    loadPreferences = vi.fn<AuthService['loadPreferences']>().mockReturnValue(preferences);
    navigate = vi.fn<(commands: unknown[]) => Promise<boolean>>().mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates original credentials and preferences before navigating on success', async () => {
    const component = createComponent();
    component.username = ' student ';
    component.password = ' Workshop123! ';

    await component.login();

    expect(authenticate).toHaveBeenCalledExactlyOnceWith(' student ', ' Workshop123! ', preferences);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/dashboard']);
    expect(authenticate.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
    expect(component.message).toBe('');
    expect(component.busy).toBe(false);
  });

  it('keeps busy true and does not navigate until authentication completes', async () => {
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';
    let completeAuthentication!: (authenticated: boolean) => void;
    authenticate.mockReturnValue(new Promise((resolve) => {
      completeAuthentication = resolve;
    }));

    const pendingLogin = component.login();

    expect(component.busy).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    completeAuthentication(true);
    await pendingLogin;
    expect(component.busy).toBe(false);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/dashboard']);
  });

  it.each([null, undefined, '', '   '])('rejects an empty username (%s) without calling the service', async (username) => {
    const component = createComponent();
    component.username = username;
    component.password = 'Workshop123!';
    component.message = 'Previous message';

    await component.login();

    expect(component.message).toBe('Ingrese un usuario.');
    expect(authenticate).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it.each([null, undefined, '', '   '])('rejects an empty password (%s) without calling the service', async (password) => {
    const component = createComponent();
    component.username = 'student';
    component.password = password;

    await component.login();

    expect(component.message).toBe('Ingrese una contrase\u00f1a.');
    expect(authenticate).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it('shows the missing-token message when the service reports no authenticated session', async () => {
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';
    authenticate.mockResolvedValue(false);

    await component.login();

    expect(component.message).toBe('El backend respondi\u00f3 sin token.');
    expect(navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it.each([
    { error: { response: { data: { message: 'Backend message' } }, message: 'Transport message' }, expected: 'Backend message' },
    { error: { response: { data: { message: '' } }, message: 'Transport message' }, expected: 'Transport message' },
    { error: {}, expected: 'Error desconocido' }
  ])('does not expose internal login error details: $expected', async ({ error }) => {
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';
    authenticate.mockRejectedValue(error);

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(console.error).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it.each([
    { theme: 'light', showTips: true, compact: false },
    { theme: 'light', showTips: false, compact: true, savedOptions: { notifications: { enabled: false } } },
    { theme: null, showTips: true, compact: false }
  ])('uses preferences supplied by the service without reinterpreting them (%j)', (savedPreferences) => {
    loadPreferences.mockReturnValue(savedPreferences);

    const component = createComponent();

    expect(component.preferences).toBe(savedPreferences);
    expect(loadPreferences).toHaveBeenCalledTimes(1);
  });

  it('restores busy and shows a public message if navigation fails', async () => {
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';
    navigate.mockRejectedValue(new Error('Private navigation detail'));

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(component.busy).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('H-03: interpolates message as text in the real template without an innerHTML binding', () => {
    const source = readFileSync(new URL('./login.component.html', import.meta.url), 'utf8');
    const template = parseTemplate(source, 'login.component.html');

    function collectElements(nodes: readonly TmplAstNode[]): TmplAstElement[] {
      return nodes.flatMap((node) => {
        if (node instanceof TmplAstElement) {
          return [node, ...collectElements(node.children)];
        }
        if (node instanceof TmplAstTemplate) {
          return collectElements(node.children);
        }
        return [];
      });
    }

    expect(template.errors).toBeNull();
    const elements = collectElements(template.nodes);
    const messageElement = elements.find((element) => element.attributes.some(
      (attribute) => attribute.name === 'class' && attribute.value === 'message'
    ));
    expect(messageElement).toBeDefined();
    expect(elements.flatMap((element) => element.inputs).some((input) => input.name === 'innerHTML')).toBe(false);

    const textBindings = messageElement?.children.filter(
      (node): node is TmplAstBoundText => node instanceof TmplAstBoundText
    ) ?? [];
    expect(textBindings.some((binding) => {
      const expression = binding.value;
      return expression instanceof ASTWithSource
        && expression.ast instanceof Interpolation
        && expression.ast.expressions.some((value) => value instanceof PropertyRead
          && value.receiver instanceof ImplicitReceiver
          && value.name === 'message');
    })).toBe(true);
  });

  it.each([
    { name: 'backend unavailable', error: { code: 'ERR_NETWORK', message: 'Network Error' } },
    { name: 'CORS rejection', error: new TypeError('Failed to fetch') },
    { name: 'login timeout', error: { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' } },
    { name: 'transport timeout', error: { code: 'ETIMEDOUT', message: 'Request timed out' } },
    { name: 'HTTP 401', error: { response: { status: 401, data: { message: 'Invalid credentials' } } } },
    { name: 'HTTP 403', error: { response: { status: 403, data: { message: 'Forbidden' } } } },
    { name: 'HTTP 500', error: { response: { status: 500, data: { message: 'Internal server detail' } } } },
    { name: 'storage write failure', error: new Error('Storage unavailable') }
  ])('recovers the form after $name without retrying or navigating', async ({ error }) => {
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';
    authenticate.mockRejectedValue(error);

    await component.login();

    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(component.busy).toBe(false);
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});