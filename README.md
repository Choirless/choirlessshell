# choirlessshell

A command-line shell that allows you to deal with Choirless users/choirs/songs/parts as if they are a directory hierarchy.

e.g.

```
>> 
>> cd bob@aol.com
bob@aol.com >> ll
001jqAp211hJM10gdxDs3ifaNF3gR9tk - The Dog Choir
001jtqPK3709Op2285kQ27t8Jc30NULC - The Cat Choir
bob@aol.com >> cd 001jqAp211hJM10gdxDs3ifaNF3gR9tk
bob@aol.com/The Dog Choir >> ll
001kPmUi20QKge4ataKT1bSFMt1OtU9D - Biscuits!
001kDfRz129Ap70i3DH53UhILr35zbfv - Chasing cats
001k8vmX2BnzhP3viVJF0c8wOz3FGV07 - Hey Mr Postman
bob@aol.com/The Dog Choir >> cd 001kPmUi20QKge4ataKT1bSFMt1OtU9D
bob@aol.com/The Dog Choir/Biscuits! >> ll
001kV1Vu0pnnsW1qfEO225XVlc1vcrNC 2020-10-20 Rufus 0ms
001kV2vF3w2gYJ0sVhAO3jz6w305e55U 2020-10-21 Rover 221ms
001kV2z44WrJxW2vXhkB0ILJmi3euMNw 2020-10-21 George 139ms
001kV37W0Ei1gw1z8fjy0XmXtp1bgGsB 2020-10-21 Spot 232ms
bob@aol.com/The Dog Choir/Biscuits! >> offset 001kV2vF3w2gYJ0sVhAO3jz6w305e55U 100
ok: offset set to 100
bob@aol.com/The Dog Choir/Biscuits! >> volume 001kV2vF3w2gYJ0sVhAO3jz6w305e55U 0.75
ok: offset set to 0.75
bob@aol.com/The Dog Choir/Biscuits! >> open
bob@aol.com/The Dog Choir/Biscuits! >> cd ..
bob@aol.com/The Dog Choir >> cd ..
bob@aol.com >> cd ..
>>
>> quit
```

## Prerequisites

This tool assumes that you have a Choirless API running on http://localhost:3000. Here's how to do that:

![schematic](https://github.com/Choirless/choirlessshell/blob/main/choirlessshell.png?raw=true)

Clone the `choirlessapi` repo

```sh
git clone https://github.com/Choirless/choirlessapi.git
cd choirlessapi
npm install
```

Run the Choirless API, passing it the credentials it needs to connect to the database:

```sh
export COUCH_CHOIRLESS_DATABASE="data"
export COUCH_INVITATION_DATABASE="invitations"
export COUCH_KEYS_DATABASE="keys"
export COUCH_RENDER_DATABASE="render_status"
export COUCH_USERS_DATABASE="users"
export COUCH_URL="https://user:password@hostcloudant.com"
export LOCAL_MODE="true"
npm run server
```

## Running choirlessshell

Clone the `choirlessshell` repo:

```sh
git clone https://github.com/Choirless/choirlessshell.git
cd choirlessshell
npm install
```

Run the shell:

```sh
npm run start
```

## Available commands

### `cd <email or id>` - change directory

At the top level you need to know the email address of a Choirless user e.g.

```
>> cd bob@aol.com
bob@aol.com >>
```

The directory hierarchy goes `email` / `choir` / `song` / `songpart`.

Use the `ll` command at any level other than the top level to see the contents. Once `ll` is run, the `cd` command will attempt to 'tab autocomplete' your command as you type.

### `ll` - list directory contents

```
bob@aol.com >> ll
001jqAp211hJM10gdxDs3ifaNF3gR9tk - The Dog Choir
001jtqPK3709Op2285kQ27t8Jc30NULC - The Cat Choir
```

Any ids you see can be used as a parameter for `cd` (not the choir/song names) e.g.

```
bob@aol.com >> cd 001jqAp211hJM10gdxDs3ifaNF3gR9tk
bob@aol.com/The Dog Choir >> ll
001kPmUi20QKge4ataKT1bSFMt1OtU9D - Biscuits!
001kDfRz129Ap70i3DH53UhILr35zbfv - Chasing cats
```
### `cat <id>` - output file contents

```
>> cat bob@aol.com
{
  type: 'user',
  userId: '001jqAoq1iTYBk2HNVCT14IttY0htWeI',
  name: 'Glynn Bird',
  email: 'glynn.bird@gmail.com',
  verified: false,
  createdOn: '2020-06-30T07:36:40.459Z',
  userType: 'admin'
}
>> cd bob@aol.com
bob@aol.com >> ll
001jqAp211hJM10gdxDs3ifaNF3gR9tk - The Dog Choir
001jtqPK3709Op2285kQ27t8Jc30NULC - The Cat Choir
bob@aol.com >> cat 001jqAp211hJM10gdxDs3ifaNF3gR9tk
{
  type: 'choir',
  choirId: '001jqAp211hJM10gdxDs3ifaNF3gR9tk',
  name: 'The Submariners',
  description: '',
  choirType: 'public',
  createdOn: '2020-06-30T07:36:52.863Z',
  createdByUserId: '001jqAoq1iTYBk2HNVCT14IttY0htWeI',
  createdByName: 'N/A'
}
```

## `cd ..` - go up a level

```
>> cd bob@aol.com
bob@aol.com >> cd ..
>>
>>
```

## `url <url>` - jump to Choirless song given a URL

Copy and paste a Choirless URL and pass it to the `url` command e.g.

```
>> url https://www.choirless.com/dashboard/choir/001jtqPK3709Op2285kQ27t8Jc30NULC/song/001kHpAg2p3kJq219ZwO3pU34l2khPgK
-/Glynn's Test Choir/Impossible Weight >>
```

Jumps straight to the song directory, using a fake user '-' at the top level.

## `volume <id> <level>` - adjust the volume level of a song part

```
bob@aol.com/The Dog Choir/Biscuits! >> volume 001kHpUj3mKUC60vg8Sy08qaN21voG9H 0.5
ok: set volume to 0.5
bob@aol.com/The Dog Choir/Biscuits! >>
```

## `offset <id> <level>` - adjust the offset of a song part in milliseconds

```
bob@aol.com/The Dog Choir/Biscuits! >> offset 001kHpUj3mKUC60vg8Sy08qaN21voG9H 250
ok: set offset to 250
bob@aol.com/The Dog Choir/Biscuits! >>
```

## `hide <id>` - hide song part from the final render

```
bob@aol.com/The Dog Choir/Biscuits! >> hide 001kHpUj3mKUC60vg8Sy08qaN21voG9H
ok: part hidden
bob@aol.com/The Dog Choir/Biscuits! >>
```

## `unhide <id>` - unhide song part from the final render

```
bob@aol.com/The Dog Choir/Biscuits! >> unhide 001kHpUj3mKUC60vg8Sy08qaN21voG9H
ok: part unhidden
bob@aol.com/The Dog Choir/Biscuits! >>
```

## `open` - opens the current song/choir in the web interface

```
bob@aol.com/The Dog Choir/Biscuits! >> open
ok: opened song in web browser
bob@aol.com/The Dog Choir/Biscuits! >>
```
