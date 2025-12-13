---
description: Auto-repair local environment (Mock API, Node Modules)
---

1. Fix Mock API (Stateful Logic)
// turbo
node update_mock.js

2. Re-install Dependencies (if needed)
// turbo
npm install

3. Reset Local Server Cache
   - Update `local_server.js` version string to force cache bust.

> [!NOTE]
> Use this if the Local UI is behaving strangely or not saving data.
