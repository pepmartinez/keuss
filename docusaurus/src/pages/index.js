import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: <>Based on existing components</>,
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Keuss does not reinvent the wheel: it uses existing technologies (Redis, MongoDB) to build
        professional-grade Job Queues on top of them
      </>
    ),
  },
  {
    title: <>Easy to use</>,
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>
        All types of job queues share a common, simple and concise API. Also, sensible defaults are
        provided for all configuration.
      </>
    ),
  },
  {
    title: <>Professional-grade features</>,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        All commonly seek features for job queues are provided: durability, at-most-once, at-least-once,
        deadletter, schedule, delays, replay...
      </>
    ),
  },
  {
    title: <>Flexibility</>,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Balance between durability guarantees, base technologies and performance can be achieved by
        selecting amongst the offered implementations
      </>
    ),
  },
];

function Feature({imageUrl, title, description}) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={clsx('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const {siteConfig = {}} = context;
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/')}>
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;
