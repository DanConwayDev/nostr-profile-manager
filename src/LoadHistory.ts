import * as timeago from 'timeago.js';
import { Event } from 'nostr-tools';
import { fetchCachedProfileEventHistory, submitUnsignedEvent } from './fetchEvents';

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
      : `<a href="#" id="restore-${e.kind}-${i}" class="secondary" onclick="event.preventDefault();alert('feature coming soon...');">Restore</a>`,
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
    // list modifications
    const modified = current.filter(
      (c) => next.filter((n) => n[1] === c[1]).some((n) => c[3] !== n[3]),
    );
    modified.forEach((r) => {
      const nv = next.find((n) => n[1] === r[1]);
      if (!nv) return null;
      if (!r[3] && !nv[3]) return null;
      if (r[3] && !nv[3]) return changes.push(`added petname for ${getPetname(r)}`);
      if (!r[3] && nv[3]) return changes.push(`removed petname for ${getPetname(r)}, previously ${getPetname(nv)}`);
      return changes.push(`modified petname for ${getPetname(r)}, previously ${getPetname(nv)}`);
    });
    // list deletes
    const removed = next.filter((c) => !current.some((n) => sameContact(c, n)));
    if (removed.length > 0) changes.push(`<div class="removed">removed ${removed.map(getPetname).join(', ')}</div>`);
  }
  return {
    ago: e.created_at,
    changes,
    option: i === 0
      ? '<ins>Backup Complete<ins>'
      : `<a href="#" id="restore-${e.kind}-${i}" class="secondary" onclick="event.preventDefault()">Restore</a>`,
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
    const relayReadAndWrite = (r:Kind10002Tag, addedorremoveed: 'added' | 'removed'): string => {
      const wonly = `<mark class="${addedorremoveed}">write</mark>`;
      const ronly = `<mark class="${addedorremoveed}">read</mark>`;
      const randw = `${ronly} and ${wonly}`;
      if (!r[2]) return randw;
      if (r[2] === 'write') return `${wonly} only`;
      return `${ronly} only`;
    };

    // list adds
    const added = current.filter((c) => !next.some((n) => n[1] === c[1]));
    if (added.length > 0) {
      added.forEach((r) => changes.push(
        `<div>added <mark>${r[1]}</mark> as ${relayReadAndWrite(r, 'added')}</div>`,
      ));
    }
    // list modified
    const modified = current.filter(
      (c) => next.filter((n) => n[1] === c[1]).some((n) => c[2] !== n[2]),
    );
    modified.forEach((r) => {
      const nv = next.find((n) => n[1] === r[1]);
      let s: string;
      if (!r[2]) {
        if (!!nv && nv[2] === 'read') s = '<mark class="added">write</mark> as well as read';
        else s = '<mark class="added">read</mark> as well as write';
      } else if (r[2] === 'read') {
        if (!nv) s = 'only read and no longer <mark class="removed">write</mark>';
        else s = '<mark class="added">read</mark> instead of <mark class="removed">write</mark>';
      } else if (!nv) s = 'only write and no longer <mark class="removed">read</mark>';
      else s = '<mark class="added">write</mark> instead of <mark class="removed">read</mark>';
      changes.push(`<div class="modified">modified <mark>${r[1]}</mark> to ${s}</div>`);
    });
    // list deletes
    const removed = next.filter((c) => !current.some((n) => n[1] === c[1]));
    if (removed.length > 0) {
      removed.forEach((r) => changes.push(
        `<div>removed <mark>${r[1]}</mark> which was ${relayReadAndWrite(r, 'removed')}</div>`,
      ));
    }
  }
  return {
    ago: e.created_at,
    changes,
    option: i === 0
      ? '<ins>Backup Complete<ins>'
      : `<a href="#" id="restore-${e.kind}-${i}" class="secondary" onclick="event.preventDefault()">Restore</a>`,
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

export const activateRestoreButtons = (history: Event[] | null, afterRestore: ()=> void):void => {
  history?.forEach((e, i) => {
    if (i === 0) return;
    const eid = `restore-${e.kind}-${i}`;
    const el = document.getElementById(eid) as HTMLAnchorElement;
    const { id, sig, ...unsigned } = e;
    unsigned.created_at = Math.floor(Date.now() / 1000);
    el.onclick = async (event) => {
      event.preventDefault();
      const r = await submitUnsignedEvent(unsigned, eid, 'Restored!');
      if (r) setTimeout(afterRestore, 1000);
    };
  });
};

export const loadBackupHistory = (RootElementID:string, kind: 0 | 10002 | 3) => {
  const h = fetchCachedProfileEventHistory(kind);
  const table = generateHistoryTable(h);
  (document.getElementById(RootElementID) as HTMLDivElement)
    .innerHTML = `<h4>Backup History</h4>${table}`;
  activateRestoreButtons(h, () => loadBackupHistory(RootElementID, kind));
};
