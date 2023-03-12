import { Event } from 'nostr-tools';
import SampleEvents from './SampleEvents';
import {
  storeMyProfileEvent, fetchCachedMyProfileEventHistory, fetchCachedMyProfileEvent,
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
          expect(fetchCachedMyProfileEventHistory(kind)).toEqual([{ ...SampleEvents[`kind${kind}`] }]);
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
          const r = fetchCachedMyProfileEventHistory(kind);
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
          expect(fetchCachedMyProfileEventHistory(kind)).toBeNull();
          expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(0);
        });
        test('duplicate events (events with the same id)', () => {
          storeMyProfileEvent({ ...SampleEvents[`kind${kind}`] });
          const r = storeMyProfileEvent({ ...SampleEvents[`kind${kind}`], content: 'different' });
          expect(r).toBeFalsy();
          expect(fetchCachedMyProfileEventHistory(kind)).toEqual([{ ...SampleEvents[`kind${kind}`] }]);
          expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(1);
        });
      });
    });
    test('events of an unsupported kind (eg 1) returns false, are not stored and updateLastUpdateDate() not called', () => {
      expect(storeMyProfileEvent({ ...SampleEvents.kind0, kind: 1 })).toBeFalsy();
      expect(updateLastUpdatedSpy).toHaveBeenCalledTimes(0);
    });
  });
  describe('fetchCachedMyProfileEventHistory', () => {
    describe('returns array of events', () => {
      test('single event', () => {
        storeMyProfileEvent({ ...SampleEvents.kind0 });
        expect(fetchCachedMyProfileEventHistory(0)).toEqual([{ ...SampleEvents.kind0 }]);
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
        const r = fetchCachedMyProfileEventHistory(0);
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
        const r = fetchCachedMyProfileEventHistory(0);
        expect(r).toContainEqual(a[0]);
        expect(r).toContainEqual(a[1]);
        expect(fetchCachedMyProfileEventHistory(3)).toContainEqual(a[2]);
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
        const r = fetchCachedMyProfileEventHistory(0) as Event[];
        expect(r[0]).toEqual(a[1]);
        expect(r[1]).toEqual(a[2]);
        expect(r[2]).toEqual(a[0]);
      });
    });
    test('returns null if no events of kind present', () => {
      storeMyProfileEvent({ ...SampleEvents.kind0 });
      expect(fetchCachedMyProfileEventHistory(3)).toBeNull();
    });
  });
  describe('fetchCachedMyProfileEvent', () => {
    test('returns event of specified kind with largest created_at value', () => {
      const a = [
        { ...SampleEvents.kind0 },
        { ...SampleEvents.kind0, id: '2', created_at: SampleEvents.kind0.created_at + 100 },
        { ...SampleEvents.kind0, id: '3', created_at: SampleEvents.kind0.created_at + 50 },
      ];
      storeMyProfileEvent({ ...a[0] });
      storeMyProfileEvent({ ...a[1] });
      storeMyProfileEvent({ ...a[2] });
      const r = fetchCachedMyProfileEvent(0) as Event;
      expect(r).toEqual(a[1]);
    });
    test('returns null if no events of kind present', () => {
      storeMyProfileEvent({ ...SampleEvents.kind0 });
      expect(fetchCachedMyProfileEventHistory(3)).toBeNull();
    });
  });
  describe('fetchMyProfileEvents', () => {
    const fetchCachedMyProfileEventSpy = jest.spyOn(FetchEvents, 'fetchCachedMyProfileEvent');
    const mockEventProcessor = jest.fn();
    const mockrequestEventsFromRelays = jest.spyOn(RelayManagement, 'requestEventsFromRelays');
    const mockupdateLastFetchDate = jest.spyOn(FetchEvents, 'updateLastFetchDate');
    const mocklastFetchDate = jest.spyOn(FetchEvents, 'lastFetchDate');
    const mockisUptodate = jest.spyOn(FetchEvents, 'isUptodate');
    beforeEach(async () => {
      fetchCachedMyProfileEventSpy.mockReset();
      mockEventProcessor.mockReset();
      mockrequestEventsFromRelays.mockReset();
      mockupdateLastFetchDate.mockReset();
      mocklastFetchDate.mockReset();
      mockisUptodate.mockReset();
    });
    describe('when isUptodate returns true', () => {
      beforeEach(async () => {
        mockisUptodate.mockReturnValue(true);
        fetchCachedMyProfileEventSpy.mockImplementation((kind) => {
          if (kind === 0) return { ...SampleEvents.kind0 };
          if (kind === 10002) return null;
          if (kind === 2) return null;
          if (kind === 3) return { ...SampleEvents.kind3 };
          return null;
        });
        await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
      });
      test('requestEventsFromRelays never called', () => {
        expect(mockrequestEventsFromRelays).toBeCalledTimes(0);
      });
      test('updateLastFetchDate never called', () => {
        expect(mockupdateLastFetchDate).toBeCalledTimes(0);
      });
      test('eventProcessor called with latest event from cache for each profile kind with event(s)', async () => {
        expect(fetchCachedMyProfileEventSpy).toHaveBeenCalledWith(0);
        expect(fetchCachedMyProfileEventSpy).toHaveBeenCalledWith(3);
        expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind0 });
        expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind3 });
        expect(mockEventProcessor).toHaveBeenCalledTimes(2);
      });
      test('eventProcessor not called on profile event kind that isn\'t present', async () => {
        expect(fetchCachedMyProfileEventSpy).toHaveBeenCalledWith(10002);
        expect(fetchCachedMyProfileEventSpy).toHaveBeenCalledWith(2);
        expect(mockEventProcessor).toBeCalledTimes(2);
      });
    });
    describe('when isUptodate returns false', () => {
      describe('and when cached 10002 event is present', () => {
        const doBefore = async () => {
          mockisUptodate.mockReturnValue(false);
          mockrequestEventsFromRelays.mockReset()
            .mockImplementation(async (_pubkey, eventProcessor) => {
              eventProcessor({ ...SampleEvents.kind0 });
              eventProcessor({ ...SampleEvents.kind3 });
            });
          await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
        };
        test('1 relay, function called with custom relay and 2 default relays', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
            ],
          });
          await doBefore();
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://relay.damus.io',
              'wss://nostr-pub.wellorder.net',
            ],
            expect.anything(),
          );
        });
        test('2 relays function called with custom relays and 1 default relays', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
              ['r', 'wss://expensive-relay.example2.com', 'write'],
            ],
          });
          await doBefore();
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://expensive-relay.example2.com',
              'wss://relay.damus.io',
            ],
            expect.anything(),
          );
        });
        test('2 relays including first default relay. function called with custom relays and 1 different default relays', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://relay.damus.io'],
              ['r', 'wss://expensive-relay.example2.com', 'write'],
            ],
          });
          await doBefore();
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://relay.damus.io',
              'wss://expensive-relay.example2.com',
              'wss://nostr-pub.wellorder.net',
            ],
            expect.anything(),
          );
        });
        test('with 4 relays function called with all custom relays', async () => {
          storeMyProfileEvent({
            ...SampleEvents.kind10002,
            tags: [
              ['r', 'wss://alicerelay.example.com'],
              ['r', 'wss://brando-relay.com'],
              ['r', 'wss://expensive-relay.example2.com', 'read'],
              ['r', 'wss://alicerelay.example3.com'],
            ],
          });
          await doBefore();
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://brando-relay.com',
              'wss://expensive-relay.example2.com',
              'wss://alicerelay.example3.com',
            ],
            expect.anything(),
          );
        });
      });
      describe('and when no cached 10002 events are present and none are return', () => {
        const mockstoreMyProfileEvent = jest.spyOn(FetchEvents, 'storeMyProfileEvent');
        beforeEach(async () => {
          mockisUptodate.mockReturnValue(false);
          mockrequestEventsFromRelays.mockReset()
            .mockImplementation(async (_pubkey, eventProcessor) => {
              eventProcessor({ ...SampleEvents.kind0 });
              eventProcessor({ ...SampleEvents.kind3 });
            });
          await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
        });
        test('updateLastFetchDate called once', () => {
          expect(mockupdateLastFetchDate).toBeCalledTimes(1);
        });
        test('requestEventsFromRelays called once', () => {
          expect(mockrequestEventsFromRelays).toBeCalledTimes(1);
        });
        test('mockrequestEventsFromRelays called with correct pubkey', () => {
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            [SampleEvents.kind0.pubkey],
            expect.anything(),
            expect.anything(),
            expect.anything(),
          );
        });
        test('mockrequestEventsFromRelays called with correct default relays', () => {
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            [
              'wss://relay.damus.io',
              'wss://nostr-pub.wellorder.net',
              'wss://nostr-relay.wlvs.space',
            ],
            expect.anything(),
          );
        });
        test('mockrequestEventsFromRelays called with correct kind 0, 2 10002, 3', () => {
          expect(mockrequestEventsFromRelays).toBeCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            [0, 2, 10002, 3],
          );
        });
        test('eventProcessor called with events passed through by requestEventsFromRelays\'s event processor', async () => {
          expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind0 });
          expect(mockEventProcessor).toBeCalledWith({ ...SampleEvents.kind3 });
        });
        test('storeMyProfileEvent called with events passed through by requestEventsFromRelays\'s event processor', async () => {
          expect(mockstoreMyProfileEvent).toBeCalledWith({ ...SampleEvents.kind0 });
          expect(mockstoreMyProfileEvent).toBeCalledWith({ ...SampleEvents.kind3 });
        });
        test('eventProcessor not called when profile event kind isn\'t found by requestEventsFromRelays', async () => {
          expect(mockEventProcessor).toBeCalledTimes(2);
        });
      });
      describe('and when new 10002 event is recieved with non-default write relays', () => {
        beforeEach(async () => {
          mockisUptodate.mockReturnValue(false);
          mockrequestEventsFromRelays.mockReset()
            .mockImplementation(async (_pubkey, eventProcessor) => {
              eventProcessor({ ...SampleEvents.kind0 });
              eventProcessor({
                ...SampleEvents.kind10002,
                tags: [
                  ['r', 'wss://alicerelay.example.com'],
                ],
              });
            });
          await fetchMyProfileEvents(SampleEvents.kind0.pubkey, mockEventProcessor);
        });
        test('requestEventsFromRelays called twice', () => {
          expect(mockrequestEventsFromRelays).toBeCalledTimes(2);
        });
        test('mockrequestEventsFromRelays called with correct non-default relays the second time', () => {
          expect(mockrequestEventsFromRelays).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            expect.anything(),
            [
              'wss://alicerelay.example.com',
              'wss://relay.damus.io',
              'wss://nostr-pub.wellorder.net',
            ],
            expect.anything(),
          );
        });
      });
    });
  });
  describe('publishEvent', () => {
    const mockstoreMyProfileEvent = jest.spyOn(FetchEvents, 'storeMyProfileEvent');
    const mockPublishEventToRelay = jest.spyOn(RelayManagement, 'publishEventToRelay');
    beforeEach(async () => {
      mockstoreMyProfileEvent.mockReset();
      mockPublishEventToRelay.mockReset()
        .mockImplementation(() => new Promise((r) => { r(true); }));
    });
    test('publishEventToRelay is called with getRelays output + blastr', () => {
      FetchEvents.publishEvent(SampleEvents.kind0);
      expect(mockPublishEventToRelay).toBeCalledWith(
        SampleEvents.kind0,
        [
          'wss://relay.damus.io',
          'wss://nostr-pub.wellorder.net',
          'wss://nostr-relay.wlvs.space',
          'wss://nostr.mutinywallet.com', // blastr
        ],
      );
    });
  });
});
