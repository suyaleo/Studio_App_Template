# Studio App Template

Leo Studio 제품군을 위한 공개 웹앱·Docker 공용 스타터입니다. 하나의 코드베이스에서 Vite 웹 빌드와 FastAPI 기반 컨테이너를 만들며, `$studio-design`의 UI 규칙과 `$studio-release`의 공개 릴리스 계약을 기본값으로 제공합니다.

## 포함된 기준

- 라이트·다크·시스템 테마와 의미 기반 디자인 토큰
- 제품명은 좌측 고정, Leo Studio 로고는 보조 브랜드로 배치
- `/api/health`, `/api/version`, `/api/preflight` API
- 동일한 Web 빌드를 사용하는 다단계 Docker 이미지
- 비루트 런타임, 상태 점검, `/data` 영속 볼륨
- Apache-2.0, NOTICE, 제3자 고지, 상표 정책, 보안 정책
- CI 및 SemVer 태그 기반 GHCR 릴리스 워크플로
- `studio.json` manifest와 결정론적 릴리스 검증기

## 새 제품 시작하기

GitHub의 **Use this template**로 새 저장소를 만든 뒤 다음 값을 한 번에 바꿉니다.

| 역할 | 예시 |
|---|---|
| 화면 제품명 | `Caption Studio` |
| GitHub 저장소 | `Caption_Studio` |
| 시스템 slug | `caption-studio` |

1. `studio.json`의 식별자·포트·컨테이너 값을 수정합니다.
2. `NOTICE`, `THIRD_PARTY_NOTICES.md`, `TRADEMARKS.md`를 제품에 맞게 검토합니다.
3. `web/src`의 템플릿 화면을 실제 사용자 플로우로 교체합니다.
4. `api/main.py`의 프리플라이트 예제를 실제 도메인 API로 교체합니다.
5. `python3 scripts/validate_studio_repo.py --mode release`를 통과시킵니다.

## 로컬 개발

Python API:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r api/requirements.txt -r api/requirements-dev.txt
uvicorn api.main:app --reload --host 127.0.0.1 --port 8001
```

다른 터미널에서 Web:

```bash
cd web
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5173`을 엽니다. Vite가 `/api` 요청을 8001 포트로 전달합니다.

## 프로덕션 Web 실행

```bash
cd web
npm ci
npm run build
cd ..
STATIC_DIR=web/dist uvicorn api.main:app --host 127.0.0.1 --port 8080
```

## Docker 실행

```bash
docker compose up --build
curl http://127.0.0.1:8080/api/health
```

앱 데이터는 Compose 볼륨에 보관되며 컨테이너 내부 `/data`에 연결됩니다.

## 검증

```bash
python3 scripts/validate_studio_repo.py --mode release
python3 -m pytest api/tests
cd web && npm ci && npm run check
```

## 릴리스

`v0.1.0` 같은 SemVer 태그를 푸시하면 검증 후 GitHub Container Registry에 다음 태그가 게시됩니다.

- 불변 버전 태그: `0.1.0`
- 불변 commit 태그: `sha-<commit>`
- 안정 릴리스 별칭: `latest`

저장소 공개 상태와 GHCR 패키지 공개 상태는 별개이므로 첫 릴리스 후 둘 다 확인해야 합니다.

## 라이선스와 브랜드

소스 코드는 [Apache License 2.0](LICENSE)으로 배포됩니다. Leo Studio 명칭과 로고 사용은 [TRADEMARKS.md](TRADEMARKS.md)를 따르며, Apache-2.0은 상표 사용권을 부여하지 않습니다.
