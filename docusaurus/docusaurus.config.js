// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Keuss Job Queues',
  tagline: 'Job Queues for node.js, backed by redis and/or MongoDB',
  url: 'https://pepmartinez.github.io',
  baseUrl: '/keuss/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'pepmartinez',
  projectName: 'keuss',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/pepmartinez/keuss/edit/master/website/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            'https://github.com/pepmartinez/keuss/edit/master/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Keuss job queues',
        logo: {
          alt: 'Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            to: 'docs/',
            activeBasePath: 'docs',
            label: 'Docs',
            position: 'left',
          },
          {to: 'blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/pepmartinez/keuss',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Start Here',
            items: [
              {
                label: 'Quickstart',
                to: 'docs/quickstart',
              },
              {
                label: 'Documentation',
                to: 'docs/',
              },
              {
                label: 'Examples',
                to: 'docs/examples',
              },
              {
                label: 'ChangeLog',
                to: 'docs/changelog',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: 'blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/pepmartinez/keuss',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()}. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
