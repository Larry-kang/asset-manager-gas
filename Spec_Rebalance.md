# Spec_Rebalance.md

## �I�u�W��ѡG���z�A���ŭp��� (Smart Rebalancing Calculator)

### 1. �֤ߥؼ� (Objective)
- ���Ѥ@�ӡu�ʳ����v���겣�t�m�վ�u��C
- ��U�ϥΪ̱N��w���겣�զX��_��w�]��ҡC

### 2. �ϥΪ̬y�{ (User Flow)
- **�J�f**�G�I�����������C�s�W���u�A���šv���s�C
- **��l��**�G�����i�J���šA�I���u? �s�W�겣�v -> �u�X�����Ŀ�w�s�Ъ��]�t�u�{���v�ﶵ�^ -> �T�{�C
- **�]�w�v��**�G�b�d���W��ʷƱ�ο�J�Ʀr�]�w Target %�C
- **�d�ݫ�ĳ**�G�t�ΧY�ɭp�����ܡu��ĳ�R����B�v�C
- **�x�s**�G�I���u�x�s�]�w�v�A�N�ثe���겣�զX�P�v���s�J LocalStorage�C

### 3. �����]�p (UI/UX) - �ݤ���
- **�����C**�G�s�W�ĥ|�Ӥ��� `<div id="rebalance">`�C
- **�겣�d��**�G
  - �����G�N�� (Ticker) + �ثe���ȡC
  - �����G�Ʊ� (Slider) + �ʤ����J�ءC
  - �k���G��ĳ������B (���=�R�i, ����=��X)�C
  - ���A�G�Y `|�ثe% - �ؼ�%| > �H��`�A�d����ثG���O�A�_�h��O�C
- **�����έp�C**�G��ܡu�ثe�t�m�`���ȡv�B�u�ؼ��v���`�M (�ݵ��� 100%)�v�C

### 4. ��ƻP�޿� (Data & Logic)
- **�p��d��**�G�ȭp��u�Q��J�M��v���겣�`�M (Rebalancing Pool)�C
- **����**�G
  - Pool Value = SUM(��w�겣�����e����)
  - Target Value (i) = Pool Value * Target % (i)
  - Action (i) = Target Value (i) - Current Value (i)
- **�x�s���c** (LocalStorage):
  key: "asset_mgr_rebalance_v1"
  value: {
    "threshold": 0.05,
    "items": [
      { "ticker": "0050", "target": 50 },
      { "ticker": "CASH", "target": 10 }
    ]
  }

### 5. �޳N���� (Constraints)
- �B�I�ƹB��ݳB�z��װ��D�C
- ������Ʊ�ݫO�d����Ĳ���ϰ�C

### 6. �禬�з� (Acceptance Criteria)
- �v���`�M���� 100% �ɡA�T���x�s�����ĵ�i�C
- �s�W/�R���겣��A�p���޿�ݧY�ɧ�s�C
- ���s��z������A�W���]�w���v���ݦ۰ʸ��J�C
