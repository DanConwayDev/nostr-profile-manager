# Nostr Profile Manager

Lightweight and efficent typescript micro app for basic nostr profile management. Current USP is  offline backup and restore.

Only javascript dependancy is [nostr-tools](https://github.com/nbd-wtf/nostr-tools). no JS frameworks. no state management tools.

## Features

Supported profile events: kind `0`, `2`, `10002` and `3`.

##### Backup and Restore

- [x] backup your profile events to offline browser storage
- [x] review changes between backups
  - [x] `0`
  - [ ] `10002` and `2`
  - [x] `3`
- [ ] selectively restore previous versions
- [x] download profile backup history as JSON file
- [ ] restore backups from JSON file

##### Refine

- [x] Metadata
  - [x] basic editing
  - [x] nip05 verifiation
  - [x] profile and banner previews
  - [x] preserve, edit and remove custom properties

- [ ] Contacts
  - [ ] Add Contacts based on nip05, npub or hex
  - [ ] Remove Contacts
  - [ ] Edit petname and relay
  - [ ] Suggestions Engine 
    - [ ] Contacts recommendation based off social graph
    - [ ] Suggest updates to contact relay based on Contact's kind `10002` and `2` events

- [ ] Relays
  - [ ] editable table of read / write relays kind `10002` event
  - [ ] auto suggestion of `10002` event based on contact's relays if no event present
  - [ ] evaluation of `10002` based on contact's
  - [ ] decentralisation score to encourage users not to use the same relay

##### Lightweight and Efficent
- [ ] only javascript dependancy is nostr-tools (TODO: remove timeago)
- [x] connects to the minimum number of relays
  - [ ] connect relays specified in `10002` or `2`
  - [ ] if no `10002` or `2` events are found it crawls through a number of popular relays to ensure it has your latest profile events. (currently it just connects to damus)
- [x] minimises the number of open  websockets
- [ ] use blastr relay to send profile events far and wide
