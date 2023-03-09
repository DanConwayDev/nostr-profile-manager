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

export const fetchCachedProfileEventHistory = (
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

export const fetchCachedProfileEvent = (kind: 0 | 2 | 10002 | 3): null | Event => {
  const a = fetchCachedProfileEventHistory(kind);
  if (a === null) return null;
  // return Event in array with most recent created_at date
  return a[0];
};

const getRelays = () => {
  const e = fetchCachedProfileEvent(10002);
  const mywriterelays = !e ? [] : e.tags.filter((r) => !r[2] || r[2] === 'write').map((r) => r[1]);
  // return minimum of 3 relays, filling in with default relays (removing duplicates)
  return mywriterelays.length > 3 ? mywriterelays : [...new Set([
    ...mywriterelays,
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
      fetchCachedProfileEvent(10002)?.tags
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
      const e = fetchCachedProfileEvent(k as 0 | 2 | 10002 | 3);
      if (e !== null) profileEventProcesser(e);
    });
  }
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
