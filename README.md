# 초대장 플랫폼(오푸스)

Genspark 대화 요구사항을 바탕으로 만든 초대장 플랫폼 MVP입니다.

## 구현된 기능

- 초대장 종류 선택 (결혼식/돌잔치/집들이/칠순/모임)
- 디자인 템플릿 5종 (클래식/미니멀/따뜻한/네온/한지)
- 초대장 정보 입력
  - 제목, 주최자, 날짜/시간, 장소, 주소, 연락처, 계좌번호
- 배경 사진 업로드 + 캐릭터 장식 선택
- 지도 링크 자동 생성
  - 네이버 지도
  - 카카오맵
  - 구글 지도
- QR 코드 자동 생성 (On/Off)
- 공유 링크 생성 (`invite.html?data=` 형태로 정보 인코딩)
  - 작성자 편집 화면(index)과 하객 수신 화면(invite) 분리
- 작성자 초안 자동 저장/복구 (브라우저 LocalStorage)
  - 입력 중 자동 저장, `초안 초기화` 버튼 제공
- 카카오톡 공유 버튼
  - 카카오 JS 키 설정 시 카카오 SDK 공유
  - 키 미설정 시 공유 문구 복사로 대체
- 하객용 초대장 페이지(`invite.html`)
  - 지도 링크, QR, 계좌 복사, RSVP 제출
  - RSVP 항목에 `식사 여부` 포함
  - 동일 하객(전화번호/이름 기준) 재제출 시 기존 응답 업데이트
- RSVP 관리자 페이지(`admin.html`)
  - 참석/불참/예상 인원 통계
  - 검색/필터
  - CSV 다운로드
  - 항목 삭제

## RSVP 데이터 저장 방식 (중요)

현재 MVP는 **브라우저 LocalStorage 저장** 방식입니다.

- 장점: 별도 서버 없이 바로 동작
- 한계: 같은 브라우저/기기에서 입력된 RSVP만 보임

실서비스처럼 모든 하객 응답을 한곳에 모으려면 다음 단계에서 DB 백엔드 연동이 필요합니다.
예: Supabase, Firebase, Appwrite

## 실행 방법

정적 웹 앱이라 바로 실행됩니다.

```bash
# 프로젝트 폴더 이동
cd chodaejang-platform-opus

# 방법 1) 파일 직접 열기
open index.html

# 방법 2) 로컬 서버 실행(권장)
python3 -m http.server 8080
# http://localhost:8080 접속
```

## 카카오 공유 설정

카카오 자동 전송을 쓰려면:

1. [카카오 디벨로퍼스](https://developers.kakao.com/)에서 앱 생성
2. JavaScript 키 발급
3. 플랫폼/도메인 등록 (`http://localhost:8080` 등)
4. 화면의 `카카오 JavaScript 키` 입력 후 공유 버튼 사용

## 파일 구조

```text
chodaejang-platform-opus/
├── index.html
├── styles.css
├── app.js
├── invite.html
├── invite.css
├── invite.js
├── admin.html
├── admin.css
├── admin.js
└── README.md
```

## 다음 확장 아이디어

- DB 백엔드 연동으로 RSVP 중앙 수집
- 템플릿별 고급 레이아웃 편집기
- 링크 단축 및 방문 통계
- 계좌/송금 UX 고도화
- 카카오 로그인 연동
