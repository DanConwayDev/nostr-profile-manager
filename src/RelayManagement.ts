import { Event, SimplePool } from 'nostr-tools';

const pool = new SimplePool();

export const requestEventsFromRelays = async (
  pubkeys:string[],
  eventProcesser: (event: Event) => void,
  relays:string[],
  kinds: number[],
) => {
  const sub = pool.sub(
    relays,
    [{
      kinds,
      authors: pubkeys,
    }],
  );
  return new Promise<void>((r) => {
    sub.on('event', (event:Event) => {
      if (
        pubkeys.indexOf(event.pubkey) !== -1
        && kinds.indexOf(event.kind) !== -1
      ) {
        eventProcesser(event);
      }
    });
    sub.on('eose', () => {
      r();
    });
  });
};

export const publishEventToRelay = async (event:Event, relays:string[]):Promise<boolean> => {
  const pub = pool.publish(relays, event);
  return new Promise((r) => {
    pub.on('ok', () => r(true));
    pub.on('failed', () => r(false));
  });
};
