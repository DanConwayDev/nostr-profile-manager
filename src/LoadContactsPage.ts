import { Event, nip05, nip19 } from 'nostr-tools';
import {
  fetchAllCachedProfileEvents, fetchCachedMyProfileEvent, fetchCachedProfileEvent,
  fetchProfileEvent, getContactMostPopularPetname, getContactName, getMyPetnameForUser,
  getMyRelayForUser, isUserMyContact, submitUnsignedEvent,
} from './fetchEvents';
import { Kind3Event, loadBackupHistory } from './LoadHistory';
import { localStorageGetItem } from './LocalStorage';

/**
 * TODO
 *   > 'Suggested Housekeeping' section that:
 *     > highligts out suggestions (deleted, do not use, compromised, old profile)
 *     > add relays
 */
const getPubkey = (e:Event | string) => (typeof e === 'string' ? e : e.pubkey);

const generateMicroCardLi = (eventorpubkey:Event | string):string => {
  const pubkey = getPubkey(eventorpubkey);
  return `
    <li>
      <a
        href="#"
        onclick="return false;"
        class="microcard ${typeof eventorpubkey === 'string' ? 'nokind0' : ''}"
        id="contact-microcard-${pubkey}"
      >
        ${getContactName(pubkey)}
      </a>
    </li>
  `;
};

const generateMicroCardList = (eventorpubkeys:(Event | string)[]):string => `
  <ul id="maincontactlist">${eventorpubkeys.map(
    (e) => generateMicroCardLi(typeof e === 'string' ? e : e.pubkey),
  ).join('')}</ul>
`;

const generateContactDetails = (pubkey:string):string => {
  const e = fetchCachedProfileEvent(pubkey, 0);
  if (!e) {
    return `
      <article>
        <strong>${getContactName(pubkey)}</strong>
        <p>loading users metadata...</p>
      </article>
    `;
  }
  const m = JSON.parse(e.content);
  const otherspetname = getContactMostPopularPetname(pubkey);
  const ismycontact = isUserMyContact(pubkey);
  return `
    <article>
      <div>
        ${m && !!m.picture ? `<img src="${m.picture}" /> ` : ''}
        <div class="contactdetailsmain">
          <strong>${m.name ? m.name : '[unknown name]'}</strong>
          ${m.nip05 ? `<small id="nip05-${pubkey}">${m.nip05} </small>` : ''}<span id="nip05-${pubkey}-verified"></span>
          ${otherspetname && otherspetname !== m.name ? `<div>popular petname: ${otherspetname}</div>` : ''}
          <div><small>${m.about ? m.about : ''}</small></div>
        </div>
      </div>
      <footer class="contactdetailsform">
        <div class="grid">
          <label for="mypetname">
            petname
            <input
              type="text"
              name="mypetname"
              placeholder="petname"
              value="${getMyPetnameForUser(pubkey) || ''}"
              id="petname-contact-form-${pubkey}"
              onkeypress = "this.onchange();"
              onpaste    = "this.onchange();"
              oninput    = "this.onchange();"
            >
          </label>
          <label for="myrelay">
            relay
            <input
              type="text"
              name="myrelay"
              placeholder="relay"
              value="${getMyRelayForUser(pubkey) || ''}"
              id="relay-contact-form-${pubkey}"
              onkeypress = "this.onchange();"
              onpaste    = "this.onchange();"
              oninput    = "this.onchange();"
            >
          </label>
          <div class="contact-form-buttons">
            <button id="add-contact-${pubkey}" class="${ismycontact ? 'hide' : ''}">Add</button>
            <button id="update-contact-${pubkey}" class="hide">Update</button>
            <button id="remove-contact-${pubkey}" class="${ismycontact ? '' : 'hide'}">Remove Contact</button>
          </div>
        </div>
        <div class="grid">
        </div>
      </footer>
    </article>
  `;
};

const loadContactDetails = (pubkey:string):void => {
  // load html
  (document.getElementById('contactdetails') as HTMLDivElement)
    .innerHTML = generateContactDetails(pubkey);
  // scroll to top
  window.scrollTo(0, 0);
  // reload if no kind0
  const reload = () => setTimeout(() => loadContactDetails(pubkey), 500);
  if (!fetchCachedProfileEvent(pubkey, 0)) reload();
  // on form change show update button instead of remove button
  const onchange = () => {
    if (!isUserMyContact(pubkey)) return;
    (document.getElementById(`update-contact-${pubkey}`) as HTMLButtonElement)
      .classList.remove('hide');
    (document.getElementById(`remove-contact-${pubkey}`) as HTMLButtonElement)
      .classList.add('hide');
  };
  (document.getElementById(`relay-contact-form-${pubkey}`) as HTMLInputElement)
    .onchange = onchange;
  (document.getElementById(`petname-contact-form-${pubkey}`) as HTMLInputElement)
    .onchange = onchange;
  // nip05
  const checkUserNip05 = async () => {
    const nip05el = document.getElementById(`nip05-${pubkey}`);
    if (nip05el) {
      const addr = nip05el.innerHTML.trim();
      let verified:boolean = false;
      try {
        const r = await nip05.queryProfile(addr);
        verified = !!r && r.pubkey === pubkey;
      } catch { /* empty */ }
      const verifiedel = (document.getElementById(`nip05-${pubkey}-verified`) as HTMLElement);
      if (verified) verifiedel.innerHTML = '<ins>&#10004; verified</ins>';
      else verifiedel.innerHTML = '<del>&#10004; verified</del>';
    }
  };
  checkUserNip05();
  // add / update / remove buttons
  const generateTag = (): ['p', string, string, string] => [
    'p',
    pubkey,
    (document.getElementById(`relay-contact-form-${pubkey}`) as HTMLInputElement).value || '',
    (document.getElementById(`petname-contact-form-${pubkey}`) as HTMLInputElement).value || '',
  ];
  const addUpdateOrRemoveContact = async (tags:['p', string, string, string][], ButtonID: string) => {
    await submitUnsignedEvent(
      {
        pubkey: localStorageGetItem('pubkey') as string,
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        content: '',
        tags,
      },
      ButtonID,
    );
    loadContactDetails(pubkey);
  };
  // add button
  (document.getElementById(`add-contact-${pubkey}`) as HTMLButtonElement).onclick = (event) => {
    event.preventDefault();
    const ce = fetchCachedMyProfileEvent(3) as Kind3Event || null;
    const tags = ce ? [...ce.tags, generateTag()] : [generateTag()];
    addUpdateOrRemoveContact(tags, `add-contact-${pubkey}`);
  };
  // update button
  (document.getElementById(`update-contact-${pubkey}`) as HTMLButtonElement).onclick = (event) => {
    event.preventDefault();
    const ce = fetchCachedMyProfileEvent(3) as Kind3Event;
    const tags = [...ce.tags.map((t) => (t[1] === pubkey ? generateTag() : t))];
    addUpdateOrRemoveContact(tags, `update-contact-${pubkey}`);
  };
  // remove button
  (document.getElementById(`remove-contact-${pubkey}`) as HTMLButtonElement).onclick = (event) => {
    event.preventDefault();
    const ce = fetchCachedMyProfileEvent(3) as Kind3Event;
    const tags = [...ce.tags.filter((t) => (t[1] !== pubkey))];
    addUpdateOrRemoveContact(tags, `remove-contact-${pubkey}`);
  };
};

const processHexOrNip19 = (s:string):{ pubkey: string | null; relays: string[] | null } => {
  let pubkey:string | null = null;
  let relays:string[] | null = null;
  // is hex string?
  const regexhex64 = /^[a-fA-F0-9]{64}$/i;
  if (regexhex64.test(s)) {
    pubkey = s; // this could be an event id?
    return { pubkey, relays };
  }
  // check for nip19
  try {
    const { data, type } = nip19.decode(s) as {
      type: string, data: {
        pubkey?:string, // not present in nevent, nsec or note
        relays?: string[];
      }
    };
    if (typeof data === 'string') {
      if (type === 'npub') pubkey = data;
      else throw new Error('no pubkey');
    } else {
      if (data.pubkey) pubkey = data.pubkey;
      if (data.relays) relays = data.relays;
    }
  } catch { /* empty */ }
  return { pubkey, relays };
};

const nip05cache:{ [nip05Search: string]: string | null } = {};

let nip05Searching = '';
const searchNip05 = async (input: HTMLInputElement):Promise<null | 'searching' | string> => {
  const s = input.value;
  const searchstatus = document.getElementById('searchstatus') as HTMLDivElement;
  const setLoading = () => { searchstatus.innerHTML = '<p aria-busy="true">Searching nip05...<p>'; };
  // check valid NIP05 string
  if (!!s || (s.indexOf('.') === -1 && s.indexOf('@') === -1)) return null;
  // check cache
  if (nip05cache[s]) return nip05cache[s];
  if (nip05cache[s] === null) return null;
  // check if already searching
  if (s === nip05Searching) return 'searching';
  // wait for typing to pause
  const repsonse = await new Promise((finished) => {
    setTimeout(async () => {
      // if value hasn't changed
      if (input.value === s) {
        // set loading
        setLoading();
        // prevent duplicate queries
        nip05Searching = s;
        // make request call
        try {
          const r = await nip05.queryProfile(s);
          if (!!r && r.pubkey) nip05cache[s] = r.pubkey;
          else nip05cache[s] = null;
        } catch {
          // mark as not valid
          nip05cache[s] = null;
        }
        // if search query has changed return 'searching' to end
        if (s === nip05Searching) finished('searching');
        else {
          // reset nip05Searching;
          nip05Searching = '';
          // return value
          finished(nip05cache[s]);
        }
      }
    }, 500);
  }) as null | string;
  return repsonse;
};

const generateResults = (eventorpubkeys:(Event | string)[]) => {
  const mycontacts = eventorpubkeys;
  return `
    <div id="contactdetails"></div>
    <div id="mycontacts">
      <h6>My Contacts</h6>
      ${generateMicroCardList(mycontacts)}
    </div>
    <div id="mycontactscontacts"></div>
    <div id="otherusers"></div>
  `;
};

const refreshResults = (eventorpubkeys?:(Event | string)[]) => {
  (document.getElementById('searchstatus') as HTMLDivElement).innerHTML = '';
  // if called without array load my contacts
  if (!eventorpubkeys) {
    const e3 = fetchCachedMyProfileEvent(3);
    if (e3) refreshResults(e3.tags.map((c) => c[1]));
    return;
  }
  // display results
  (document.getElementById('searchresults') as HTMLDivElement)
    .innerHTML = eventorpubkeys.length === 0
      ? 'no results'
      : generateResults(eventorpubkeys);
  eventorpubkeys.forEach((e) => {
    const microcarda = document.getElementById(`contact-microcard-${getPubkey(e)}`) as HTMLAnchorElement;
    // activate buttons to view details.
    microcarda.onclick = () => {
      loadContactDetails(getPubkey(e));
      return false;
    };
    // replace pubkey with metadata when loaded
    const recheckForKind0 = () => {
      setTimeout(() => {
        try {
          const ne = fetchCachedProfileEvent(getPubkey(e), 0);
          // this will add with kind 0 name or if its  not found petnames from other users
          const name = getContactName(getPubkey(ne || e));
          if (name !== microcarda.innerHTML) microcarda.innerHTML = name;
          if (!ne) recheckForKind0();
        } catch { /* empty - assume element has been removed */ }
      }, 750);
    };
    if (microcarda.classList.contains('nokind0')) recheckForKind0();
  });
  // display details if only result
  if (eventorpubkeys.length === 1) loadContactDetails(getPubkey(eventorpubkeys[0]));
};

const setSearchInputOnChangeEvent = () => {
  const input = document.getElementById('searchinput') as HTMLInputElement;
  const searchstatus = document.getElementById('searchstatus') as HTMLDivElement;
  input.onchange = async () => {
    const s = input.value;
    let pubkey: string | null = null;
    let relays: string[] | null = null;
    // no search
    if (!s || s.trim().length === 0) {
      const e3 = fetchCachedMyProfileEvent(3);
      if (e3) refreshResults(e3.tags.map((c) => c[1]));
      return;
    }
    // if 61+ assume hex, or nip19 (npub, nprofile, naddr) and get pubkey / relays
    if (s.length > 60) {
      ({ pubkey, relays } = processHexOrNip19(s));
      if (!pubkey) {
        searchstatus.innerHTML = 'invalid search input - try npub, nprofile, naddr or hex';
        return;
      }
      searchstatus.innerHTML = 'extracted pubkey. searching for profile...';
    } else {
      // keyword search kind 0s
      const allkind0s = fetchAllCachedProfileEvents(0);
      const words = s.split(' ');
      const matches = allkind0s
        .filter((e) => words.map((w) => e.content.indexOf(w)).some((v) => v > -1));
      refreshResults(matches);
      // search nip05
      if (!!s && (s.indexOf('.') > -1 && s.indexOf('@') > -1)) {
        const r = await searchNip05(input);
        if (r === 'searching') return;
        if (!r) searchstatus.innerHTML = '<p>not a verified nip05 address</p>';
        else {
          searchstatus.innerHTML = '<p>Verified nip05 address. loading profile...</p>';
          pubkey = r;
        }
      }
    }
    // if extracted pubkey - hex, nip19 or nip05
    if (pubkey) {
      const ce = fetchCachedProfileEvent(pubkey, 0);
      // kind 0 not found for user
      if (!ce) {
        // request from relay
        const r = await fetchProfileEvent(pubkey, 0, relays);
        // found not profile
        if (!r) {
          searchstatus.innerHTML = 'extracted pubkey. but couldn\'t find profile.';
          return;
        }
      }
      refreshResults();
      loadContactDetails(pubkey);
    }
  };
};

const loadViewContacts = (RootElementID:string) => {
  (document.getElementById(RootElementID) as HTMLDivElement)
    .innerHTML = `
    <div id="contactsearch">
      <input
        type="search"
        id="searchinput"
        placeholder="nip05, npub, nprofile or keywords for contacts of contacts"
        onkeypress = "this.onchange();"
        onpaste    = "this.onchange();"
        oninput    = "this.onchange();"
      >
      <div id="searchstatus"></div>
    </div>
    <div id="searchresults"></div>
  `;
  setSearchInputOnChangeEvent();
  refreshResults();
};

const LoadContactsPage = () => {
  const o:HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div id="contactspage" class="container">
      <div id="viewcontacts"></div>
      <div id="contactsbackuphistory"></div>
    <div>
  `;
  loadBackupHistory('contactsbackuphistory', 3);
  loadViewContacts('viewcontacts');
};

export default LoadContactsPage;
