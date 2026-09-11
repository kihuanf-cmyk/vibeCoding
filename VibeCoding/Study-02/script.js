// File timestamp: 2026-09-09 20:22:20 +09:00

let todos = [];
let todoSequence = 0;

function saveTodos() {
	try {
		localStorage.setItem("todos", JSON.stringify(todos));
	} catch (error) {
		console.error("할 일 저장에 실패했습니다:", error);
	}
}

function loadTodos() {
	try {
		const savedTodos = localStorage.getItem("todos");
		if (!savedTodos) {
			todos = [];
			return;
		}

		const parsedTodos = JSON.parse(savedTodos);
		todos = Array.isArray(parsedTodos) ? parsedTodos : [];
	} catch (error) {
		todos = [];
		localStorage.removeItem("todos");
		console.warn("저장된 할 일을 불러오지 못해 빈 목록으로 시작합니다.");
	}
}

function addTodo(text, category) {
	const createdAt = new Date().toISOString();
	const todo = {
		id: `${Date.now()}-${todoSequence++}`,
		text,
		category,
		completed: false,
		createdAt
	};

	todos = [...todos, todo];
	console.log("할 일이 추가되었습니다:", todo);
	saveTodos();
	updateProgress();
	return todo;
}

function deleteTodo(id) {
	const todoToDelete = todos.find((todo) => todo.id === id);
	todos = todos.filter((todo) => todo.id !== id);
	console.log("할 일이 삭제되었습니다:", todoToDelete || id);
	saveTodos();
	updateProgress();
}

function toggleTodo(id) {
	let updatedTodo;

	todos = todos.map((todo) => {
		if (todo.id !== id) {
			return todo;
		}

		updatedTodo = { ...todo, completed: !todo.completed };
		return updatedTodo;
	});

	console.log("할 일 완료 상태가 변경되었습니다:", updatedTodo || id);
	saveTodos();
	updateProgress();
	return updatedTodo;
}

function editTodo(id, newText) {
	let updatedTodo;

	todos = todos.map((todo) => {
		if (todo.id !== id) {
			return todo;
		}

		updatedTodo = { ...todo, text: newText };
		return updatedTodo;
	});

	console.log("할 일이 수정되었습니다:", updatedTodo || id);
	saveTodos();
	updateProgress();
	return updatedTodo;
}

let activeCategory = "전체";
let editingTodoId = null;

function updateProgress() {
	const progressBar = document.querySelector("#progress-bar");
	const progressText = document.querySelector("#progress-text");
	const completedCount = todos.filter((todo) => todo.completed).length;
	const progress = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

	progressBar.value = progress;
	progressText.textContent = `완료 ${completedCount}/전체 ${todos.length} (${progress}%)`;

	document.querySelectorAll(".category-summary-card").forEach((card) => {
		const categoryTodos = todos.filter((todo) => todo.category === card.dataset.category);
		const categoryCompleted = categoryTodos.filter((todo) => todo.completed).length;
		const categoryProgress = categoryTodos.length === 0
			? 0
			: Math.round((categoryCompleted / categoryTodos.length) * 100);

		card.querySelector(".category-count").textContent = `${categoryCompleted}/${categoryTodos.length}`;
		const categoryProgressBar = card.querySelector(".category-progress");
		categoryProgressBar.value = categoryProgress;
	});
}

function createTodoElement(todo) {
	const todoItem = document.createElement("li");
	todoItem.className = "todo-item";

	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.checked = todo.completed;
	checkbox.setAttribute("aria-label", `${todo.text} 완료 여부`);
	checkbox.addEventListener("change", () => {
		toggleTodo(todo.id);
		renderTodos();
	});

	const todoContent = document.createElement("div");
	todoContent.className = "todo-content";

	if (editingTodoId === todo.id) {
		const editInput = document.createElement("input");
		editInput.type = "text";
		editInput.value = todo.text;
		editInput.className = "edit-input";
		editInput.setAttribute("aria-label", "할 일 수정");

		const saveEdit = () => {
			const newText = editInput.value.trim();
			if (!newText) {
				editInput.focus();
				return;
			}

			editTodo(todo.id, newText);
			editingTodoId = null;
			renderTodos();
		};

		editInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				saveEdit();
			}
			if (event.key === "Escape") {
				editingTodoId = null;
				renderTodos();
			}
		});

		todoContent.append(editInput);

		const saveButton = document.createElement("button");
		saveButton.type = "button";
		saveButton.textContent = "저장";
		saveButton.addEventListener("click", saveEdit);

		const cancelButton = document.createElement("button");
		cancelButton.type = "button";
		cancelButton.textContent = "취소";
		cancelButton.addEventListener("click", () => {
			editingTodoId = null;
			renderTodos();
		});

		todoItem.append(checkbox, todoContent, saveButton, cancelButton);
		requestAnimationFrame(() => {
			editInput.focus();
			editInput.select();
		});
		return todoItem;
	}

	const todoText = document.createElement("span");
	todoText.className = "todo-text";
	todoText.textContent = todo.text;
	if (todo.completed) {
		todoText.classList.add("completed");
	}

	const category = document.createElement("span");
	category.className = "todo-category";
	category.dataset.category = todo.category;
	category.textContent = todo.category;

	todoContent.append(todoText, category);

	const editButton = document.createElement("button");
	editButton.type = "button";
	editButton.textContent = "수정";
	editButton.addEventListener("click", () => {
		editingTodoId = todo.id;
		renderTodos();
	});

	const deleteButton = document.createElement("button");
	deleteButton.type = "button";
	deleteButton.textContent = "삭제";
	deleteButton.addEventListener("click", () => {
		deleteTodo(todo.id);
		renderTodos();
	});

	todoItem.append(checkbox, todoContent, editButton, deleteButton);
	return todoItem;
}

function renderTodos(category = activeCategory) {
	const todoList = document.querySelector("#todo-list");
	const visibleTodos = category === "전체"
		? todos
		: todos.filter((todo) => todo.category === category);

	activeCategory = category;
	document.querySelectorAll(".filter-button").forEach((button) => {
		button.classList.toggle("active", button.dataset.category === activeCategory);
	});
	todoList.replaceChildren(...visibleTodos.map(createTodoElement));
}

function addTodoFromForm() {
	const todoInput = document.querySelector("#todo-input");
	const categorySelect = document.querySelector("#category-select");
	const text = todoInput.value.trim();

	if (!text) {
		todoInput.focus();
		return;
	}

	addTodo(text, categorySelect.value);
	todoInput.value = "";
	renderTodos();
	todoInput.focus();
}

document.addEventListener("DOMContentLoaded", () => {
	loadTodos();

	document.querySelector("#add-button").addEventListener("click", addTodoFromForm);
	document.querySelector("#todo-input").addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			addTodoFromForm();
		}
	});

	document.querySelectorAll(".filter-button").forEach((button) => {
		button.addEventListener("click", () => {
			renderTodos(button.dataset.category);
		});
	});

	renderTodos();
	updateProgress();
});
