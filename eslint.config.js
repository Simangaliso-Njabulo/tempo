import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs', '*.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: { projectService: false },
      globals: {
        document: 'readonly',
        localStorage: 'readonly',
        matchMedia: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
        { type: 'app', pattern: 'src/app/**' },
        { type: 'test', pattern: 'src/test/**' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Dynamic HTML is forbidden. Render text through React.',
        },
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Dynamic HTML is forbidden. Use textContent or React rendering.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval is forbidden.',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'new Function is forbidden.',
        },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'application' } },
              allow: [{ to: { element: { type: 'domain' } } }],
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
              ],
            },
            {
              from: { element: { type: 'presentation' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
              ],
            },
            {
              from: { element: { type: 'app' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'infrastructure' } } },
                { to: { element: { type: 'presentation' } } },
              ],
            },
            {
              from: { element: { type: 'test' } },
              allow: [
                { to: { element: { type: 'domain' } } },
                { to: { element: { type: 'application' } } },
                { to: { element: { type: 'infrastructure' } } },
                { to: { element: { type: 'presentation' } } },
              ],
            },
          ],
        },
      ],
    },
  },
);
