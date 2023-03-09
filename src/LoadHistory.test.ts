import {
  generateContactsChanges, generateHistoryTable, generateMetadataChanges, generateRelayChanges,
  Kind10002Event, Kind3Event,
} from './LoadHistory';
import { MetadataFlex } from './LoadMetadataPage';
import SampleEvents from './SampleEvents';

const weekago = Math.round((Date.now() / 1000) - (60 * 60 * 24 * 7.1));
const monthsago = Math.round((Date.now() / 1000) - (60 * 60 * 24 * 7 * 5));

describe('generateHistoryTable', () => {
  test('null history parameter returns <p>none</p>', () => {
    expect(generateHistoryTable(null)).toEqual('<p>none</p>');
  });
  test('ago property reflects created_at date for each change', () => {
    const r = generateHistoryTable([
      { ...SampleEvents.kind0, created_at: weekago },
      { ...SampleEvents.kind0, created_at: monthsago },
    ]);
    expect(r).toContain('1 week ago');
    expect(r).toContain('1 month ago');
  });
});

describe('generateMetadataChanges', () => {
  const kind0content = JSON.parse(SampleEvents.kind0.content) as MetadataFlex;
  test('last event list all the fields, one per item in change array', () => {
    const r = generateMetadataChanges([
      { ...SampleEvents.kind0 },
      {
        ...SampleEvents.kind0,
        content: JSON.stringify({
          name: 'Bob',
          about: 'my profile is great!',
          picture: 'https://example.com/profile.png',
        }),
      },
    ]);
    expect(r[1].changes).toEqual([
      'name: Bob',
      'about: my profile is great!',
      'picture: https://example.com/profile.png',
    ]);
  });
  test('when a content property is added, the addition is listed in the changes array', () => {
    const r = generateMetadataChanges([
      {
        ...SampleEvents.kind0,
        content: JSON.stringify({ ...kind0content, custom: 'custom property value' }),
      },
      { ...SampleEvents.kind0 },
    ]);
    expect(r[0].changes).toEqual(['added custom: custom property value']);
  });
  test('when a content property is modified, the modification is listed in the changes array', () => {
    const r = generateMetadataChanges([
      {
        ...SampleEvents.kind0,
        content: JSON.stringify({ ...kind0content, name: 'Bob' }),
      },
      { ...SampleEvents.kind0 },
    ]);
    expect(r[0].changes).toEqual(['modified name: Bob']);
  });
  test('when a content property is removed, the removal is listed in the changes array', () => {
    const c = { ...kind0content };
    delete c.about;
    const r = generateMetadataChanges([
      { ...SampleEvents.kind0, content: JSON.stringify(c) },
      { ...SampleEvents.kind0 },
    ]);
    expect(r[0].changes).toEqual(['removed about']);
  });
  test('when a content properties are added, modified and removed, this is all referenced in the changes array', () => {
    const c = { ...kind0content, name: 'Bob', custom: 'custom property value' };
    delete c.about;
    const r = generateMetadataChanges([
      { ...SampleEvents.kind0, content: JSON.stringify(c) },
      { ...SampleEvents.kind0 },
    ]);
    expect(r[0].changes).toEqual([
      'added custom: custom property value',
      'modified name: Bob',
      'removed about',
    ]);
  });
});

describe('generateContactsChanges', () => {
  test('the oldest event list all the contacts as a single change', () => {
    const r = generateContactsChanges([
      { ...SampleEvents.kind3 } as Kind3Event,
    ]);
    expect(r[0].changes).toEqual(['<mark>alice</mark>, <mark>bob</mark>, <mark>carol</mark>']);
  });
  test('when a contact is added, the addition is listed in the changes array', () => {
    const s = JSON.parse(JSON.stringify(SampleEvents.kind3));
    s.tags.push(['p', '3248364987321649321', '', 'fred']);
    const r = generateContactsChanges([
      s,
      { ...SampleEvents.kind3 },
    ]);
    expect(r[0].changes).toEqual(['<div class="added">added <mark>fred</mark></div>']);
  });
  test('when a contact is removed, the removal is listed in the changes array', () => {
    const s = JSON.parse(JSON.stringify(SampleEvents.kind3));
    delete s.tags[2];
    const r = generateContactsChanges([
      s,
      { ...SampleEvents.kind3 },
    ]);
    expect(r[0].changes).toEqual(['<div class="removed">removed <mark>carol</mark></div>']);
  });
  test('when a contact is added and another removed, both events are listed in the changes array', () => {
    const s = JSON.parse(JSON.stringify(SampleEvents.kind3));
    delete s.tags[2];
    s.tags.push(['p', '3248364987321649321', '', 'fred']);
    const r = generateContactsChanges([
      s,
      { ...SampleEvents.kind3 },
    ]);
    expect(r[0].changes).toEqual([
      '<div class="added">added <mark>fred</mark></div>',
      '<div class="removed">removed <mark>carol</mark></div>',
    ]);
  });
});

describe('generateRelaysChanges', () => {
  test('the oldest event list all the relays', () => {
    const r = generateRelayChanges([
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com'],
          ['r', 'wss://brando-relay1.com'],
        ],
      } as Kind10002Event,
    ]);
    expect(r[0].changes).toEqual([
      'wss://alicerelay.example.com',
      'wss://brando-relay.com',
      'wss://brando-relay1.com',
    ]);
  });
  test('read only and write only relays are maked as such', () => {
    const r = generateRelayChanges([
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
          ['r', 'wss://brando-relay1.com', 'write'],
        ],
      } as Kind10002Event,
    ]);
    expect(r[0].changes).toEqual([
      'wss://alicerelay.example.com',
      'wss://brando-relay.com read only',
      'wss://brando-relay1.com write only',
    ]);
  });
  test('when a relay is added, the addition is listed in the changes array', () => {
    const r = generateRelayChanges([
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
          ['r', 'wss://brando-relay1.com', 'write'],
        ],
      } as Kind10002Event,
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
        ],
      } as Kind10002Event,
    ]);
    expect(r[0].changes).toEqual(['<div>added <mark>wss://brando-relay1.com</mark> as <mark class="added">write</mark> only</div>']);
  });
  test('when a relay is removed, the removal is listed in the changes array', () => {
    const r = generateRelayChanges([
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
        ],
      } as Kind10002Event,
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
          ['r', 'wss://brando-relay1.com', 'write'],
        ],
      } as Kind10002Event,
    ]);
    expect(r[0].changes).toEqual(['<div>removed <mark>wss://brando-relay1.com</mark> which was <mark class="removed">write</mark> only</div>']);
  });
  test('when a relay is modified, the modification is listed in the changes array', () => {
    const r = generateRelayChanges([
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
        ],
      } as Kind10002Event,
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'write'],
        ],
      } as Kind10002Event,
    ]);
    expect(r[0].changes).toEqual(['<div class="modified">modified <mark>wss://brando-relay.com</mark> to <mark class="added">read</mark> instead of <mark class="removed">write</mark></div>']);
  });
  test('when a contact is added and another removed, both events are listed in the changes array', () => {
    const r = generateRelayChanges([
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://brando-relay1.com', 'write'],
          ['r', 'wss://brando-relay.com', 'read'],
        ],
      } as Kind10002Event,
      {
        ...SampleEvents.kind10002,
        tags: [
          ['r', 'wss://alicerelay.example.com'],
          ['r', 'wss://brando-relay.com', 'read'],
        ],
      } as Kind10002Event,
    ]);
    expect(r[0].changes).toEqual([
      '<div>added <mark>wss://brando-relay1.com</mark> as <mark class="added">write</mark> only</div>',
      '<div>removed <mark>wss://alicerelay.example.com</mark> which was <mark class="removed">read</mark> and <mark class="removed">write</mark></div>',
    ]);
  });
});
