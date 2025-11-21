/**
 * Sidebars Configuration
 *
 * Documentation site navigation structure.
 */

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '시작하기',
      items: [
        'getting-started/introduction',
        'getting-started/docker-setup',
        'getting-started/n8n-connection',
        'getting-started/environment-variables',
        'getting-started/first-workflow',
      ],
    },
    {
      type: 'category',
      label: 'API 문서',
      items: [
        'api/overview',
        'api/authentication',
        'api/workflows',
        'api/executions',
        'api/webhooks',
        'api/error-codes',
      ],
    },
    {
      type: 'category',
      label: 'n8n 통합',
      items: [
        'n8n-integration/overview',
        'n8n-integration/workflow-creation',
        'n8n-integration/ai-nodes',
        'n8n-integration/custom-nodes',
        'n8n-integration/performance-optimization',
        'n8n-integration/best-practices',
      ],
    },
    {
      type: 'category',
      label: '운영 가이드',
      items: [
        'operations/monitoring',
        'operations/backup-recovery',
        'operations/scaling',
        'operations/troubleshooting',
        'operations/security',
      ],
    },
    {
      type: 'category',
      label: '개발자 문서',
      items: [
        'developers/architecture',
        'developers/api-wrapper',
        'developers/error-handling',
        'developers/testing',
        'developers/contribution',
      ],
    },
    {
      type: 'category',
      label: '아키텍처 다이어그램',
      items: ['architecture/diagrams'],
    },
  ],
};

module.exports = sidebars;
