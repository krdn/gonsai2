/**
 * Docusaurus Configuration
 *
 * Documentation site for n8n integration project.
 */

// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'n8n 워크플로우 관리',
  tagline: 'Next.js 15 기반 n8n 통합 플랫폼',
  favicon: 'img/favicon.ico',

  url: 'https://your-domain.com',
  baseUrl: '/docs/',

  organizationName: 'gonsai2',
  projectName: 'n8n-workflow-management',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-org/your-repo/tree/main/apps/frontend/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./docs/src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.jpg',
      navbar: {
        title: 'n8n 워크플로우 관리',
        logo: {
          alt: 'Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: '문서',
          },
          {
            href: '/api',
            label: 'API',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/your-org/your-repo',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '문서',
            items: [
              {
                label: '시작하기',
                to: '/getting-started',
              },
              {
                label: 'API 문서',
                to: '/api',
              },
              {
                label: 'n8n 통합',
                to: '/n8n-integration',
              },
            ],
          },
          {
            title: '커뮤니티',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/your-org/your-repo',
              },
              {
                label: 'Issues',
                href: 'https://github.com/your-org/your-repo/issues',
              },
            ],
          },
          {
            title: '더 보기',
            items: [
              {
                label: 'n8n 공식 문서',
                href: 'https://docs.n8n.io/',
              },
              {
                label: 'Next.js 문서',
                href: 'https://nextjs.org/docs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} n8n Workflow Management. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer/themes/github'),
        darkTheme: require('prism-react-renderer/themes/dracula'),
        additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'javascript'],
      },
      algolia: {
        appId: 'YOUR_APP_ID',
        apiKey: 'YOUR_SEARCH_API_KEY',
        indexName: 'n8n-workflow-management',
        contextualSearch: true,
      },
    }),

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi',
        docsPluginId: 'classic',
        config: {
          n8nApi: {
            specPath: 'docs/api/openapi.yaml',
            outputDir: 'docs/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
            },
          },
        },
      },
    ],
  ],

  themes: ['docusaurus-theme-openapi-docs'],
};

module.exports = config;
