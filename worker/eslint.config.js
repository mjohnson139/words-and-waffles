import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', '.wrangler/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  { rules: { 'no-console': 'error' } },
);
