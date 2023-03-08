import { Event } from 'nostr-tools';
import SampleEvents from './SampleEvents';
import {
  storeMyProfileEvent, fetchCachedProfileEventHistory, fetchCachedProfileEvent,
  fetchMyProfileEvents,
} from './fetchEvents';
import * as LocalStorage from './LocalStorage';
import * as FetchEvents from './fetchEvents';
import * as RelayManagement from './RelayManagement';

let storage:{ [x: string | number | symbol]: unknown; } = {};

jest.spyOn(LocalStorage, 'localStorageSetItem').mockImplementation((key, value) => {
  const k = key as string;
  storage[k] = value;
});
jest.spyOn(LocalStorage, 'localStorageGetItem').mockImplementation((key): string | null => {
  const k = key as string;
  if (typeof storage[k] === 'undefined') return null;
  return storage[k] as string;
});
const updateLastUpdatedSpy = jest.spyOn(FetchEvents, 'updateLastUpdateDate');

describe('', () => {
  beforeEach(() => {
    storage = {};
    storage.pubkey = SampleEvents.kind0.pubkey;
    updateLastUpdatedSpy.mockReset();
  });
  afterEach(() => {
    storage = {};
  });
  describe('storeMyProfileEvent', () => {
    test('throw if no pubkey stored', () => {
      delete storage.pubkey;
      expect(LocalStorage.localStorageGetItem('pubkey')).toBeNull();
      expect(() => { storeMyProfileEvent({ ...SampleEvents.kind0 }); })
        .toThrow('storeMyProfileEvent no pubkey in localStorage');
    });
    describe.each([0, 2, 10002, 3])('events of kind %s', (k) => {
      let kind: 0 | 2 | 10002 | 3;
      beforeEach(() => { kind = k as 0 | 2 | 10002 | 3; });
      describe('stores event, returns true and calls updateLastUpdateDate() when', () => {
        test('first event submitted', () => {
          const r = storeMyProfileEvent({ ...SampleEvents[`kind${kind}`] });
          expect(fetchCachedProfileEventHistory(kind)).toEqual([{ ...SampleEvents[`kind${kind}`] }]);
          expect(r).toBeTruthy();
          expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(1);
        });
        test('subsequent (second and third) events submitted', () => {
          const a = [
            { ...SampleEvents[`kind${kind}`] },
            { ...SampleEvents[`kind${kind}`], id: '2' },
            { ...SampleEvents[`kind${kind}`], id: '3' },
          ];
          storeMyProfileEvent(a[0]);
          const r2 = storeMyProfileEvent(a[1]);
          const r3 = storeMyProfileEvent(a[2]);
          const r = fetchCachedProfileEventHistory(kind);
          expect(r).toContainEqual(a[0]);
          expect(r).toContainEqual(a[1]);
          expect(r).toContainEqual(a[2]);
          expect(r2).toBeTruthy();
          expect(r3).toBeTruthy();
          expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(3);
        });
      });
      describe('returns false, does not store and doesnt call updateLastUpdateDate() when', () => {
        test('event from a different pubkey submitted', () => {
          const r = storeMyProfileEvent({ ...SampleEvents[`kind${kind}`], pubkey: '1' });
          expect(r).toBeFalsy();
          expect(fetchCachedProfileEventHistory(kind)).toBeNull();
          expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(0);
        });
        test('duplicate events (events with the same id)', () => {
          storeMyProfileEvent({ ...SampleEvents[`kind${kind}`] });
          const r = storeMyProfileEvent({ ...SampleEvents[`kind${kind}`], content: 'different' });
          expect(r).toBeFalsy();
          expect(fetchCachedProfileEventHistory(kind)).toEqual([{ ...SampleEvents[`kind${kind}`] }]);
          expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(1);
        });
      });
    });
    test('events of an unsupported kind (eg 1) returns false, are not stored and updateLastUpdateDate() not called', () => {
      expect(storeMyProfileEvent({ ...SampleEvents.kind0, kind: 1 })).toBeFalsy();
      expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(0);
    });
  });
  describe('fetchCachedProfileEventHistory', () => {
    describe('returns array of events', () => {
      test('single event', () => {
        storeMyProfileEvent({ ...SampleEvents.kind0 });
        expect(fetchCachedProfileEventHistory(0)).toEqual([{ ...SampleEvents.kind0 }]);
      });
      test('multiple events', () => {
        const a = [
          { ...SampleEvents.kind0 },
          { ...SampleEvents.kind0, id: '2' },
          { ...SampleEvents.kind0, id: '3' },
        ];
        storeMyProfileEvent(a[0]);
        storeMyProfileEvent(a[1]);
        storeMyProfileEvent(a[2]);
        const r = fetchCachedProfileEventHistory(0);
        expect(r).toContainEqual(a[0]);
        expect(r).toContainEqual(a[1]);
        expect(r).toContainEqual(a[2]);
      });
      test('events only of specified kind', () => {
        const a = [
          { ...SampleEvents.kind0 },
          { ...SampleEvents.kind0, id: '2' },
          { ...SampleEvents.kind3, id: '3' },
        ];
        storeMyProfileEvent(a[0]);
        storeMyProfileEvent(a[1]);
        storeMyProfileEvent(a[2]);
        const r = fetchCachedProfileEventHistory(0);
        expect(r).toContainEqual(a[0]);
        expect(r).toContainEqual(a[1]);
        expect(fetchCachedProfileEventHistory(3)).toContainEqual(a[2]);
      });
      test('ordered by created_at decending', () => {
        const a = [
          { ...SampleEvents.kind0 },
          { ...SampleEvents.kind0, id: '2', created_at: SampleEvents.kind0.created_at + 100 },
          { ...SampleEvents.kind0, id: '3', created_at: SampleEvents.kind0.created_at + 50 },
        ];
        storeMyProfileEvent({ ...a[0] });
        storeMyProfileEvent({ ...a[1] });
        storeMyProfileEvent({ ...a[2] });
        const r = fetchCachedProfileEventHistory(0) as Event[];
        expect(r[0]).toEqual(a[1]);
        expect(r[1]).toEqual(a[2]);
        expect(r[2]).toEqual(a[0]);
      });
    });
    test('returns null if no events of kind present', () => {
      storeMyProfileEvent({ ...SampleEvents.kind0 });
      expect(fetchCachedProfileEventHistory(3)).toBeNull();
    });
  });
  describe('fetchCachedProfileEvent', () => {
    test('returns event of specified kind with largest created_at value', () => {
      const a = [
        { ...SampleEvents.kind0 },
        { ...SampleEvents.kind0, id: '2', created_at: SampleEvents.kind0.created_at + 100 },
        { ...SampleEvents.kind0, id: '3', created_at: SampleEvents.kind0.created_at + 50 },
      ];
      storeMyProfileEvent({ ...a[0] });
      storeMyProfileEvent({ ...a[1] });
      storeMyProfileEvent({ ...a[2] });
      const r = fetchCachedProfileEvent(0) as Event;
      expect(r).toEqual(a[1]);
    });
    test('returns null if no events of kind present', () => {
      storeMyProfileEvent({ ...SampleEvents.kind0 });
      expect(fetchCachedProfileEventHistory(3)).toBeNull();
    });
  });
  describe('fetchMyProfileEvents', () => {
    const fetchCachedProfileEventSpy = jest.spyOn(FetchEvents, 'fetchCachedProfileEvent');
    const mockEventProcessor = jest.fn();
    const mockrequestMyProfileFromRelays = jest.spyOn(RelayManagement, 'requestMyProfileFromRelays');
    const mockupdateLastFetchDate = jest.spyOn(FetchEvents, 'updateLastFetchDate');
    const mocklastFetchDate = jest.spyOn(FetchEvents, 'lastFetchDate');
    const mockisUptodate = jest.spyOn(FetchEvents, 'isUptodate');
    beforeEach(async () => {
      fetchCachedProfileEventSpy.mockReset();
      mockEventProcessor.mockReset();
      mockrequestMyProfileFromRelays.mockReset();
      mockupdateLastFetchDate.mockReset();
      mocklastFetchDate.mockReset();
      mockisUptodate.mockReset();
    });
    describe('when isUptodate returns true', () => {
      beforeEach(async () => {
        mockisUptodate.mockReturnValue(true);
        fetchCachedProfileEventSpy.mockImplementation((kind) => {
          if (kind === 0) return { ...SampleEvents.kind0 };
          if (kind === 10002) return null;
          if (kind === 2) return null;
          if (kind === 3) return { ...SampleEvents.kind3 };
          return null;
        });
        await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
      });
      test('requestMyProfileFromRelays never called', () => {
        expect(mockrequestMyProfileFromRelays).toBeCalledTimes(0);
      });
      test('updateLastFetchDate never called', () => {
        expect(mockupdateLastFetchDate).toBeCalledTimes(0);
      });
      test('eventProcessor called with latest event from cache for each profile kind with event(s)', async () => {
        expect(fetchCachedProfileEventSpy).toHaveBeenCalledWith(0);
        expect(fetchCachedProfileEventSpy).toHaveBeenCalledWith(3);
        expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind0 });
        expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind3 });
        expect(mockEventProcessor).toHaveBeenCalledTimes(2);
      });
      test('eventProcessor not called on profile event kind that isn\'t present', async () => {
        expect(fetchCachedProfileEventSpy).toHaveBeenCalledWith(10002);
        expect(fetchCachedProfileEventSpy).toHaveBeenCalledWith(2);
        expect(mockEventProcessor).toBeCalledTimes(2);
      });
    });
    describe('when isUptodate returns false', () => {
      describe('and when cached 10002 event is present', () => {
        const doBefore = async () => {
          mockisUptodate.mockReturnValue(false);
          mockrequestMyProfileFromRelays.mockReset()
            .mockImplementation(async (_pubkey, eventProcessor) => {
              eventProcessor({ ...SampleEvents.kind0 });
              eventProcessor({ ...SampleEvents.kind3 });
            });
          await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
        };
        test('1 write relays, function called with custom relay and 2 default relays + blaster', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
            ],
          });
          await doBefore();
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://relay.damus.io',
              'wss://nostr-pub.wellorder.net',
              'wss://nostr.mutinywallet.com',
            ],
          );
        });
        test('2 write relays function called with custom relays and 1 default relays + blaster', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
              ['r', 'wss://expensive-relay.example2.com', 'write'],
            ],
          });
          await doBefore();
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://expensive-relay.example2.com',
              'wss://relay.damus.io',
              'wss://nostr.mutinywallet.com',
            ],
          );
        });
        test('2 write relays including first defauly relay. function called with custom relays and 1 different default relays + blaster', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://relay.damus.io'],
              ['r', 'wss://expensive-relay.example2.com', 'write'],
            ],
          });
          await doBefore();
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://relay.damus.io',
              'wss://expensive-relay.example2.com',
              'wss://nostr-pub.wellorder.net',
              'wss://nostr.mutinywallet.com',
            ],
          );
        });
        test('with 4 write relays function called with all custom relays + blaster', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
              ['r', 'wss://brando-relay.com'],
              ['r', 'wss://expensive-relay.example2.com', 'write'],
              ['r', 'wss://alicerelay.example3.com'],
            ],
          });
          await doBefore();
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://brando-relay.com',
              'wss://expensive-relay.example2.com',
              'wss://alicerelay.example3.com',
              'wss://nostr.mutinywallet.com',
            ],
          );
        });
        test('custom read relays ignored', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
              ['r', 'wss://brando-relay.com'],
              ['r', 'wss://expensive-relay.example2.com', 'write'],
              ['r', 'wss://nostr-relay.example.com', 'read'],
            ],
          });
          await doBefore();
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://brando-relay.com',
              'wss://expensive-relay.example2.com',
              'wss://nostr.mutinywallet.com',
            ],
          );
        });
      });
      describe('and when no cached 10002 events are present', () => {
        const mockstoreMyProfileEvent = jest.spyOn(FetchEvents, 'storeMyProfileEvent');
        beforeEach(async () => {
          mockisUptodate.mockReturnValue(false);
          mockrequestMyProfileFromRelays.mockReset()
            .mockImplementation(async (_pubkey, eventProcessor) => {
              eventProcessor({ ...SampleEvents.kind0 });
              eventProcessor({ ...SampleEvents.kind3 });
            });
          await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
        });
        test('updateLastFetchDate called once', () => {
          expect(mockupdateLastFetchDate).toBeCalledTimes(1);
        });
        test('fetchCachedProfileEvent only to be called once to getRelays', () => {
          expect(fetchCachedProfileEventSpy).toBeCalledTimes(1);
        });
        test('requestMyProfileFromRelays called', () => {
          expect(mockrequestMyProfileFromRelays).toBeCalledTimes(1);
        });
        test('mockrequestMyProfileFromRelays called with correct pubkey', () => {
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            SampleEvents.kind0.pubkey,
            expect.anything(),
            expect.anything(),
          );
        });
        test('mockrequestMyProfileFromRelays called with correct default relays', () => {
          expect(mockrequestMyProfileFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://relay.damus.io',
              'wss://nostr-pub.wellorder.net',
              'wss://nostr-relay.wlvs.space',
              'wss://nostr.mutinywallet.com',
            ],
          );
        });
        test('eventProcessor called with events passed through by requestMyProfileFromRelays\'s event processor', async () => {
          expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind0 });
          expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind3 });
        });
        test('storeMyProfileEvent called with events passed through by requestMyProfileFromRelays\'s event processor', async () => {
          expect(mockstoreMyProfileEvent).toBeCalledWith({ ...SampleEvents.kind0 });
          expect(mockstoreMyProfileEvent).toBeCalledWith({ ...SampleEvents.kind3 });
        });
        test('eventProcessor not called when profile event kind isn\'t found by requestMyProfileFromRelays', async () => {
          expect(mockEventProcessor).toBeCalledTimes(2);
        });
      });
    });
  });
});
