# ROADMAP.md

## �겣�ޮa (Asset Manager) - ���ӵo�i�Ź�

�����O���F�M�ת����Ӷ}�o��V�B�\��c�Q�P�޳N�u�ƥؼСC

---

# ? �\��W���Ҭy�{ (Feature Specification Process)

�b�}�o����s�\�ध�e�A�Ш̧ǫ�ҥH�U���Ӻ��סA�H�T�O�W�槹��B�i��G

1.  **�֤ߥؼ� (Objective)**
    *   �o�ӥ\��ѨM�F������D�H
    *   �w�����įq�O����H�]�Ҧp�G�`�ٮɶ��B��ֿ��~�B���ѨM���̾ڡ^

2.  **�ϥΪ̬y�{ (User Flow)**
    *   �ϥΪ̦p��i�J���\��H
    *   �ާ@�B�J����H�]Step-by-step�^
    *   ��J�O����H��X�O����H

3.  **�����]�p (UI/UX)**
    *   �ݭn���� UI ����H�]���s�B��J�ءB�Ϫ��B�C���^
    *   �����p��t�m�H�]Desktop vs Mobile�^
    *   ���ʦ^�X�O����H�]Loading ���A�B���~�T���B���\���ܡ^

4.  **��ƻP�޿� (Data & Logic)**
    *   ��ƨӷ�����H�]�{���w�s�B�~�� API�B�ϥΪ̿�J�^
    *   �ݭn�x�s���Ǹ�ơH�s�h���̡H�]Properties Service, Spreadsheet, LocalStorage�^
    *   �֤ߺt��k�έp���޿謰��H

5.  **�޳N���� (Constraints)**
    *   GAS ������]����ɶ��B�t�B�BĲ�o����^�H
    *   �e�ݭ���]�s�����ۮe�ʡBRWD�^�H
    *   �O�_���~���̿୷�I�H

6.  **�禬�з� (Acceptance Criteria)**
    *   �\�৹�����w�q�O����H
    *   ��������ɱ��p (Edge Cases) �ݭn���աH

7.  **�į�P���c (Performance & Refactoring)**
    *   �{���X�O�_�iŪ�B�ҲդơH�]�ܼƩR�W�B�禡����^
    *   �O�_����b���į�~�V�H�]�Ҧp�G�j�餺�� API �I�s�B�j�q DOM �ާ@�^
    *   �O�_�ݭn���c�J���{���X�H�䴩�s�\��H

---

# ? ���ӵo�i�Ź� (Roadmap)

## ? �֤ߥ\���X�R (Core Features)

### 1. ���z�A���ŭp��� (Smart Rebalancing Calculator) ? **(Priority: High)**
*   **1. �֤ߥؼ� (Objective)**
    *   �N�t�αq�u�Q�ʰO�b�v�ɯŬ��u�D�ʨM���v�u��C
    *   ��U�ϥΪ̺����겣�t�m���ߡA��ֱ����ާ@�C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   �i�J�u�A���šv���� -> �Ŀ�ѻP�A���Ū��겣 -> �]�w�ؼ��v�� (Target %) -> �t�έp�ⰾ�t -> ��ܫ�ĳ�R����B�C
*   **3. �����]�p (UI/UX)**
    *   **�d��������**�G�C�Ӹ겣�@�i�d���A�]�t�Ʊ� (Slider) �P��J�ءC
    *   **��ı�iĵ**�G�����׶W�L�H�ȮɡA�d������ܦ� (��/��)�C
    *   **�`�M�ˮ�**�G������ܥثe�v���`�M�A�Y�D 100% ���ĵ�i�C
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�ӷ�**�G`getInventoryMap` ���o�{�����ȡC
    *   **�޿�**�G`�ؼЪ��B = �`�겣 * �ؼ�%`�A`��ĳ����B = �ؼЪ��B - �{������`�C
    *   **�x�s**�G�ϥ� `localStorage` �x�s�ϥΪ̪��ؼаt�m�]�w (`rebalance_cfg`)�C
*   **5. �޳N���� (Constraints)**
    *   ��������Ŷ������A�Ʊ�ݩ���Ĳ���C
    *   �ݳB�z�B�I�ƹB��~�t�C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �v���`�M������ 100% �~���x�s�C
    *   ��ĳ�R����B�p�⥿�T�]���ƶR�J�B�t�ƽ�X�^�C
*   **7. �į�P���c (Performance & Refactoring)**
    *   �e�ݧY�ɭp�� (Client-side calculation)�A���ݦ^�ǫ�ݡA�T�O�y�Z�סC

### 2. �t���P�Q�ʦ��J�����O (Dividend Dashboard)
*   **1. �֤ߥؼ� (Objective)**
    *   ��ı�Ʋ{���y�����A���ɦs�ѰʤO�C
    *   ���R�U�겣���u��ާQ�v (Yield on Cost)�C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   �ݪO���� -> �����u�t�����ϡv -> �d�ݤ��/�~�׹Ϫ��P���ӡC
*   **3. �����]�p (UI/UX)**
    *   **�W����**�G��ܨC��/�C�u�t�����B���|�C
    *   **KPI �d��**�G��ܡu�w���~�ƪѮ��v�B�u�����ާQ�v�v�C
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�ӷ�**�G�z���������� `Type = 'Dividend'` ����ơC
    *   **�޿�**�G`Yield on Cost = �ֿn�Ѯ� / �`��J����`�C
*   **5. �޳N���� (Constraints)**
    *   �ݽT�{ Chart.js �O�_�䴩�һݪ��Ϫ������C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �Ѯ��έp�ݻP��ӹ�b��@�P�C
    *   ���P���O (USD/TWD) �ݥ��T������`�C
*   **7. �į�P���c (Performance & Refactoring)**
    *   �Y��������L�h�A�ݦb��ݹw�����E�X�B�� (Aggregation) �A�Ǧ^�e�ݡC

### 3. �[��M�� (Watchlist)
*   **1. �֤ߥؼ� (Objective)**
    *   �l�ܷP������|���������Ъ��C
    *   �ֳt�����b�Ъ��P�{�����ܪ����{�C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   �I���u�s�W�[��v -> ��J�N�� -> �C����ܧY�ɳ����P���^�T�C
*   **3. �����]�p (UI/UX)**
    *   ²��C���A�]�t�G�N���B�{���B���^�T�B�Z���I�^�T�C
    *   �䴩��ԱƧǡC
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�ӷ�**�G�@�β{������������ (Binance/Yahoo/Cnyes)�C
    *   **�x�s**�G`UserProperties` �� `localStorage` �x�s�[��M��N���C
*   **5. �޳N���� (Constraints)**
    *   �~�� API �I�s�W�v���� (Rate Limiting)�C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �s�W�L�ĥN���ɻݦ����~���ܡC
    *   ������s����ݦb�i�����d�� (<10s)�C
*   **7. �į�P���c (Performance & Refactoring)**
    *   �ݹ�@�妸�����d�� (Batch Fetching) �H��� API �I�s���ơC

### 4. �妸�פJ�\�� (CSV Import)
*   **1. �֤ߥؼ� (Objective)**
    *   �j�T���C��l���ɻP�w�����@���ɶ������C
    *   ��֤�ʿ�J���~�C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   ������� -> �I���u�פJ�v -> �K�W CSV ��r -> �w���ѪR���G -> �T�{�פJ�C
*   **3. �����]�p (UI/UX)**
    *   �j�d���r��J�� (Textarea)�C
    *   �ѪR���G�w������ (�]�t���A�G���\/����/����)�C
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�ѪR��**�G�w��`����� (e.g., Firstrade, ����) ���g Regex �ѪR�W�h�C
    *   **����**�G�̾� (���+�N��+���B) �P�_�O�_�����ƥ���C
*   **5. �޳N���� (Constraints)**
    *   ���P��Ӯ榡�t���j�A�ݫO�d�X�R�u�ʡC
*   **6. �禬�з� (Acceptance Criteria)**
    *   �ॿ�T�ѪR�з� CSV �榡�C
    *   �J��榡���~�ɤ��|���{���Y��A�ô��ܿ��~��ơC
*   **7. �į�P���c (Performance & Refactoring)**
    *   �g�J Spreadsheet �ɥ����ϥ� `setValues` �i��妸�g�J�A�T��j�餺 `appendRow`�C

### 5. �{���y/�w��޲z (Simple Expense Tracking)
*   **1. �֤ߥؼ� (Objective)**
    *   �Ϥ��u������J�v�P�u�ꥻ�Q�o�v�C
    *   �p���T�������S�v (MWRR/TWRR)�C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   �s�W��� -> ���O��ܡu�J��(Deposit)�v�Ρu�X��(Withdraw)�v�C
*   **3. �����]�p (UI/UX)**
    *   �b������檺�u�ʧ@�v�U�Կ��W�[�ﶵ�C
    *   �ݪO�W�[�u�b��J�����v���СC
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�޿�**�G`�b�겣 = ���� + �l�q` -> `�l�q = �b�겣 - ����`�C
*   **5. �޳N���� (Constraints)**
    *   �ݳB�z���O������D (�J�� USD vs TWD)�C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �J����A�`�겣�W�[���l�q���ܡC
*   **7. �į�P���c (Performance & Refactoring)**
    *   �վ� `getInventoryMap` �޿�H�]�t�{���y�p��C

---

## ?? �޳N�u�Ƥ�V (Technical Improvements)

### 1. �į��u�ơG�ַӾ��� (Snapshotting)
*   **1. �֤ߥؼ� (Objective)**
    *   �ѨM��������H�ɶ��W���ɭP�p���ܺC�����D�C
    *   �N���J�ɶ������b 3 �����C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   (�I������) �C�� 1 ���۰�Ĳ�o Trigger ����ַӡC
    *   �ϥΪ̵L�P�A���}�ҳt���ܧ֡C
*   **3. �����]�p (UI/UX)**
    *   �L�e�ݤ����A�Ȼݦb��x Log ��ܰ��浲�G�C
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�x�s**�G�إ����� Sheet `_Snapshot`�A���G`Date, Ticker, Qty, Cost`�C
    *   **�޿�**�G`Current Inventory = Snapshot + Transactions(after snapshot date)`�C
*   **5. �޳N���� (Constraints)**
    *   GAS Trigger ����ɶ����� (6 min)�C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �ַӫ�p�⵲�G�ݻP���q�p�⧹���@�P�C
*   **7. �į�P���c (Performance & Refactoring)**
    *   �j�T��� `getInventoryMap` �ݹM�����C�ơC

### 2. ���v�ײv��T��
*   **1. �֤ߥؼ� (Objective)**
    *   ���ѧ��T���x������l�q�p��C
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   ��J����ɡA�۰ʱa�J����ײv�]�Y�� API�^�A�Τ��\��ʭץ��C
*   **3. �����]�p (UI/UX)**
    *   �������W�[�u�ײv�v��� (�w�]���áA�i���i�})�C
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�ӷ�**�G�O���C��������U�� `USD/TWD`�C
    *   **�޿�**�G`Realized PnL (TWD) = (Sell Price * Sell FX) - (Buy Price * Buy FX)`�C
*   **5. �޳N���� (Constraints)**
    *   ���v�ײv API ���o�����λݥI�O�C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �w��{�l�q���A�����e�ײv�i�ʼv�T�C
*   **7. �į�P���c (Performance & Refactoring)**
    *   �ݹ��¸�ƶi��@���ʲM�~�μаO�w�]�ײv�C

### 3. ���~�B�z��� (Fallback Mechanism)
*   **1. �֤ߥؼ� (Objective)**
    *   ���ɨt��í�w�ʡA�קK��@��Ʒ����I�ɭP�������ȡC
*   **2. �ϥΪ̬y�{ (User Flow)**
    *   ���D�ӷ����ѮɡA�t�Φ۰ʤ����ƴ��A�ϥΪ̶Ȭݨ�u��ƨӷ��G�ƴ��v�����ܡC
*   **3. �����]�p (UI/UX)**
    *   ��������ܤp�ϥܼХܨӷ����A (��O/���O)�C
*   **4. ��ƻP�޿� (Data & Logic)**
    *   **�޿�**�G`Try Source A -> Catch Error -> Try Source B -> Catch Error -> Return Last Known Price`�C
*   **5. �޳N���� (Constraints)**
    *   �|�W�[ API �ШD������ɶ��C
*   **6. �禬�з� (Acceptance Criteria)**
    *   �����_���� API ���~�ɡA�t�Τ�����ܳ����C
*   **7. �į�P���c (Performance & Refactoring)**
    *   �ʸ˲Τ@�� `PriceService` ���O�ӳB�z�Ҧ������ШD�C
