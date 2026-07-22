// Native AggregateError (Chrome 85+/Safari 14+/Firefox 79+/Node 15+) — the
// core-js-pure polyfill gets stubbed by the catch-all noop, but
// @swagger-api/apidom-error does `class … extends AggregateError`, and a
// noop is not a constructor ("Class extends value undefined").
module.exports = AggregateError;
