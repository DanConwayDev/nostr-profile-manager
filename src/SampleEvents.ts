import { Event } from 'nostr-tools';
import { Kind3Event } from './LoadHistory';

const SampleEvents: {
  kind0: Event;
  kind2: Event;
  kind10002: Event;
  kind3: Event;
  [x: string | number | symbol]: Event;
} = {
  kind0: {
    content: '{"name":"ZEUS","picture":"https://pbs.twimg.com/profile_images/1610442178546831364/UModnpXI_400x400.jpg","about":"A mobile bitcoin experience fit for the gods\\n\\nEst. 563345.\\n\\nhttps://zeusln.app","lud06":"lnurl1dp68gurn8ghj7urp0yh85et4wdkxutnpwpcz7tnhv4kxctttdehhwm30d3h82unvwqhhg6tswvdmd5dx","lud16":"tips@pay.zeusln.app","nip05":"zeus@zeusln.app","banner":"https://void.cat/d/PU4ErBhWjeUBmYsLg2sTLQ"}',
    created_at: 1674925722,
    id: '6d737844ff86a389d771d27732d09ec0bb537cef702b3c76bad67fabfd14e600',
    kind: 0,
    pubkey: '34d2f5274f1958fcd2cb2463dabeaddf8a21f84ace4241da888023bf05cc8095',
    sig: 'f9127cc3640af80b57d691f5e2001b9119ed3cd25a0aaa786c6fafb6a14199391b554f46056840c43427c6c8f9a1011bca62af1c148c7fb6a79f847e5952f3be',
    tags: [],
  },
  kind2: {
    content: 'wss://relay.damus.io',
    created_at: 1674925722,
    id: '12413421',
    kind: 2,
    pubkey: '34d2f5274f1958fcd2cb2463dabeaddf8a21f84ace4241da888023bf05cc8095',
    sig: 'f9127cc3640af80b57d691f5e2001b9119ed3cd25a0aaa786c6fafb6a14199391b554f46056840c43427c6c8f9a1011bca62af1c148c7fb6a79f847e5952f3be',
    tags: [],
  },
  kind10002: {
    kind: 10002,
    content: '',
    tags: [
      ['r', 'wss://alicerelay.example.com'],
      ['r', 'wss://brando-relay.com'],
      ['r', 'wss://expensive-relay.example2.com', 'write'],
      ['r', 'wss://nostr-relay.example.com', 'read'],
    ],
    created_at: 1674925722,
    id: '7687687',
    pubkey: '34d2f5274f1958fcd2cb2463dabeaddf8a21f84ace4241da888023bf05cc8095',
    sig: '678676587',
  },
  kind3: {
    kind: 3,
    tags: [
      ['p', '91cf9..4e5ca', 'wss://alicerelay.com/', 'alice'],
      ['p', '14aeb..8dad4', 'wss://bobrelay.com/nostr', 'bob'],
      ['p', '612ae..e610f', 'ws://carolrelay.com/ws', 'carol'],
    ],
    content: '',
    created_at: 1674925722,
    id: '7687687',
    pubkey: '34d2f5274f1958fcd2cb2463dabeaddf8a21f84ace4241da888023bf05cc8095',
    sig: '678676587',
  } as Kind3Event,
};

export default SampleEvents;
