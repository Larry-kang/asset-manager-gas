# Project Cleanup & Restoration Plan

- [ ] **1. Security Cleanup (�M����w)**
    - [ ] Audit `Code.gs` for any remaining auth stubs.
    - [ ] Scan `js.html` for dead auth variables/functions.
    - [ ] Ensure `Actions.gs` has no auth blockers.

- [ ] **2. Fix Anomalies (�״_���`)**
    - [ ] **Fix Unit Tests**: Resolve `LoanPosition is not a constructor` in `aggregation.test.js` & `loan_lifecycle.test.js`.
    - [ ] **Fix Setup**: Ensure `tests/setup.js` correctly maps `Logic.gs` functional exports.
    - [ ] **Verify**: Run `npm test` until green.

- [ ] **3. Documentation Restructure (������)**
    - [ ] Update `README.md` (Remove Login instructions, update Arch).
    - [ ] Refine `docs/FEATURES.md` (Reflect current functional logic).
    - [ ] Mark deprecated docs in `docs/archive/`.

- [ ] **4. Final Delivery**
    - [ ] Run full E2E suite.
    - [ ] Deploy (BOM fixed).
