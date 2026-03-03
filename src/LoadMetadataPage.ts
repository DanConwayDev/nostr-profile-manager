import { nip05 } from 'nostr-tools';
import { sanitize } from 'isomorphic-dompurify';
import { fetchCachedMyProfileEvent, submitUnsignedEvent } from './fetchEvents';
import { loadBackupHistory } from './LoadHistory';
import { localStorageGetItem } from './LocalStorage';

type MetadataCore = {
  name: string;
  picture?: string;
  about?: string;
  banner?: string;
  nip05?: string;
  lud06?: string;
  lud16?: string;
};

export type MetadataFlex = MetadataCore & {
  [x: string | number | symbol]: unknown;
};

const toTextInput = (prop: string, m: MetadataFlex | null, displayname?: string) => `
    <label for="PM-form-${prop}">
        ${displayname || prop}
        <input
          type="text"
          name="PM-form-${prop}"
          id="PM-form-${prop}"
          placeholder="${displayname || prop}" ${m && m[prop] ? `value="${sanitize(m[prop] as string)}"` : ''}
        />
    </label>
`;
const toTextarea = (prop: string, m: MetadataFlex | null, displayname?: string) => `
    <label for="PM-form-${prop}">
      ${displayname || prop}
      <textarea
        id="PM-form-${prop}"
        name="PM-form-${prop}"
        placeholder="${displayname || prop}"
      >${m && m[prop] ? sanitize(m[prop] as string) : ''}</textarea>
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

const generateForm = (c: MetadataFlex | null): string => {
  const customkeys = !c ? [] : Object.keys(c).filter(((k) => !standardkeys.some((s) => s === k)));
  return `<form id="metadatapageform">
    <div class="grid">
      ${toTextInput('name', c)}
      ${toTextInput('nip05', c)}
    </div>
    ${toTextarea('about', c)}
    <img id="metadata-form-picture" src="${c && c.picture ? sanitize(c.picture) : ''}">
    ${toTextInput('picture', c)}
    <img id="metadata-form-banner" src="${c && c.banner ? sanitize(c.banner) : ''}">
    ${toTextInput('banner', c)}
    ${toTextInput('lud06', c, 'lud06 (LNURL)')}
    ${toTextInput('lud16', c)}
    <div id="customfieldscontainer">${customkeys.map((k) => toTextInput(k, c)).join('')}</div>
    <div class="grid">
      <label for="PM-new-field-name">
        Add custom field
        <input
          type="text"
          id="PM-new-field-name"
          name="PM-new-field-name"
          placeholder="custom field name"
        />
      </label>
      <div style="align-self: end;">
        <button id="metadataaddfieldbutton" class="secondary" type="button">Add field</button>
      </div>
    </div>
    <button id="metadatasubmitbutton" type="submit">${c ? 'Update' : 'Save'}</button>
    <button id="metadataresetbutton" class="secondary outline" type="reset">Reset Form</button>
  </form>`;
};

const SubmitMetadataForm = async () => {
  // construct and populate new content object with form data. avoid reordering properties
  const fd = new FormData(document.getElementById('metadatapageform') as HTMLFormElement);
  const n: { [x: string]: unknown; } = {};
  const e = fetchCachedMyProfileEvent(0);
  const existingKeys = e ? Object.keys(JSON.parse(e.content)) : [];
  const keys: string[] = [
    ...existingKeys,
    ...standardkeys.filter((k) => existingKeys.indexOf(k) === -1),
  ];
  // include any dynamically added fields present in the form
  // (those with name starting with PM-form-)
  Array.from(fd.keys()).forEach((formKey) => {
    const k = typeof formKey === 'string' && formKey.startsWith('PM-form-')
      ? formKey.substring('PM-form-'.length)
      : '';
    if (k && keys.indexOf(k) === -1) keys.push(k);
  });
  keys.forEach((k) => {
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

const loadMetadataForm = (RootElementID: string) => {
  const e = fetchCachedMyProfileEvent(0);
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
      let verified: boolean = false;
      try {
        const r = await nip05.queryProfile(nip05input.value);
        verified = !!r && r.pubkey === localStorageGetItem('pubkey');
      } catch { /* empty */ }
      nip05input.setAttribute('aria-invalid', verified ? 'false' : 'true');
    }
  };
  checkNip05();
  nip05input.onchange = checkNip05;
  // add-field handler
  const addButton = document.getElementById('metadataaddfieldbutton') as HTMLButtonElement | null;
  if (addButton) {
    addButton.onclick = (event) => {
      const nameInput = document.getElementById('PM-new-field-name') as HTMLInputElement;
      const key = nameInput.value.trim();
      // allow only simple safe keys and avoid duplicates/standard keys
      const isValidKey = /^[a-zA-Z0-9_-]+$/.test(key);
      if (!key || !isValidKey) { event.preventDefault(); return; }
      if (standardkeys.indexOf(key) !== -1) { event.preventDefault(); return; }
      if (document.getElementById(`PM-form-${key}`)) { event.preventDefault(); return; }
      const container = document.getElementById('customfieldscontainer') as HTMLDivElement;
      if (container) container.insertAdjacentHTML('beforeend', toTextInput(key, null));
      nameInput.value = '';
      event.preventDefault();
    };
  }
  // form submit event
  (document.getElementById('metadatasubmitbutton') as HTMLButtonElement).onclick = (event) => {
    SubmitMetadataForm();
    event.preventDefault();
  };
  // reset form
  (document.getElementById('metadataresetbutton') as HTMLButtonElement).onclick = (event) => {
    loadMetadataForm(RootElementID);
    event.preventDefault();
  };
};

export const LoadMetadataPage = () => {
  const o: HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div id="metadatapage" class="container">
      <div id="metadataformcontainer"></div>
      <div id="metadatahistory"></div>
    <div>
  `;
  loadMetadataForm('metadataformcontainer');
  loadBackupHistory('metadatahistory', 0);
};
