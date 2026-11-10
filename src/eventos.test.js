import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adicionarCampos,
  comPrefixo,
  montarEdicao,
  montarEvento,
  nomeEvento,
} from './eventos.js';

const identidade = {
  eventType: 'click',
  objectName: 'confirmar_retransmitir',
  objectDetail: 'confirmar_retransmitir',
};

test('adiciona o prefixo a360_ uma única vez', () => {
  assert.equal(comPrefixo('x'), 'a360_x');
  assert.equal(comPrefixo('a360_x'), 'a360_x');
});

test('monta o nome do evento no padrão da central', () => {
  assert.equal(
    nomeEvento(identidade),
    'click-a360_confirmar_retransmitir-confirmar_retransmitir',
  );
});

test('monta o POST igual ao da central', () => {
  const evento = montarEvento({
    ...identidade,
    destinationId: 1,
    descricao: 'desc',
    campos: [{ nome: 'tipoRejeicao', descricao: 'tipo de rejeicao' }],
  });

  assert.equal(evento.owner_team_id, 77);
  assert.deepEqual(evento.tags, ['altimus', 'web']);
  assert.equal(evento.triggered_when, 'desc');
  const [destino] = evento.event_destinations;
  assert.equal(destino.id, null);
  assert.deepEqual(destino.destination_identifier, [
    'click',
    'a360_confirmar_retransmitir',
    'confirmar_retransmitir',
  ]);
  assert.deepEqual(Object.keys(destino.schema.properties), [
    'userGuid',
    'organizationGuid',
    'temaExperiencia',
    'tipoRejeicao',
  ]);
  assert.equal(destino.schema.required, undefined);
});

test('recusa campo repetido', () => {
  const schema = { properties: { userGuid: { type: 'string' } } };
  assert.throws(
    () => adicionarCampos(schema, [{ nome: 'userGuid', descricao: 'x' }]),
    /já existe/,
  );
});

test('o PUT preserva o id do vínculo, as tags e os campos existentes', () => {
  const evento = {
    owner_team_id: 77,
    description: 'd',
    triggered_when: 't',
    tags: [{ name: 'web' }, 'altimus'],
    name: 'n',
  };
  const destinos = [
    {
      id: 11125,
      destination_id: 1,
      schema: { properties: { userGuid: { type: 'string' } } },
      destination_identifier: ['click', 'a', 'b'],
    },
  ];

  const put = montarEdicao(evento, destinos, [
    { nome: 'tipoRejeicao', descricao: 'x' },
  ]);

  assert.deepEqual(put.tags, ['web', 'altimus']);
  assert.equal(put.event_destinations[0].id, 11125);
  assert.deepEqual(Object.keys(put.event_destinations[0].schema.properties), [
    'userGuid',
    'tipoRejeicao',
  ]);
});

test('tags e time informados sobrescrevem os padrões', () => {
  const evento = montarEvento({
    ...identidade,
    destinationId: 1,
    descricao: 'd',
    tags: ['olx'],
    ownerTeamId: 5,
  });
  assert.deepEqual(evento.tags, ['olx']);
  assert.equal(evento.owner_team_id, 5);
});

test('lê as tags de tag_types e ignora os tipos ocultos', () => {
  const evento = {
    owner_team_id: 77,
    name: 'n',
    tag_types: [
      { should_appear_in_ui: true, tags: [{ value: 'web' }] },
      {
        should_appear_in_ui: true,
        tags: [{ value: 'olx' }, { value: 'altimus' }],
      },
      { should_appear_in_ui: false, tags: [{ value: 'lurker' }] },
    ],
  };
  const destinos = [{ id: 1, destination_id: 1, schema: { properties: {} } }];
  const put = montarEdicao(evento, destinos, [{ nome: 'x', descricao: 'y' }]);
  assert.deepEqual(put.tags, ['web', 'olx', 'altimus']);
});
