
function _consume_loop (q) {
  console.log ('getting element from queue...');

  q.pop('consumer-webhooks', {reserve: true}, (err, elem) => {
    if (err) {
      // error: log it, wait a bit and continue
      console.error ('error while popping:', err);
      return setTimeout (() => _consume_loop (q), 1000);
    }

    console.log ('got elem with id %s, tries %d', elem._id, elem.tries);

    q.ok (elem, err => {
      if (err) console.error ('error while committing, continuing anyway:', err);
      else console.log ('committed elem %s', elem._id);

      _consume_loop (q);
    });
  });
}

module.exports = (context) => {
  _consume_loop (context.q);
};
