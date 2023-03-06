import { Event, Relay, relayInit } from 'nostr-tools';

let drelay: Relay;
export const setupDefaultRelays = async ():Promise<void> => {
  if (typeof drelay !== 'undefined') return new Promise((r) => { r(); });
  drelay = relayInit('wss://relay.damus.io');
  return drelay.connect();
};
/** setupMyRelays TODO */
export const setupMyRelays = async () => setupDefaultRelays();

export const requestMyProfileFromRelays = async (
  pubkey:string,
  eventProcesser: (event: Event) => void,
) => {
  await setupDefaultRelays();
  const sub = drelay.sub([{
    kinds: [0, 2, 10002, 3],
    authors: [pubkey],
  }]);
  return new Promise<void>((r) => {
    sub.on('event', (event:Event) => {
      if (
        event.pubkey === pubkey
        && (event.kind === 0 || event.kind === 2 || event.kind === 10002 || event.kind === 3)
      ) {
        eventProcesser(event);
      }
    });
    sub.on('eose', () => {
      // sub.unsub();
      r();
    });
  });
};

export const publishEventToRelay = async (event:Event):Promise<boolean> => {
  await setupDefaultRelays();
  const pub = drelay.publish(event);
  return new Promise((r) => {
    pub.on('ok', () => r(true));
    pub.on('failed', () => r(false));
  });
};
