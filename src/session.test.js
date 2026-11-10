import assert from 'node:assert/strict';
import { test } from 'node:test';
import { montarCookie } from './session.js';

test('monta o header Cookie a partir da lista do navegador', () => {
  assert.equal(
    montarCookie([
      { name: 'tc_session', value: 'a' },
      { name: 'tc_remember_token', value: 'b' },
    ]),
    'tc_session=a; tc_remember_token=b',
  );
});
