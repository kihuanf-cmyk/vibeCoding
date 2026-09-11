<!-- File timestamp: 2026-09-09 20:22:20 +09:00 -->
# 개인용 할 일 관리 앱

## 파일 구조

- `index.html`: 앱 화면 구조
- `style.css`: 레이아웃 및 시각 스타일
- `script.js`: 할 일 상태 관리, 화면 렌더링, localStorage 연동

## 주요 기능

- 할 일 추가
- 카테고리 선택: 업무, 개인, 공부
- 할 일 완료 상태 변경
- 할 일 인라인 수정 및 삭제
- 카테고리별 필터링
- 전체 진행률 및 카테고리별 진행률 표시
- 새로고침 후에도 데이터 유지

## 상태 데이터

`todos` 배열에 다음 형태로 저장됩니다.

```js
{
  id: "생성시각 기반 고유값",
  text: "할 일 내용",
  category: "업무 | 개인 | 공부",
  completed: false,
  createdAt: "생성 시각"
}
```

## 주요 함수

- `addTodo(text, category)`: 할 일을 추가하고 저장합니다.
- `deleteTodo(id)`: 지정한 할 일을 삭제하고 저장합니다.
- `toggleTodo(id)`: 완료 상태를 반전하고 저장합니다.
- `editTodo(id, newText)`: 할 일 텍스트를 수정하고 저장합니다.
- `saveTodos()`: `todos`를 localStorage의 `todos` 키에 저장합니다.
- `loadTodos()`: localStorage에서 저장된 할 일을 복원합니다.
- `renderTodos()`: 현재 필터에 맞는 목록을 화면에 표시합니다.
- `updateProgress()`: 전체 및 카테고리별 진행률을 갱신합니다.

## 초기화 흐름

페이지의 DOM이 준비되면 다음 순서로 실행됩니다.

1. `loadTodos()`
2. 이벤트 핸들러 연결
3. `renderTodos()`
4. `updateProgress()`

## 실행 방법

`index.html`을 브라우저에서 열면 실행됩니다. 데이터는 브라우저의 localStorage에 저장됩니다.

프레임워크나 외부 라이브러리는 사용하지 않았습니다.
