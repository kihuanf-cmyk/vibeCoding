<!-- File timestamp: 2026-09-11 21:17:21 +09:00 -->
# Study-04 및 Study-05 에이전트 안내

## 저장 위치

에이전트의 실제 정의 파일은 워크스페이스 공용 폴더인 `.github/agents/`에 저장되어 있습니다.
이 문서는 Study-04와 Study-05에서 사용할 수 있는 에이전트와 역할을 쉽게 확인하기 위한 안내서입니다.

## Study-04 및 Study-05 공용 에이전트

| 에이전트 | 정의 파일 | 역할 |
| --- | --- | --- |
| Study-04/05 Product Manager | `.github/agents/study04-product-manager.agent.md` | 제품 목표, 사용자 스토리, PRD, 요구사항, 수용 기준, 출시 범위를 정의합니다. |
| Study-04/05 Backend Developer | `.github/agents/study04-backend-developer.agent.md` | 서버, API, 데이터 처리, 저장소, 보안, 외부 서비스 연동, 백엔드 성능을 담당합니다. |
| Study-04/05 Frontend Developer | `.github/agents/study04-frontend-developer.agent.md` | HTML, CSS, JavaScript, 반응형 화면, 접근성, 클라이언트 상태와 오류·로딩 화면을 담당합니다. |
| Study-04/05 QA Engineer | `.github/agents/study04-qa-engineer.agent.md` | 기능, 오류 처리, API 계약, 데이터 소유권, 성능 회귀, 사용성, 접근성과 출시 준비 상태를 검증합니다. |
| Study-04/05 AI Integration Specialist | `.github/agents/study04-ai-integration-specialist.agent.md` | OpenRouter API를 통한 AI 모델 연동, 프롬프트, 모델 응답 형식 검증, AI 안정성과 비용 제어를 담당합니다. |
| Study-04/05 Performance Optimizer | `.github/agents/study04-performance-optimizer.agent.md` | 서버 처리량, API 지연, 파일 I/O, 렌더링 비용, 메모리와 전체 애플리케이션 성능을 최적화합니다. |
| Study-04/05 UX Designer | `.github/agents/study04-ux-designer.agent.md` | 화면 흐름, 버튼 배치, 폼 사용성, 반응형 디자인, 접근성, 로딩과 오류 메시지를 개선합니다. |

## 공용 에이전트

| 에이전트 | 정의 파일 | 역할 |
| --- | --- | --- |
| Code Quality Reviewer | `.github/agents/code-quality-reviewer.agent.md` | 버그, 보안·신뢰성 위험, 코딩 규칙, 성능 개선점, 회귀와 테스트 공백을 수정 없이 검토합니다. |
| VibeCoding Study Maintainer | `.github/agents/vibecoding-study-maintainer.agent.md` | 기존 VibeCoding 학습 프로젝트의 구조와 계약을 보존하면서 유지보수 작업을 수행합니다. |

## 권장 사용 순서

1. 새 기능이면 `Study-04/05 Product Manager`로 PRD와 수용 기준을 정의합니다.
2. 서버 기능은 `Study-04/05 Backend Developer`, 화면 기능은 `Study-04/05 Frontend Developer`를 사용합니다.
3. OpenRouter API 연동은 `Study-04/05 AI Integration Specialist`로 검증합니다.
4. 속도 문제는 `Study-04/05 Performance Optimizer`, 사용성 문제는 `Study-04/05 UX Designer`로 개선합니다.
5. 마지막에 `Study-04/05 QA Engineer` 또는 `Code Quality Reviewer`로 전체 품질을 확인합니다.

## 참고

- 이 문서는 에이전트 정의 자체가 아니라 Study-04용 안내 문서입니다.
- 에이전트 정의를 수정하려면 `.github/agents/`의 해당 `.agent.md` 파일을 수정해야 합니다.
- 에이전트 파일의 지침은 영어로 작성되어 있지만, 이 안내 문서는 한국어로 역할을 설명합니다.
