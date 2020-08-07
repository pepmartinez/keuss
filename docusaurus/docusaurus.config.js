module.exports = {
  title: 'Keuss Job Queues',
  tagline: 'Job Queues for node.js, backed by redis and/or MongoDB',
  url: 'https://pepmartinez.github.io/keuss',
  baseUrl: '/keuss/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'pepmartinez',
  projectName: 'keuss',
  themeConfig: {
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
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          // It is recommended to set document id as docs home page (`docs/` path).
          homePageId: 'about',
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
      },
    ],
  ],
};
