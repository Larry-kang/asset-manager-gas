# Google Apps Script �۰ʤƳ��p�y�{ (CI/CD)

����󷧭z�F�ϥ� GitHub Actions ���p Google Apps Script (GAS) �M�ת��зǤƬy�{�C
**�֤߭�h�G** �û����n��ʳ��p�CGit �O�ߤ@���u�z�ӷ� (Source of Truth)�C

## 1. �e�m�ǳ� (�@���ʳ]�w)

### A. ���a���� (Local Environment)
1.  **�w�� Clasp:** ����w�ˡG`npm i -g @google/clasp`�C
2.  **�n�J:** ���� `clasp login`�A�o�N���� `~/.clasprc.json` �����ɮסC
3.  **�M�׳]�w:** ���� `clasp clone <scriptId>` �� `clasp create`�C
4.  **�����ɮ�:** �إ� `.claspignore` �H�ư��}�o�ɮ� (�p node_modules, tests, .git)�C

### B. GitHub Repository Secrets �]�w
���F�� GitHub Action ��N���z���泡�p�A�z�ݭn�]�w Repository Secrets�G

1.  **���o�z������:**
    *   �}�ҥ��a�� `~/.clasprc.json` (���z���ϥΪ̮ڥؿ��A�n�J�Უ��)�C
    *   �ƻs�䧹�㪺 JSON ���e�C
2.  **�]�w Secret:**
    *   �i�J GitHub Repo > **Settings** > **Secrets and variables** > **Actions**�C
    *   �I�� **New Repository Secret**�C
    *   Name: `CLASP_SECRET`
    *   Value: �K�W���ƻs�� `~/.clasprc.json` ���e�C
3.  **�]�w Config Secret (��Φ�����):**
    *   �ƻs�M�פ� `.clasp.json` �����e (�]�t scriptId)�C
    *   �إ߷s�� Repository Secret�G`CLASP_CONFIG`�C
    *   *���G���M Workflow �䴩�q Repo Ū�� `.clasp.json`�A���z�L Secrets �޲z�����w���C*

## 2. Workflow �]�w�� (`.github/workflows/deploy.yml`)

�Цb�z�� Repo ���إߦ��ɮסC���зǰt�m�B�z�H�U�ƶ��G
*   Node.js ���ҳ]�w
*   �w�� Clasp
*   Token �榡�зǤ� (�ѨM Clasp 2.4+ ���� Token �榡�V�ê����D)
*   ���泡�p (`clasp push -f`)

```yaml
name: Deploy to GAS (���p�� GAS)

on:
  push:
    branches: [ "main", "master", "feat/*", "fix/*", "refactor/*" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js (�]�w Node ����)
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Clasp (�w�� Clasp)
        run: npm install -g @google/clasp

      - name: Authenticate Clasp (���� Clasp)
        run: |
          # �g�J Project ID �t�m
          echo "$CLASP_CONFIG" > .clasp.json
          
          # �g�J���� (�]�t������ JSON �ѪR�P�榡�ץ��޿�)
          node -e "
            const fs = require('fs');
            const os = require('os');
            const path = require('path');
            const secret = process.env.CLASP_SECRET;
            if(!secret) process.exit(1);
            
            // �޿�G�зǤ� token �榡 (���������|�]�b 'tokens.default' ��)
            let json = JSON.parse(secret);
            let token = json.token || (json.tokens && json.tokens.default ? (json.tokens.default.token || json.tokens.default) : null);
            
            if(token) {
               // ���ئ� Clasp ���n���ª�²�Ʈ榡
               const rc = { token: token };
               fs.writeFileSync(path.join(os.homedir(), '.clasprc.json'), JSON.stringify(rc));
            } else {
               console.error('�L�Ī� Token ���c (Invalid Token Structure)');
               process.exit(1);
            }
          "
        env:
          CLASP_CONFIG: ${{ secrets.CLASP_CONFIG }}
          CLASP_SECRET: ${{ secrets.CLASP_SECRET }}

      - name: Deploy (���泡�p)
        run: clasp push --force
```

## 3. ��`�}�o�y�{ (Daily Usage)

**�ߤ@�ǫh�G�u�ϥ� Git ���O�C**

1.  **�}�o (Develop):** �ϥ� VS Code �b���a�s��{���X�C
2.  **���� (Commit):**
    *   `git add .`
    *   `git commit -m "feat: �s�W�\��y�z"`
3.  **���p (Deploy):**
    *   `git push`

GitHub Action �N�|�۰�Ĳ�o�A�æb�� 30-60 �����N��s���p�� Google Apps Script�C

## 4. �G�ٱư� (Troubleshooting)

*   **���~: "Precondition Failed" / "Token Expired":**
    *   ��]�G`CLASP_SECRET` ���� Refresh Token �i��w�L�� (�q�`�C 7 �ѻݧ�s�A�ΤӤ[���ϥ�)�C
    *   **�Ѫk:** �b���a�A������ `clasp login`�A���o�s�� `~/.clasprc.json` ���e�A�ç�s GitHub Secret�C
*   **���~: "Files to push were not found":**
    *   ��]�G�ɮץi��Q�����F�C
    *   **�Ѫk:** �ˬd `.claspignore`�A�T�O `.gs` �M `.html` �ɮ� **�S��** �Q�C�J�����M��C
