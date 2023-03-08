import { Event, SimplePool } from 'nostr-tools';

const pool = new SimplePool();
let currentrelays = [
  'wss://relay.damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr-relay.wlvs.space',
];

export const requestMyProfileFromRelays = async (
  pubkey:string,
  eventProcesser: (event: Event) => void,
  relays?:string[],
) => {
  if (relays) currentrelays = relays;
  const sub = pool.sub(
    currentrelays,
    [{
      kinds: [0, 2, 10002, 3],
      authors: [pubkey],
    }],
  );
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
      r();
    });
  });
};

export const publishEventToRelay = async (event:Event):Promise<boolean> => {
  const pub = pool.publish(currentrelays, event);
  return new Promise((r) => {
    pub.on('ok', () => r(true));
    pub.on('failed', () => r(false));
  });
};
