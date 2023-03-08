import { nip05 } from 'nostr-tools';
import { fetchCachedProfileEvent, submitUnsignedEvent } from './fetchEvents';
import { loadBackupHistory } from './LoadHistory';
import { localStorageGetItem } from './LocalStorage';

type MetadataCore = {
  name: string;
  profile?: string;
  about?: string;
  banner?: string;
  nip05?: string;
  lud06?: string;
  lud16?: string;
};

export type MetadataFlex = MetadataCore & {
  [x: string | number | symbol]: unknown;
};

const toTextInput = (prop:string, m:MetadataFlex | null, displayname?:string) => `
    <label for="PM-form-${prop}">
        ${displayname || prop}
        <input
          type="text"
          name="PM-form-${prop}"
          id="PM-form-${prop}"
          placeholder="${displayname || prop}" ${m && m[prop] ? `value="${m[prop]}"` : ''}
        />
    </label>
`;
const toTextarea = (prop:string, m:MetadataFlex | null, displayname?:string) => `
    <label for="PM-form-${prop}">
      ${displayname || prop}
      <textarea
        id="PM-form-${prop}"
        name="PM-form-${prop}"
        placeholder="${displayname || prop}"
      >${m && m[prop] ? m[prop] : ''}</textarea>
    </label>
`;

const standardkeys = [
  'name',
  'nip05',
  'about',
  'picture',
  'banner',
  'lud06',
  'lud16',
];

const generateForm = (c:MetadataFlex | null):string => {
  const customkeys = !c ? [] : Object.keys(c).filter(((k) => !standardkeys.some((s) => s === k)));
  return `<form id="metadataform">
    <div class="grid">
      ${toTextInput('name', c)}
      ${toTextInput('nip05', c)}
    </div>
    ${toTextarea('about', c)}
    <img id="metadata-form-picture" src="${c && c.picture ? c.picture : ''}">
    ${toTextInput('picture', c)}
    <img id="metadata-form-banner" src="${c && c.banner ? c.banner : ''}">
    ${toTextInput('banner', c)}
    ${toTextInput('lud06', c, 'lud06 (LNURL)')}
    ${toTextInput('lud16', c)}
    ${customkeys.map((k) => toTextInput(k, c))}
    <button id="metadatasubmitbutton" type="submit">${c ? 'Update' : 'Save'}</button>
    <button id="metadataresetbutton" class="secondary outline" type="reset">Reset Form</button>
  </form>`;
};

const SubmitMetadataForm = async () => {
  // construct and populate new content object with form data. avoid reordering properties
  const fd = new FormData(document.getElementById('metadataform') as HTMLFormElement);
  const n:{ [x: string]: unknown; } = {};
  const e = fetchCachedProfileEvent(0);
  (e ? [...(Object.keys(JSON.parse(e.content))), ...standardkeys] : standardkeys)
    .forEach((k) => {
      const d = fd.get(`PM-form-${k}`);
      if (d && d !== '') n[k] = d;
    });
  // submit event
  const r = await submitUnsignedEvent(
    {
      pubkey: localStorageGetItem('pubkey') as string,
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      content: JSON.stringify(n),
      tags: [],
    },
    'metadatasubmitbutton',
  );
  // reload history
  if (r) loadBackupHistory('metadatahistory', 0);
};

const loadMetadataForm = (RootElementID:string) => {
  const e = fetchCachedProfileEvent(0);
  const MetadataContent = !e ? null : JSON.parse(e.content) as MetadataFlex;
  (document.getElementById(RootElementID) as HTMLDivElement)
    .innerHTML = `<div class="profileform">
    <h3>Metadata</h3>
    ${generateForm(MetadataContent)}
  </div>`;
  // refresh picture and banner on change event
  ['picture', 'banner'].forEach((n) => {
    const input = document.getElementById(`PM-form-${n}`) as HTMLInputElement;
    input.onchange = () => {
      (document.getElementById(`metadata-form-${n}`) as HTMLImageElement)
        .setAttribute('src', input.value);
    };
  });
  // check nip05
  const nip05input = document.getElementById('PM-form-nip05') as HTMLInputElement;
  const checkNip05 = async () => {
    if (nip05input.value === '') {
      nip05input.removeAttribute('aria-invalid');
    } else {
      let verified:boolean = false;
      try {
        const r = await nip05.queryProfile(nip05input.value);
        verified = !!r && r.pubkey === localStorageGetItem('pubkey');
      } catch { /* empty */ }
      nip05input.setAttribute('aria-invalid', verified ? 'false' : 'true');
    }
  };
  checkNip05();
  nip05input.onchange = checkNip05;
  // form submit event
  (document.getElementById('metadataform') as HTMLButtonElement).onsubmit = (event) => {
    SubmitMetadataForm();
    event.preventDefault();
  };
  // reset form
  (document.getElementById('metadataresetbutton') as HTMLButtonElement).onsubmit = (event) => {
    loadMetadataForm(RootElementID);
    event.preventDefault();
  };
};

export const LoadMetadataPage = () => {
  const o:HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div id="metadatapage" class="container">
      <div id="metadataform"></div>
      <div id="metadatahistory"></div>
    <div>
  `;
  loadMetadataForm('metadataform');
  loadBackupHistory('metadatahistory', 0);
};
