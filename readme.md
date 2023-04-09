# Nostr Profile Manager

Lightweight typescript micro app for basic nostr profile management. Current USP is offline backup and restore.

Only javascript dependency is [nostr-tools](https://github.com/nbd-wtf/nostr-tools). no JS frameworks. no state management tools.

## Live instances

- https://metadata.nostr.com/

## Features

Supported profile events: kind `0`, `10002` and `3`.

##### Backup and Restore

- [x] backup your profile events to offline browser storage
- [x] review changes between backups
  - [x] `0`
  - [x] `10002`
  - [x] `3`
- [x] selectively restore previous versions
- [x] download profile backup history as JSON file
- [ ] restore backups from JSON file

##### Refine

- [x] Metadata
  - [x] basic editing
  - [x] nip05 verifiation
  - [x] profile and banner previews
  - [x] preserve, edit and remove custom properties

- [x] Contacts
  - [x] Add Contacts based on nip05, nip19 (npub, nprofile or naddr) or hex
  - [x] keyword search profiles to find contacts
  - [ ] keyword search profiles to find contacts of contacts
  - [x] Remove Contacts
  - [x] Edit petname and relay
  - [ ] Suggestions Engine
    - [ ] Contacts recommendation based off social graph
    - [ ] Suggest updates to contact relay based on Contact's kind `10002` and `2` events

- [x] Relays
  - [x] editable table of read / write relays kind `10002` event
  - [ ] auto suggestion of `10002` event based on contact's relays if no event present
  - [ ] evaluation of `10002` based on contact's
  - [ ] decentralisation score to encourage users not to use the same relay

- [ ] manage event distribution to relays
  - [ ] Show which and how many relays return an each event (and including historic events)
  - [ ] Show warning if selected write relays don't
  - [ ] suggest republishing events (particularly `10002`) to spread them to more relays if appropriate

- [ ] look far and wide for events
    - cycle through all known relays to find current and previous versions of profile events to enable restoration. reccommended only when accessed through a VPN
##### Lightweight
- [ ] only javascript dependancy is nostr-tools (TODO: remove timeago)
- [x] connects to the minimum number of relays
  - [x] connect relays specified in `10002` or 3 default relays
- [ ] minimises the number of open  websockets
- [x] use blastr relay to send profile events far and wide
- [ ] efficent (TODO: currently the 'Contacts' functionality is very inefficent)
