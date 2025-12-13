---
description: Run comprehensive QA (Unit Tests + Mobile Browser E2E)
---

1. Run Unit Tests
// turbo
npm test

2. Run Mobile Browser QA (Device Matrix)
   - Use `browser_subagent` to verify Layout & Functions on:
     - **Small Mobile** (iPhone SE/Mini): 360x780 or 375x667
     - **Standard Mobile** (iPhone 13/14, Pixel): 390x844 to 412x915
     - **Large Mobile** (Pro Max): 430x932
   - *Key Check*: Elements shouldn't overlap on Small screens. Bottom Nav used.

3. Run Desktop/Tablet Browser QA
   - Use `browser_subagent` to verify on:
     - **Tablet** (iPad Mini/Air): 768x1024 and 820x1180
       - *Check*: Does it show Sidebar or Bottom Nav? (Should be consistent with CSS media query @768px)
     - **Laptop**: 1280x800
     - **Desktop (FHD)**: 1920x1080
     - **Large Monitor**: 2560x1440 (Optional check for layout centering)
   - *Key Check*: Sidebar Visible for Laptop+. Tablet behavior checked against design intent.

> [!TIP]
> If Unit Tests fail, stop and fix.
> If Browser QA fails, do not proceed to ship.
