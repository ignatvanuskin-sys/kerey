import coreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Плоская конфигурация ESLint 9.
 * `eslint-config-next` v16 уже отдаёт готовый массив конфигов (включая правила TypeScript),
 * поэтому дополнительная обёртка не нужна.
 */
const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**', 'media-output/**', 'next-env.d.ts'],
  },
  ...coreWebVitals,
];

export default config;
