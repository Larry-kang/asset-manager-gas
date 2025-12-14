# ? �з� Git �}�o�u�@�y�{ (Standard Git Workflow)

���F�T�O�N�X�~��P�۰ʤƳ��p��í�w�ʡA���M�ױĥ� **GitHub Flow** �f�t **Conventional Commits**�C
�п��`�H�U�W�d�i��}�o�C

## 1. ���䵦�� (Branching Strategy)

�ڭ̱ĥ�²�ƪ� GitHub Flow�G

*   **`main` (�D����)**:
    *   ? **�T��� Commit**�C
    *   �o�O�u�Ͳ����� (Production)�v���N�X�C
    *   **�ߤ@** �|Ĳ�o�۰ʳ��p������C
*   **`feat/*` (�\�����)**:
    *   �}�o�s�\��ɨϥΡC
    *   ���e������ **���|** Ĳ�o�u�W���p (CI �Ȱ������)�C
    *   �R�W�d��: `feat/add-login`, `feat/new-dashboard`�C
*   **`fix/*` (�״_����)**:
    *   �״_ Bug �ɨϥΡC
    *   �R�W�d��: `fix/header-mobile-view`, `fix/calc-error`�C
*   **`refactor/*` (���c����)**:
    *   �N�X���c�B���v�T�\��ɨϥΡC
    *   �R�W�d��: `refactor/vue-migration`�C

## 2. �}�o�`�� (The Cycle)

### Step 1: �}�o�s�\��
�q `main` ���X�s����G
```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```
*(Agent Tip: �i�ϥ� `/new_feature` ���O�۰ʰ���)*

### Step 2: �����ܧ� (Commits)
�Шϥ� **Conventional Commits** �榡�A�o���U�󥼨Ӧ۰ʥͦ� Changelog�C

**�榡:** `<type>(<scope>): <subject>`

*   **Types:**
    *   `feat`: �s�W�\�� (Feature)
    *   `fix`: �״_ Bug
    *   `docs`: �ק��� (Documentation)
    *   `style`: �榡�ק� (���v�T�N�X�B��A�p�ťաB����)
    *   `refactor`: ���c (�J���O�s�W�\��]���O�� Bug)
    *   `test`: �W�[�έק����
    *   `chore`: �غc�L�{�λ��U�u�㪺�ܰ� (�p package.json, workflows)

**�d��:**
*   `feat: add dark mode toggle`
*   `fix(logic): correct usd asset calculation`
*   `docs: update deployment guide`

*(Agent Tip: �i�ϥ� `/git_commit` ���O�A�ڷ|���z�ˬd�榡)*

### Step 3: ���e�P�X�� (Push & Merge)
1.  **���e����:**
    ```bash
    git push -u origin feat/your-feature-name
    ```
2.  **�إ� Pull Request (PR):**
    *   �b GitHub �����W�o�_ PR (from `feat/...` to `main`)�C
    *   ���� CI/CD ���ճq�L (GitHub Actions �|�۰ʶ]����)�C
3.  **�X�� (Merge):**
    *   �T�{�L�~��A�N PR �X�֤J `main`�C
    *   **���ʧ@�|�۰�Ĳ�o���p�y�{�A��s�u�W�� GAS �M�סC**

## 3. ���״_ (Hotfix)
�p�G�b�u�W�o�{��� Bug�G
1.  `git checkout main`
2.  `git checkout -b fix/critical-bug`
3.  �״_�ô��աC
4.  Push -> PR -> Merge to `main` (Ĳ�o�۰ʳ��p)�C

---

## 5. Agent ��@��ĳ (Agent Protocol)

���T�O�h�N�z (Multi-Agent) ���ҤU����@���Z�A�Ҧ� Agent �������u�G

1.  **�Y�T���� Commit �� Main**:
    *   �Ҧ��ק� **����** �b `feat/...` �� `fix/...` ����i��C
    *   �ϥ� `/new_feature` �� `/new_fix` �T�O�q�̷s�� `main` �P�B�C
2.  **��l�ƴ��� (Atomic Commits)**:
    *   �C�� Commit ���u�ѨM�@�Ӱ��D�C
    *   �Y����u Conventional Commits�C
3.  **�۰ʤ�����**:
    *   Commit �e **����** �q�L `npm test` (�ϥ� `/git_commit` �y�{)�C
4.  **Pull Before Push**:
    *   �b���e�e�A�T�{�P���ݨS���Ĭ�C

---

## 6. �`�����O�t�d��

| �ʧ@ | ���O | ���� |
| :--- | :--- | :--- |
| **�}�l�s�\��** | `/new_feature` | �إ� `feat/...` ���� (�۰ʦP�B main) |
| **�}�l�״_** | `/new_fix` | �إ� `fix/...` ���� (�۰ʦP�B main) |
| **�����ˬd** | `/git_commit` | ������ըô��� (�t Branch �ˬd) |
| **���p** | `/deploy` | ���e�� GitHub Ĳ�o�۰ʳ��p |

