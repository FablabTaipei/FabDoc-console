# FabDoc-console
Make a server for picking images as commits, and command remote Raspberry Pi to transfer images into db via socketIo.

### Remote Server
- Host: 52.77.119.251   (Location: Singapore)

![](https://i.imgur.com/7hSfU4v.jpg)

### Firebase functions

#### installation
```
npm install -g firebase-tools
```

#### Sign in using your Google account
```
firebase login
```

#### Init functions
```
firebase init functions
```

#### Update & Deploy codes to Google
```
firebase deploy --only functions
```

### Progress report
- 2017/08/13 Terminate demo server on Brazil.
- 2017/07/29 We deploy current version to the remote servers.
- 2017/03/03 We can login and see the homepage only, because this was copied from Kino's another project.
