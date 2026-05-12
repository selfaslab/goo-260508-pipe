# 연구 논문 쇼츠 대본 만들기 MVP

모노레포로 구성된 **논문 검색 → 저장 → AI 요약 → Shorts 스크립트** 파이프라인 초기 버전입니다.

<img width="1400" height="541" alt="pipe0" src="https://github.com/user-attachments/assets/5726922b-e35a-439f-8605-054f8bad82a4" />

<img width="1400" height="1132" alt="pipe2" src="https://github.com/user-attachments/assets/76f806ad-b805-4a92-ad4d-7546e9461a9b" />

<img width="1400" height="1033" alt="pipe3" src="https://github.com/user-attachments/assets/bc161ded-7089-4f97-9be6-6a2c46586336" />

<img width="1400" height="1186" alt="pipe4" src="https://github.com/user-attachments/assets/b9f509c0-f546-439b-92e7-9ccdbdf40c72" />


## 보안 (GitHub 푸시 시)

- **`apps/api/.env`**, **`apps/web/.env`** 및 기타 비밀 키는 **절대 커밋하지 마세요.** 저장소에는 `.env.example`만 두고, 실제 값은 로컬·배포 콘솔(Railway, Vercel 등)에만 넣습니다.
- 이미 실수로 푸시했다면 해당 키는 **즉시 폐기·재발급**하세요.

## 구조

- `apps/web` — React 18 + Vite + TypeScript + Tailwind
- `apps/api` — FastAPI
- `packages/shared-types` — 프론트·문서화용 공통 타입
- `supabase/migrations` — Postgres 스키마 초안

## 사전 준비

1. [Supabase](https://supabase.com) 프로젝트 생성 후 `supabase/migrations/*.sql` 순서대로 실행
2. OpenAI API 키
3. (선택) NCBI API 키 — PubMed 요청 한도 완화

## 환경 변수

- `apps/web/.env.example` → `apps/web/.env`
- `apps/api/.env.example` → `apps/api/.env`

## 로컬 실행

```bash
npm install
```

공유 타입 빌드 및 웹:

```bash
npm run dev:web
```

API (Python 가상환경 권장):

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

웹 기본 주소: http://localhost:5173  
API 기본 주소: http://localhost:8000

## 배포 메모

- 프론트: Vercel — 빌드 시 `VITE_API_BASE_URL`을 Railway API URL로 설정
- API: Railway — `CORS_ORIGINS`에 Vercel 도메인 추가

## GitHub

- 원격: [selfaslab/goo-260508-pipe](https://github.com/selfaslab/goo-260508-pipe)
