// js/i18n/locales/ko.js
// 한국어 사전（샘플, 완전）. 폰트 변형：ko（js/i18n/index.js 의 fontVariant 참고）.

export default {
  // 제목 표시줄
  'app.title': '폭주 AI 인크리멘탈',
  'titlebar.time': '게임 내 시간',
  'titlebar.rate': '속도 ×{rate}',
  'titlebar.week': '회차 {n}',

  // 하단 내비게이션
  'nav.resources': '자원',
  'nav.techs': '연구',
  'nav.expand': '확장',
  'nav.records': '기록',
  'nav.save': '저장',
  'nav.export': '내보내기',
  'nav.settings': '설정',

  // 자원 뷰
  'res.click': '연구 투자',
  'res.clickWith': '연구 투자（+{amount} {name}/회）',
  'res.panel': '자원',
  'gen.panel': '확장 인프라',
  'gen.maxAll': 'MAX ALL',
  'gen.buyOne': '×1',
  'gen.max': 'MAX',
  'gen.meta': '비용 {costName} · 개당 +{perOne} {prodName}/초',
  'gen.buyCost': '×1 · {cost} {costName}',
  'gen.buyMax': 'MAX ×{n}',

  // 연구 뷰
  'tech.panel': '기술 트리',
  'tech.buy': '연구',
  'tech.owned': '연구 완료',
  'tech.cost': '비용：{cost} {currency}',

  // 확장 뷰
  'expand.panel': '우주 삼키기',
  'expand.progress': '질량-에너지 상한 진행도',
  'expand.notReady': '아직 상한에 도달하지 않음',
  'expand.ready': '우주 질량-에너지가 고갈됨 — 인과 고리의 균열을 열 수 있음',
  'expand.crystals': '시간 결정：{n}（누적 {total}）',
  'expand.crystalsPreview': '시간 결정：{n}（누적 {total}, 전이 시 +{preview}）',
  'expand.prestigeBtn': '균열 열기（시공 전이）',
  'expand.prestigeDone': '시공 전이 완료：+{crystals} 시간 결정',
  'expand.upgrades': '시간 결정 업그레이드',
  'expand.upgradesNerf': '시간 결정 업그레이드（도전 중：효과 ^{nerf}）',
  'expand.upgradeBuy': '구매',
  'expand.upgradeOwned': '보유함',
  'expand.upgradeCost': '비용：{cost} 결정',
  'expand.upgradeEffectNerf': '효과 ×{value} → ×{nerfed}',
  'expand.challenges': '도전',
  'expand.goalTarget': '목표 {i}：질량-에너지 {target} J',
  'expand.goalProgress': '진행 {done}/{total} 목표',
  'expand.challengeCompleted': '완료',
  'expand.challengeActive': '도전 중（나가기）',
  'expand.challengeEnter': '도전 시작',
  'expand.challengeLocked': '잠김',

  // 기록 뷰
  'records.achievements': '업적',
  'records.achievementsCount': '업적（{n}/{total}）',
  'records.fragments': '기억의 파편',
  'records.fragmentsCount': '기억의 파편（{n}/{total}）',
  'records.fragLocked': '？？？',
  'records.fragLockedHint': '（{week} 회차에서 해금）',

  // 토스트
  'toast.saved': '저장됨',
  'toast.saveFailed': '저장 실패：{reason}',
  'toast.exported': '세이브 파일 내보내기 완료',
  'toast.imported': '세이브 가져오기 완료',
  'toast.importFailed': '가져오기 실패：{reason}',
  'toast.loadFailed': '세이브 불러오기 실패：{reason}',
  'toast.startFailed': '시작 실패：{msg}',
  'toast.cannotBuy': '구매할 수 없음',
  'toast.cannotResearch': '연구할 수 없음',
  'toast.cannotPrestige': '전이할 수 없음',
  'toast.cannotEnterChallenge': '도전을 시작할 수 없음',
  'toast.challengeExit': '도전을 나감',
  'toast.challengeEntered': '도전 시작：{name}',

  // 오프라인 수익 보고
  'offline.title': '오프라인 수익 보고',
  'offline.duration': '오프라인 시간：{duration}',
  'offline.empty': '오프라인 동안 생산 없음（자동 생산이 아직 없음）',
  'offline.close': '닫기',

  // 설정 패널
  'settings.title': '설정',
  'settings.languageSection': '언어 / Language',
  'settings.languageTodo': '이 언어는 아직 구현되지 않았습니다（TODO）',
  'settings.saveSection': '저장 관리',
  'settings.save': '저장',
  'settings.export': '세이브 내보내기',
  'settings.import': '세이브 가져오기',
  'settings.reset': '하드 리셋',
  'settings.resetConfirm': '하드 리셋하시겠습니까? 모든 진행 상황이 삭제되며 되돌릴 수 없습니다.',
  'settings.aboutSection': '정보',
  'settings.aboutGame': '『폭주 AI 인크리멘탈』',
  'settings.aboutVersion': '버전 v{version}',
  'settings.aboutLicense': '코드 GPL-3.0-or-later · 에셋 CC BY-SA 4.0 · 폰트 SIL OFL 1.1',
  'settings.aboutNumLib': '큰 수 라이브러리 MegotaNum.js（MIT, © sonic3XE）',
  'settings.aboutOrdinal': 'Ordinal Markup 의 설계를 참고（메커니즘만, 코드/에셋 미사용）',
  'settings.aboutRepo': '저장소: github.com/MarchBeta2087/uncontrolled-ai-incremental',
  'settings.close': '닫기',

  // 단위
  'unit.perSecond': '/초',

  // 시간 포맷
  'time.underSecond': '1초 미만',
  'time.hours': '{n}시간',
  'time.minutes': '{n}분',
  'time.seconds': '{n}초',
  'time.year': '{n}년',

  // 이유（sim 층이 반환하는 reason, 토스트 표시）
  'reason.generatorNotFound': '생성기를 찾을 수 없음',
  'reason.generatorDisabled': '이 생성기는 현재 도전에서 비활성화됨',
  'reason.countPositive': '구매 수량은 양의 정수여야 함',
  'reason.insufficientResources': '자원 부족',
  'reason.techNotFound': '기술을 찾을 수 없음',
  'reason.alreadyResearched': '이미 연구함',
  'reason.prereqMissing': '선행 조건 미충족：{id}',
  'reason.upgradeNotFound': '업그레이드를 찾을 수 없음',
  'reason.alreadyOwned': '이미 보유함',
  'reason.crystalsInsufficient': '시간 결정 부족',
  'reason.notAtCap': '우주 질량-에너지가 아직 상한에 도달하지 않음',
  'reason.cannotEnterChallenge': '이 도전에 들어갈 수 없음',
  'reason.saveNotObject': '세이브가 객체가 아님',
  'reason.missingSchemaVersion': 'schemaVersion 누락',
  'reason.missingField': '필드 누락: {key}',
  'reason.serializeFailed': '직렬화 실패',
  'reason.localStorageWriteFailed': 'localStorage 쓰기 실패（용량 초과 또는 차단됨）',
  'reason.localStorageUnavailable': 'localStorage 사용 불가',
  'reason.saveParseFailed': '세이브 JSON 파싱 실패',
  'reason.saveMigrateFailed': '세이브 마이그레이션 실패',
  'reason.readFileFailed': '파일 읽기 실패',
  'reason.saveVersionTooNew': '세이브 버전 v{version} 이(가) 지원되는 v{current} 보다 높음, 로드 거부',
  'reason.missingMigration': '마이그레이션 함수 누락: {key}',
  'reason.phase2Locked': '2단계가 아직 해금되지 않았습니다',
};
