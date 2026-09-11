<!-- File timestamp: 2026-09-11 21:17:21 +09:00 -->
# Study-05 에이전트 안내

## 현재 상태

Study-05 전용 폴더 내부에 에이전트 정의 파일을 두지는 않으며, 에이전트 정의는 워크스페이스 공용 폴더인 `.github/agents/`에 저장됩니다.
현재 주요 개발 에이전트의 범위가 Study-04에서 Study-04 및 Study-05로 확장되었습니다.

## 현재 공용 에이전트

| 에이전트 | 정의 파일 | 현재 용도 |
| --- | --- | --- |
| Code Quality Reviewer | `.github/agents/code-quality-reviewer.agent.md` | 코드를 읽고 버그, 보안·신뢰성 위험, 성능, 규칙 위반, 테스트 공백을 수정 없이 검토합니다. |
| Study-04/05 App Maintainer | `.github/agents/vibecoding-study-maintainer.agent.md` | Study-04와 Study-05의 애플리케이션 유지보수를 지원합니다. |

## Study-04 및 Study-05 공용 에이전트

다음 에이전트는 공용 `.github/agents/`에 등록되어 있으며 Study-04와 Study-05 모두에 사용할 수 있습니다.

- `study04-product-manager.agent.md`: 제품 기획과 PRD 작성
- `study04-backend-developer.agent.md`: 서버, API, 데이터, 보안, 성능
- `study04-frontend-developer.agent.md`: 웹 UI, 반응형 디자인, 접근성
- `study04-qa-engineer.agent.md`: 테스트, 품질 검증, 출시 준비
- `study04-ai-integration-specialist.agent.md`: OpenRouter API를 통한 AI 모델 연동
- `study04-performance-optimizer.agent.md`: 병목 분석과 성능 최적화
- `study04-ux-designer.agent.md`: 사용자 경험과 오류 메시지 개선

## 사용 방법

Study-05 작업을 요청할 때 에이전트 선택기에서 이름에 `Study-04/05`가 포함된 역할을 선택하면 됩니다. 실제 정의 파일을 수정할 때는 `.github/agents/`의 해당 `.agent.md` 파일을 갱신합니다.
