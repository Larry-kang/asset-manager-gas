# ? �}�o�̫��n (Developer Guide)

�����N�޾ɱz�إ� CI/CD �y�{�BGit �u�@�y�P���ҳ]�m�A���z�බ�Q�ѻP�}�o�C

---

## 1. ���ҳ]�m (Setup)

### A. ���a�}�o����
���M�רϥ� `clasp` �i�� Google Apps Script �������P���p�A�èϥ� `Node.js` �i�楻�a���աC

1.  **�w�� Node.js**: ��ĳ�ϥ� v18 LTS �H�W�����C
2.  **�w�˭ʿ�M��**:
    ```bash
    npm install
    ```
    �o�|�w�� `jest`, `playwright`, `fs` �����ջP�}�o�u��C
3.  **�n�J Clasp**:
    ```bash
    npx clasp login
    ```
    ���H�s�������ܵn�J�A�o�|���� `~/.clasprc.json`�C

### B. ���ջP����
*   **�椸���� (Unit Test)**:
    ```bash
    npm test
    ```
    ���� `Logic.gs` �P��L�¨���޿�C
*   **�ݹ�ݴ��� (E2E)**:
    ```bash
    npm run test:e2e
    ```
    �Ұ� `tests/server.js` (���� GAS Server) �èϥ� Playwright ���� UI �۰ʤƾާ@�C
    *   **�����Ҧ�**: �ϥ� `npm run test:e2e -- --debug` �i�[���s�����ާ@�L�{�C

---

## 2. ���զP�B��ĳ (Test Synchronization Protocol)

���T�O�M�׫~��A**�Ҧ��޿�� UI �ܧ󳣥������H���է�s**�C�o�O�@���K�ߡC

1.  **�޿��ܧ� (Logic Change)**:
    *   �Y�ק�F `Logic.gs` (�Ҧp�p�⤽���վ�)�A�����P�B��s `tests/logic.test.js` �P `tests/aggregation.test.js`�C
    *   **�Y��T��**�u���޿褣����աA�o�|�ɭP���Ӫ��^�k���~ (Regression)�C
2.  **E2E ��� (UI Alignment)**:
    *   �� UI ���c���� (�Ҧp���s ID �ܧ�B�s�W�\��) �ɡA�аȥ��ߧY�׭q `tests/e2e` ���� Selector �P�y�{�C
    *   E2E ���ե����ϬM�ӥ\��u�u��ϥΪ̪��ާ@���|�v�C
3.  **�����w�q (Definition of Done)**:
    *   PR �e�X�e�A�����T�{ `npm test` �P `npm run test:e2e` ���Ƴq�L�C
    *   �s�\��ݥ]�t�����������л\�C

---

## 3. ���䵦�� (Git Branching)

�ڭ̱ĥ�²�ƪ��� **GitHub Flow** �f�t **Conventional Commits**�C

### A. �D����O�@
*   **`main`**: �H�ɥi���p��í�w���� (Production)�C**�T��� Commit**�A�����z�L PR �X�֡C

### B. Commit �W�d
�T���榡�G`type(scope): description`

*   **`feat`**: �s�\�� (Feature)
*   **`fix`**: �״_ Bug
*   **`docs`**: ���ק�
*   **`style`**: �榡�վ� (���v�T�޿�)
*   **`refactor`**: ���c (�L�s�\��� Bug �״_)
*   **`test`**: �W�[�έק����
*   **`chore`**: �ظm�L�{�λ��U�u���ܧ� (�p npm, clasp)

�d�ҡG
`feat(loan): �s�W�H�U�պ���F`
`fix(logic): �ץ��Ŧr��ɭP���p����~`

---

## 4. �۰ʤƳ��p (CI/CD)

�M�ץ]�t GitHub Actions (`.github/workflows/deploy.yml`)�C
�� `main` ���䦳��s�ɡA�|�۰�Ĳ�o `clasp push` ���p�� GAS�C

**�]�w�ݨD**:
�ݦ� GitHub Repository �� **Settings > Secrets** �]�w�H�U�ܼơG
*   `CLASP_SECRET`: �z�� `~/.clasprc.json` ���e (JSON String)�C

---

## 5. �M�׼��}�P�M�z��ĳ (Project Hygiene Protocol)

�����M�װ��b�O�u�{�v��¾�d�C�C���}�o�g������ (�Τ������ȫe)�A�а���H�U�ʧ@�G

**�u�����b�� (Clean Exit) ��h�v**�G����ק�B�ոթέ��c��A�����٭�{���G

1.  **�R���Ȧs�ɮ�**: �����Ҧ� `*.log`, `crash_report.txt`, `temp_*` ���B��L�{�����ͪ��U���ɮסC
2.  **�M�z�w���ѥN�X**: �Y�沾�� Dead Code�B�����Ϊ� `console.log` (���D���n) �μo���ܼƻP Import�C
3.  **���@�P��**: �T�{�ڥؿ������� (`README.md`, `DEVELOPMENT.md`) �P��ڵ{���欰�O���@�P�C
4.  **�ؿ����**: �T�O�ڥؿ��ȫO�d���n���]�w�ɡA�U���жi `archive/` �Ϊ����R���C

---
**�����@��**: Ops Agent
**�̫��s**: 2025-12-16
