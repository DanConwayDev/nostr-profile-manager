import { Event, UnsignedEvent } from 'nostr-tools';
import { localStorageGetItem, localStorageSetItem } from './LocalStorage';
import { publishEventToRelay, requestEventsFromRelays } from './RelayManagement';

export const lastFetchDate = ():number | null => {
  const d = localStorageGetItem('my-profile-last-fetch-date');
  if (d === null) return null;
  return Number(d);
};
let fetchedthissession: boolean = false;
export const updateLastFetchDate = ():void => {
  fetchedthissession = true;
  localStorageSetItem('my-profile-last-fetch-date', Date.now().toString());
};

export const lastUpdateDate = ():number | null => {
  const d = localStorageGetItem('my-profile-last-update-date');
  if (d === null) return null;
  return Number(d);
};

export const updateLastUpdateDate = ():void => {
  localStorageSetItem('my-profile-last-update-date', Date.now().toString());
};

export const isUptodate = ():boolean => fetchedthissession;
// const f = lastFetchDate();
// // uptodate - fetched within 10 seconds
// return !(f === null || f < (Date.now() - 10000));

export const hadLatest = ():boolean => {
  if (!isUptodate()) return false;
  const f = lastFetchDate();
  const u = lastUpdateDate();
  // hadlatest - last update was no more than 10 seconds before fetch complete
  return !(u === null || f === null || u > (f - 10000));
};

/**
 * storeMyProfileEvent
 * @returns true if stored and false duplicate, wrong kind or wrong pubkey
 */
export const storeMyProfileEvent = (event:Event): boolean => {
  // thrown on no pubkey in localStorage
  if (localStorageGetItem('pubkey') === null) {
    throw new Error('storeMyProfileEvent no pubkey in localStorage');
  }
  // return false if...
  if (
    // event is of an unsupported kind
    !(event.kind === 0 || event.kind === 2 || event.kind === 10002 || event.kind === 3)
    // or fron a different pubkey
    || event.pubkey !== localStorageGetItem('pubkey')
  ) return false;

  const arrayname = `my-profile-event-${event.kind}`;
  const ls = localStorageGetItem(arrayname);
  // if localStorage my-profile-event-[kind] doesnt exist, create it with new event in.
  if (ls === null) localStorageSetItem(arrayname, JSON.stringify([event]));
  else {
    const a = JSON.parse(ls) as Event[];
    // if event is already stored return false
    if (a.some((e) => e.id === event.id)) return false;
    // add event, store array
    a.push(event);
    localStorageSetItem(arrayname, JSON.stringify(a));
  }
  // update last updated date
  updateLastUpdateDate();
  // return true as event saved
  return true;
};

export const fetchCachedMyProfileEventHistory = (
  kind: 0 | 2 | 10002 | 3,
): null | [Event, ...Event[]] => {
  // get data from local storage
  const arrayname = `my-profile-event-${kind}`;
  const ls = localStorageGetItem(arrayname);
  // if no events are cached return null
  if (ls === null) return null;

  const a = JSON.parse(ls) as [Event, ...Event[]];
  // return as Events array
  return a.sort((x, y) => y.created_at - x.created_at);
};

export const fetchCachedMyProfileEvent = (kind: 0 | 2 | 10002 | 3): null | Event => {
  const a = fetchCachedMyProfileEventHistory(kind);
  if (a === null) return null;
  // return Event in array with most recent created_at date
  return a[0];
};

const getRelays = () => {
  const e = fetchCachedMyProfileEvent(10002);
  const myrelays = !e ? [] : e.tags.map((r) => r[1]);
  // return minimum of 3 relays, filling in with default relays (removing duplicates)
  return myrelays.length > 3 ? myrelays : [...new Set([
    ...myrelays,
    'wss://relay.damus.io',
    'wss://nostr-pub.wellorder.net',
    'wss://nostr-relay.wlvs.space',
  ])].slice(0, 3);
};

/** get my latest profile events either from cache (if isUptodate) or from relays */
export const fetchMyProfileEvents = async (
  pubkey:string,
  profileEventProcesser: (event: Event) => void,
): Promise<void> => {
  // get events from relays, store them and run profileEventProcesser
  if (!isUptodate()) {
    const starterrelays = getRelays();
    await requestEventsFromRelays([pubkey], (event: Event) => {
      storeMyProfileEvent(event);
      profileEventProcesser(event);
    }, starterrelays, [0, 2, 10002, 3]);
    // if new 10002 event found with more write relays
    if (
      fetchCachedMyProfileEvent(10002)?.tags
        .some((t) => starterrelays.indexOf(t[1]) === -1 && (!t[2] || t[2] === 'write'))
    ) {
      // fetch events again to ensure we got all my profile events
      await fetchMyProfileEvents(pubkey, profileEventProcesser);
    }
    // update last-fetch-from-relays date
    updateLastFetchDate();
  } else {
    // for kinds 0, 2, 10002 and 3
    [0, 2, 10002, 3].forEach((k) => {
      const e = fetchCachedMyProfileEvent(k as 0 | 2 | 10002 | 3);
      if (e !== null) profileEventProcesser(e);
    });
  }
};

const UserProfileEvents:{
  [pubkey: string]: {
    [kind: number]: Event;
  };
} = {};

const storeProfileEvent = (event:Event) => {
  if (!UserProfileEvents[event.pubkey]) UserProfileEvents[event.pubkey] = {};
  if (
    // no event of kind for pubkey
    !UserProfileEvents[event.pubkey][event.kind]
    // newer event of kind recieved
    || UserProfileEvents[event.pubkey][event.kind].created_at < event.created_at
  ) {
    // store it
    UserProfileEvents[event.pubkey][event.kind] = event;
  }
};

export const fetchMyContactsProfileEvents = async () => {
  const c = fetchCachedMyProfileEvent(3);
  if (!c || c.tags.length === 0) return;
  const required = c.tags.filter((p) => !UserProfileEvents[p[1]]);
  if (required.length > 0) {
    await requestEventsFromRelays(
      required.map((t) => t[1]),
      storeProfileEvent,
      getRelays(),
      [0, 10002, 3],
    );
    // TODO: check 10002 events and ensure we have read for one of their write relays
  }
};

export const fetchCachedProfileEvent = (pubkey:string, kind:0 | 10002 | 3):Event | null => {
  if (localStorageGetItem('pubkey') === pubkey) return fetchCachedMyProfileEvent(kind);
  if (!UserProfileEvents[pubkey]) return null;
  if (!UserProfileEvents[pubkey][kind]) return null;
  return UserProfileEvents[pubkey][kind];
};

export const fetchAllCachedProfileEvents = (
  kind: 0 | 10002 | 3,
):Event[] => Object.keys(UserProfileEvents)
  .filter((p) => !!UserProfileEvents[p][kind])
  .map((p) => UserProfileEvents[p][kind]);

export const fetchProfileEvents = async (
  pubkeys:[string, ...string[]],
  kind:0 | 10002 | 3,
  relays?: string[] | null,
):Promise<[(Event | null), ...(Event | null)[]]> => {
  const notcached = pubkeys.filter((p) => !fetchCachedProfileEvent(p, kind));
  if (notcached.length > 0) {
    await requestEventsFromRelays(
      notcached,
      storeProfileEvent,
      relays || getRelays(),
      [0, 10002, 3],
    );
  }
  return pubkeys.map(
    (p) => fetchCachedProfileEvent(p, kind),
  ) as [(Event | null), ...(Event | null)[]];
};

export const fetchProfileEvent = async (
  pubkey:string,
  kind:0 | 10002 | 3,
  relays?: string[] | null,
):Promise<Event | null> => {
  const r = await fetchProfileEvents([pubkey], kind, relays);
  return r[0];
};

export const getContactMostPopularPetname = (pubkey: string):string | null => {
  // considered implementing frank.david.erin model in nip-02 but I think the UX is to confusing
  // get count of petnames for users by other contacts
  const petnamecounts: { [petname: string]: number } = Object.keys(UserProfileEvents)
    // returns petname or null
    .map((pk) => {
      if (!UserProfileEvents[pk][3]) return null;
      const petnametag = UserProfileEvents[pk][3].tags.find((t) => t[1] === pubkey && t[3]);
      if (petnametag) return petnametag[3];
      return null;
    })
    // returns petname counts
    .reduce((pv, c) => {
      if (!c) return pv;
      if (!pv[c]) return { ...pv, [c]: 1 };
      return { ...pv, [c]: pv[c] + 1 };
    }, {} as { [petname: string]: number });
  if (petnamecounts.length === 0) return null;
  // returns most frequent petname for user amoung contacts (appended with ' (?)')
  return Object.keys(petnamecounts).sort((a, b) => petnamecounts[b] - petnamecounts[a])[0];
};

export const getMyPetnameForUser = (pubkey: string): string | null => {
  const e = fetchCachedMyProfileEvent(3);
  if (e) {
    const mypetname = e.tags.find((t) => t[1] === pubkey && t[3]);
    if (mypetname) return mypetname[3];
  }
  return null;
};

export const getMyRelayForUser = (pubkey: string): string | null => {
  const e = fetchCachedMyProfileEvent(3);
  if (e) {
    const relay = e.tags.find((t) => t[1] === pubkey && t[2] && t[2] !== '');
    if (relay) return relay[2];
  }
  return null;
};

export const isUserMyContact = (pubkey: string): boolean | null => {
  const e = fetchCachedMyProfileEvent(3);
  if (e) {
    if (e.tags.some((t) => t[1] === pubkey)) return true;
    return false;
  }
  return null;
};

export const getContactName = (pubkey: string):string => {
  // my own name
  if (localStorageGetItem('pubkey') === pubkey) {
    const m = fetchCachedMyProfileEvent(0);
    if (m) {
      const { name } = JSON.parse(m.content);
      if (name) return name;
    }
  } else {
    // my petname for contact
    const mypetname = getMyPetnameForUser(pubkey);
    if (mypetname) return mypetname;
    // TODO: what about displaying a common petname in brackets if vastly different from their name?
    // their kind 0 name
    if (UserProfileEvents[pubkey]) {
      if (UserProfileEvents[pubkey][0]) {
        const { name } = JSON.parse(UserProfileEvents[pubkey][0].content);
        if (name) return name;
      }
    }
  }
  // most popular petname for user amoung contacts
  const popularpetname = getContactMostPopularPetname(pubkey);
  if (popularpetname) return `${popularpetname} (?)`;
  // return shortened pubkey
  /**
   * TODO: add npubEncode
   * npubEncode is imported from nostr-tools and causes the jest test runner to fail with:
   * SyntaxError: Cannot use import statement outside a module
   */
  return `${pubkey.substring(0, 10)}...`;
};

export const publishEvent = async (event:Event):Promise<boolean> => {
  const r = await publishEventToRelay(
    event,
    [
      ...getRelays(),
      'wss://nostr.mutinywallet.com', // blastr
    ],
  );
  if (r) storeMyProfileEvent(event);
  return r;
};
/**
 * @param e event for signing and publishing
 * @param ElementId id of button or anchor element that was used for submitting the event
 * @param innerHTMLAfterSuccess what the button should read after event successfully submitted
 * @returns true if event was published, false if it was not
 */
export const submitUnsignedEvent = async (
  e:UnsignedEvent,
  ElementId:string,
  innerHTMLAfterSuccess:string = 'Update',
):Promise<boolean> => {
  const b = document.getElementById(ElementId) as HTMLButtonElement | HTMLAnchorElement;
  // set loading status
  b.setAttribute('disabled', '');
  b.setAttribute('aria-busy', 'true');
  b.innerHTML = 'Signing...';
  // sign event
  if (!window.nostr) return new Promise((r) => { r(false); });
  const ne = await window.nostr.signEvent(e);
  // publish
  b.innerHTML = 'Sending...';
  const r = await publishEvent(ne);
  b.removeAttribute('aria-busy');
  b.innerHTML = 'Recieved by Relays!';
  setTimeout(() => {
    b.innerHTML = innerHTMLAfterSuccess;
    b.removeAttribute('disabled');
  }, 1000);
  return r;
};
