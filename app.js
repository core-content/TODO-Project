"use strict";

const storageKey = "daylist.tasks.v1";
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const filterButtons = document.querySelectorAll("[data-filter]");
const clearButton = document.querySelector("#clear-completed");
const statusMessage = document.querySelector("#status");
let currentFilter = "all";
let tasks = [];

document.querySelector("#today").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long", month: "long", day: "numeric"
}).format(new Date());

function storageWarning() {
  document.querySelector("#storage-note").textContent =
    "Browser storage is unavailable. Changes may not be saved.";
}

try {
  const savedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (!Array.isArray(savedTasks) || !savedTasks.every(task =>
    task && typeof task.id === "string" && typeof task.text === "string" &&
    task.text.trim().length > 0 && typeof task.completed === "boolean"
  ) || new Set(savedTasks.map(task => task.id)).size !== savedTasks.length) {
    throw new Error("Invalid saved tasks");
  }
  tasks = savedTasks;
} catch {
  storageWarning();
}

function saveTasks(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  } catch {
    storageWarning();
  }
  console.log(message);
  render();
  statusMessage.textContent = message;
}

function render() {
  const completedCount = tasks.filter(task => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const visibleTasks = tasks.filter(task => currentFilter === "all" ||
    (currentFilter === "completed" ? task.completed : !task.completed));

  document.querySelector("#all-count").textContent = tasks.length;
  document.querySelector("#active-count").textContent = activeCount;
  document.querySelector("#completed-count").textContent = completedCount;
  document.querySelector("#progress-count").textContent = `${completedCount} / ${tasks.length}`;
  document.querySelector("#remaining-count").textContent = `${activeCount} ${activeCount === 1 ? "task" : "tasks"} left`;
  clearButton.disabled = completedCount === 0;

  const rows = visibleTasks.map(task => {
    const row = document.createElement("li");
    row.className = `task-row${task.completed ? " completed" : ""}`;
    row.dataset.id = task.id;

    const label = document.createElement("label");
    label.className = "task-label";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      const taskIndex = visibleTasks.findIndex(visibleTask => visibleTask.id === task.id);
      saveTasks(task.completed ? "Task completed." : "Task marked active.");
      const remainingCheckboxes = taskList.querySelectorAll(".task-checkbox");
      const nextCheckbox = remainingCheckboxes[Math.min(taskIndex, remainingCheckboxes.length - 1)];
      (nextCheckbox || document.querySelector(`[data-filter="${currentFilter}"]`)).focus();
    });
    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;
    label.append(checkbox, text);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "\u00d7";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", `Delete task: ${task.text}`);
    deleteButton.addEventListener("click", () => {
      const taskIndex = visibleTasks.findIndex(visibleTask => visibleTask.id === task.id);
      tasks = tasks.filter(existingTask => existingTask.id !== task.id);
      saveTasks("Task deleted.");
      const remainingButtons = taskList.querySelectorAll(".delete-button");
      const nextButton = remainingButtons[Math.min(taskIndex, remainingButtons.length - 1)];
      (nextButton || taskInput).focus();
    });
    row.append(label, deleteButton);
    return row;
  });
  taskList.replaceChildren(...rows);

  document.querySelector("#empty-state").hidden = visibleTasks.length > 0;
  const emptyMessages = {
    all: ["A fresh start.", "Nothing on your list yet."],
    active: ["All clear.", "No active tasks right now."],
    completed: ["Good things take time.", "No completed tasks yet."]
  };
  document.querySelector("#empty-title").textContent = emptyMessages[currentFilter][0];
  document.querySelector("#empty-description").textContent = emptyMessages[currentFilter][1];
  filterButtons.forEach(button => {
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

taskInput.addEventListener("input", () => taskInput.setCustomValidity(""));
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.setCustomValidity("Please enter a task.");
    taskInput.reportValidity();
    return;
  }
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() :
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  tasks.push({ id, text, completed: false });
  currentFilter = currentFilter === "completed" ? "all" : currentFilter;
  taskInput.value = "";
  saveTasks("Task added.");
  taskInput.focus();
});

filterButtons.forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  render();
  statusMessage.textContent = `Showing ${currentFilter} tasks.`;
}));

clearButton.addEventListener("click", () => {
  tasks = tasks.filter(task => !task.completed);
  saveTasks("Completed tasks cleared.");
  taskInput.focus();
});

render();