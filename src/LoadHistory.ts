import * as timeago from 'timeago.js';
import { Event } from 'nostr-tools';

export type VersionChange = {
  ago:number;
  changes:string[];
  option:string;
};

const generateChangesTable = (changes:VersionChange[]) => `
    <table role="grid" class="historytable">
        <tbody>${changes.map((c) => `
            <tr>
                <td><small>${timeago.format(c.ago * 1000)}</small></td>
                <td><ul>${c.changes.map((v) => `<li>${v}</li>`).join('')}</ul></td>
                <td>${c.option}</td>
            </tr>
        `)}
        </tbody>
    </table>
`;

export const generateMetadataChanges = (
  history: Event[],
):VersionChange[] => history.map((e, i, a) => {
  const changes:string[] = [];
  const c = JSON.parse(e.content);
  const clean = (s:string | number) => (typeof s === 'string' ? s.replace(/\r?\n|\r/, '') : s);
  // if first backup list all fields and values
  if (i === a.length - 1) {
    Object.keys(c).forEach((k) => changes.push(`${k}: ${clean(c[k])}`));
  } else {
    const nextc = JSON.parse(a[i + 1].content);
    // list adds
    Object.keys(c)
      .filter((k) => !Object.keys(nextc).some((v) => v === k))
      .forEach((k) => { changes.push(`added ${k}: ${clean(c[k])}`); });
    // list modified
    Object.keys(c)
      .filter((k) => Object.keys(nextc).some((v) => v === k && nextc[k] !== c[k]))
      .forEach((k) => { changes.push(`modified ${k}: ${clean(c[k])}`); });
    // list deletes
    Object.keys(nextc)
      .filter((k) => !Object.keys(c).some((v) => v === k))
      .forEach((k) => { changes.push(`removed ${k}`); });
  }
  return {
    ago: e.created_at,
    changes,
    option: i === 0
      ? '<ins>Backup Complete<ins>'
      : `<a href="#" id="restore-metadata-${i}" class="secondary" onclick="event.preventDefault();alert('feature coming soon...');">Restore</a>`,
  };
});

export interface Kind3Event extends Event {
  kind:3;
  tags:['p', string, string, string][]
}

const sameContact = (
  x:['p', string, string, string],
  y:['p', string, string, string],
):boolean => !!(
  x[1] === y[1]
    || (x[3] && y[3] && x[3] === y[3])
);

const getPetname = (a:['p', string, string, string]):string => {
  if (a[3] && a[3].length > 0) return `<mark>${a[3]}</mark>`;
  return `<mark>${(a[1]).substring(0, 10)}...</mark>`;
  /**
   * todo: add npubEncode
   * npubEncode is imported from nostr-tools and causes the jest test runner to fail with:
   * SyntaxError: Cannot use import statement outside a module
   */
  // return `<mark>${npubEncode(a[1]).substring(0, 10)}...</mark>`;
};

export const generateContactsChanges = (
  history: Kind3Event[],
):VersionChange[] => history.map((e, i, a) => {
  const changes:string[] = [];
  const current = e.tags.filter((t) => t[0] === 'p');
  // if first backup list all contacts
  if (i === a.length - 1) changes.push(current.map(getPetname).join(', '));
  else {
    const next = a[i + 1].tags.filter((t) => t[0] === 'p');
    // list adds
    const added = current.filter((c) => !next.some((n) => sameContact(c, n)));
    if (added.length > 0) changes.push(`<div class="added">added ${added.map(getPetname).join(', ')}</div>`);
    // TODO: list modified
    // current.map((c) => JSON.stringify(c))
    // list deletes
    const removed = next.filter((c) => !current.some((n) => sameContact(c, n)));
    if (removed.length > 0) changes.push(`<div class="removed">removed ${removed.map(getPetname).join(', ')}</div>`);
  }
  return {
    ago: e.created_at,
    changes,
    option: i === 0
      ? '<ins>Backup Complete<ins>'
      : `<a href="#" id="restore-contacts-${i}" class="secondary" onclick="event.preventDefault()">Restore</a>`,
  };
});

export type Kind10002Tag = ['r', string] | ['r', string, 'read' | 'write' ];

export interface Kind10002Event extends Event {
  kind:3;
  tags:Kind10002Tag[]
}

const summariseRelay = (r: Kind10002Tag): string => r[1] + (r[2] ? ` ${r[2]} only` : '');

export const generateRelayChanges = (
  history: Kind10002Event[],
):VersionChange[] => history.map((e, i, a) => {
  const changes:string[] = [];
  const current = e.tags.filter((t) => t[0] === 'r');
  // if first backup list all relays
  if (i === a.length - 1) e.tags.forEach((r) => changes.push(summariseRelay(r)));
  else {
    const next = a[i + 1].tags;
    // list adds
    const added = current.filter((c) => !next.some((n) => n[1] === c[1]));
    if (added.length > 0) {
      added.forEach((r) => changes.push(
        `<div class="added">added <mark>${summariseRelay(r)}</mark></div>`,
      ));
    }
    // list modified
    const modified = current.filter(
      (c) => next.filter((n) => n[1] === c[1]).some((n) => c[2] !== n[2]),
    );
    if (modified.length > 0) {
      modified.forEach((r) => changes.push(
        `<div class="modified">modified <mark>${summariseRelay(r)}</mark></div>`,
      ));
    }
    // list deletes
    const removed = next.filter((c) => !current.some((n) => n[1] === c[1]));
    if (removed.length > 0) {
      removed.forEach((r) => changes.push(
        `<div class="removed">removed <mark>${summariseRelay(r)}</mark></div>`,
      ));
    }
  }
  return {
    ago: e.created_at,
    changes,
    option: i === 0
      ? '<ins>Backup Complete<ins>'
      : `<a href="#" id="restore-contacts-${i}" class="secondary" onclick="event.preventDefault()">Restore</a>`,
  };
});

export const generateHistoryTable = (history: Event[] | null):string => {
  if (!history || history.length === 0) return '<p>none</p>';
  let changes:VersionChange[];
  if (history[0].kind === 0) changes = generateMetadataChanges(history);
  else if (history[0].kind === 3) changes = generateContactsChanges(history as Kind3Event[]);
  else if (history[0].kind === 10002) changes = generateRelayChanges(history as Kind10002Event[]);
  else changes = [];
  return generateChangesTable(changes);
};
