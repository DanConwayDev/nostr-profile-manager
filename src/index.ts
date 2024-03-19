import { Event, UnsignedEvent } from 'nostr-tools';
import { generateLogoHero, LoadProfileHome } from './LoadProfileHome';
import { fetchMyContactsProfileEvents, fetchMyProfileEvents } from './fetchEvents';
import { localStorageGetItem, localStorageSetItem } from './LocalStorage';
import { LoadMetadataPage } from './LoadMetadataPage';
import LoadContactsPage from './LoadContactsPage';
import LoadRelaysPage from './LoadRelaysPage';
import Logout from './Logout';

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: UnsignedEvent) => Promise<Event>;
    };
  }
}

const loadProfile = async () => {
  // load profile page (in loading mode)
  LoadProfileHome();
  // load profile data
  await fetchMyProfileEvents(localStorageGetItem('pubkey') as string, LoadProfileHome);
  // load profile page (in complete mode)
  LoadProfileHome();
  // turn on nav
  (document.getElementById('mainnav') as HTMLElement).classList.remove('inactive');
  (document.getElementById('navhome') as HTMLElement).onclick = LoadProfileHome;
  (document.getElementById('navmetadata') as HTMLElement).onclick = LoadMetadataPage;
  (document.getElementById('navcontacts') as HTMLElement).onclick = LoadContactsPage;
  (document.getElementById('navrelays') as HTMLElement).onclick = LoadRelaysPage;
  (document.getElementById('navlogout') as HTMLElement).onclick = Logout;
  // get events from my contacts
  await fetchMyContactsProfileEvents();
};

const LoadLandingPage = () => {
  const aboutcontent = `
    <div class="container">
      <div class="hero grid">
        ${generateLogoHero()}
        <div id="herocontent">
          <h1>Nostr Profile Manager</h1>
          <p>Backup /&nbsp;Refine /&nbsp;Restore profile events</p>
          <a id="loadextension" href="#" onclick="return false;" role="button" class="contrast">Load My Profile</a>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="grid">
        <article>
          <h5>Backup</h5>
          <p>Save your profile in your offline browser data. Backup all your notes. Download in a zip.</p>
        </article>
        <article>
          <h5>Refine</h5>
          <p>Perfect your profile. Refine your relays. Clean up your contacts.</p>
        </article>
        <article>
          <h5>Restore</h5>
          <p>View profile backups and restore your favourate</p>
        </article>
      </div>
    </div>
  `;
  const o: HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = aboutcontent;
  const a = document.getElementById('loadextension');
  if (a) {
    a.onclick = async (ev) => {
      ev.preventDefault();
      if (window.nostr) {
        const pubkey = await window.nostr.getPublicKey();
        localStorageSetItem('pubkey', pubkey);
        loadProfile();
      } else {
        a.outerHTML = `
          <p>You need a NIP-07 browser extension like nos2x to use this webapp.</p>
          <a href="https://github.com/nostr-protocol/nips/blob/master/07.md#nip-07" role="button" class="contrast">Get Browser Extension</a>
        `;
      }
    };
  }
};

const load = async () => {
  // if new users
  if (!localStorageGetItem('pubkey')) LoadLandingPage();
  else loadProfile();
};

if (document.getElementById('PM-container') !== null) load();
else document.addEventListener('DOMContentLoaded', () => load());
