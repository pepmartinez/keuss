import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Based on existing components',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Keuss does not reinvent the wheel: it uses existing components (Redis, MongoDB) to provide foundation
        services (HA-safe storage, event bus, shared key/value storage) and builds professional-grade Job
        Queues on top of them
      </>
    ),
  },
  {
    title: 'Easy to use',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        All types of job queues share a common, simple and concise API. Sensible defaults are
        provided for all configuration, and semantics are coherent across all types
      </>
    ),
  },
  {
    title: 'Professional-grade features',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Unlike other external-storage job queue implementations, Keuss provides all commonly seek features
        for job queues: durability, at-most-once, at-least-once, deadletter, schedule, delays, history,
        clustering...
      </>
    ),
  },
  {
    title: 'Flexibility',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Balance between durability guarantees, base technologies and performance can be achieved by
        selecting amongst the offered implementations
      </>
    ),
  },
  {
    title: 'Performance',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Performance (as in throughput and latency) is part of the design goals of Keuss
      </>
    ),
  },
  {
    title: 'Cluster ready',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Job Queues are ready to be used seamlessly on a clustered environment with no extra effort
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
