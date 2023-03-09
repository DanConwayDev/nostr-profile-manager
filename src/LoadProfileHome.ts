import { Event } from 'nostr-tools';
import {
  fetchCachedProfileEvent, fetchCachedProfileEventHistory, hadLatest, isUptodate,
} from './fetchEvents';
import LoadContactsPage from './LoadContactsPage';
import { LoadMetadataPage, MetadataFlex } from './LoadMetadataPage';
import LoadRelaysPage from './LoadRelaysPage';

export const generateLogoHero = () => (
  '<div><img class="hero-logo" src="./img/nostr-profile-manage-logo.png"></div>'
);

const injectLoading = (loading:boolean = true) => `${loading ? 'aria-busy="true"' : ''}`;

const generateMetadataSummary = (e:Event | null, loading = false) => {
  if (e == null) {
    return `<div>
      <button ${injectLoading(loading)} class="outline contrast">No Metadata</button>
    </div>`;
  }
  return `<div>
    <button
      ${injectLoading(loading)}
      class="outline contrast"
      id="metadatabutton"
    >
      ${Object.keys(JSON.parse(e.content)).length} Metadata Fields
    </button>
  </div>`;
};

const generateContactsSummary = (e:Event | null, loading = false) => {
  if (e == null) {
    return `<div><button
      ${injectLoading(loading)}
      id="contactsbutton"
    >No Contacts</button></div>`;
  }
  return `<div>
    <button
      ${injectLoading(loading)}
      id="contactsbutton"
    >${e.tags.length} Contacts</button>
  </div>`;
};

const generateRelaysSummary = (e:Event | null, loading = false) => {
  if (e == null) {
    return `<div>
      <button
        ${injectLoading(loading)}
        id="relaysbutton"
        class="outline secondary"
      >No Relays</button>
    </div>`;
  }
  const read = e.tags.filter((t) => typeof t[2] === 'undefined' || t[2] === 'read').length;
  const write = e.tags.filter((t) => typeof t[2] === 'undefined' || t[2] === 'write').length;
  return `<div><button
    ${injectLoading(loading)}
    id="relaysbutton"
    class="outline secondary"
  >
    ${e.tags.length} Relay${e.tags.length === 1 ? '' : 's'} (${read} read ${write} write)
    </button></div>`;
};

const generateMetadataHeader = (e:Event) => {
  const c = JSON.parse(e.content) as MetadataFlex;
  // remove new lines from about
  let about = c.about ? c.about.replace(/\r?\n|\r/, '') : '';
  if (about.length > 50) about = `${about.substring(0, 47)}...`;
  return `
    <div>
      <img src="${c.picture ? c.picture : ''}">
      <strong>${c.name ? c.name : ''}</strong> <small>${c.nip05 ? c.nip05 : ''}</small>
      <div><small>${about}</small></div>
    </div>
  `;
};

export const generateBackupHeroHeading = (
  uptodate:boolean,
  noprofileinfo:boolean,
  hadlatest:boolean,
) => {
  let content = '';
  if (!uptodate) {
    if (noprofileinfo) {
      content = `
        <h1 aria-busy="true">Finding Profile...</h1>
        <p>It's your first time here and we are backing up your metadata, contacts and relays to your offline browser data.</p>
      `;
    } else {
      content = `
        <h1 aria-busy="true">Finding Latest Profile...</h1>
        <p>We backing up your latest metadata, contacts and relays to your offline browser data.</p>
      `;
    }
  } else if (noprofileinfo) {
    content = `
      <h1>No Profile Events Found</h1>
      <p>We didn't find any profile info for you. Either wedidn't look on the right relays or you have just created a key pair.</p>
      <p>Only proceed if you are setting your profile up for the first time.</p>
    `;
  } else if (hadlatest) {
    content = `
      <h1>Backup is up to date!</h1>
      <p>
        We already had backed up your profile to your offline browser data.
        <a href="#" class="secondary" onclick="event.preventDefault()">Download</a> for safe keeping.
      </p>
      <p>If your profile ever gets wiped by a nostr client, come back here on this device to restore. Come back from time to time to update your backup.</p>
    `;
  } else {
    content = `
      <h1>Profile Backup Up!</h1>
      <p>
        We just backed up your latest profile to your offline browser data.
        <a id="downloadprofile" href="#" class="secondary" onclick="event.preventDefault()">Download</a> for safe keeping.
      </p>
      <p>If your profile ever gets wiped by a nostr client, come back here on this device to restore. Come back from time to time to update your backup.</p>
    `;
  }
  return `<div>${content}</div<`;
};

export const LoadProfileHome = () => {
  const noprofileinfo = !fetchCachedProfileEvent(0) && !fetchCachedProfileEvent(3);
  const uptodate = isUptodate();
  const hadlatest = hadLatest();
  const o:HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div class="container">
        <div class="hero grid">
          ${noprofileinfo ? generateLogoHero() : `<div><article class="profile-summary-card">
            ${generateMetadataHeader(fetchCachedProfileEvent(0) as Event)}
            <div>
              ${generateMetadataSummary(fetchCachedProfileEvent(0), !uptodate)}
              ${generateContactsSummary(fetchCachedProfileEvent(3), !uptodate)}
              ${generateRelaysSummary(fetchCachedProfileEvent(10002), !uptodate)}
            </div>
          </article></div>`}
          <div>${generateBackupHeroHeading(uptodate, noprofileinfo, hadlatest)}</div>
        </div>
    </div>
  `;
  const mbutton = document.getElementById('metadatabutton');
  if (mbutton) mbutton.onclick = () => LoadMetadataPage();
  const cbutton = document.getElementById('contactsbutton');
  if (cbutton) cbutton.onclick = () => LoadContactsPage();
  const rbutton = document.getElementById('relaysbutton');
  if (rbutton) rbutton.onclick = () => LoadRelaysPage();

  // enable download link
  const donwloada = document.getElementById('downloadprofile');
  if (donwloada) {
    donwloada.onclick = (event) => {
      event.preventDefault();
      const jsonStr = JSON.stringify([
        ...(fetchCachedProfileEventHistory(0) || []),
        ...(fetchCachedProfileEventHistory(2) || []),
        ...(fetchCachedProfileEventHistory(10002) || []),
        ...(fetchCachedProfileEventHistory(3) || []),
      ]);
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(jsonStr)}`);
      element.setAttribute('download', `my-nostr-profile-events-${Date.now()}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    };
  }
};
