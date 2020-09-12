module.exports = {
  someSidebar: [
    {
      type: 'category',
      label: 'Intro',
      items: [
        'about',
        'quickstart',
        'concepts'
      ]
    },
    {
      type: 'category',
      label: 'Usage',
      items: [
        'usage/putting-all-together',
        'usage/buckets',
        'usage/shutdown',
        'usage/no-signaller',
        'usage/redis-conns',
        {
          Pipelines: [
            'usage/pipelines/about',
            'usage/pipelines/processors',
            'usage/pipelines/building',
            'usage/pipelines/examples',
          ]
        }
      ]
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api/factory',
        'api/signal',
        'api/stats',
        'api/queue'
      ]
    },
    {type: 'doc', id: 'examples'},
    {type: 'doc', id: 'changelog'},
  ],
};
