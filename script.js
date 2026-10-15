(function () {
  "use strict";

  var STORAGE_KEY = "focusflow-tasks";
  var form = document.getElementById("task-form");
  var input = document.getElementById("task-input");
  var errorEl = document.getElementById("task-error");
  var listEl = document.getElementById("task-list");
  var statsEl = document.getElementById("stats");
  var clearButton = document.getElementById("clear-completed");
  var filterButtons = document.querySelectorAll(".filter-btn");

  var tasks = loadTasks();
  var currentFilter = "all";

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    addTask(input.value);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTask(input.value);
    }
  });

  clearButton.addEventListener("click", clearCompletedTasks);

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      currentFilter = button.getAttribute("data-filter");
      updateFilterButtons();
      render();
    });
  });

  render();

  function addTask(rawText) {
    var text = String(rawText || "").trim();

    if (!text) {
      showError("Enter a study task before adding it.");
      input.focus();
      return;
    }

    hideError();
    tasks.unshift({
      id: createId(),
      text: text,
      completed: false,
    });
    input.value = "";
    saveTasks();
    render();
    input.focus();
  }

  function toggleTask(id) {
    tasks = tasks.map(function (task) {
      if (task.id === id) {
        return {
          id: task.id,
          text: task.text,
          completed: !task.completed,
        };
      }
      return task;
    });
    saveTasks();
    render();

    if (currentFilter === "all") {
      var checkbox = document.getElementById("task-" + id);
      if (checkbox) {
        checkbox.focus();
      }
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });
    saveTasks();
    render();
  }

  function clearCompletedTasks() {
    var completedCount = tasks.filter(function (task) {
      return task.completed;
    }).length;

    if (completedCount === 0) {
      return;
    }

    var confirmed = window.confirm(
      "Remove " +
        completedCount +
        " completed " +
        (completedCount === 1 ? "task" : "tasks") +
        "? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    tasks = tasks.filter(function (task) {
      return !task.completed;
    });
    saveTasks();
    render();
  }

  function getVisibleTasks() {
    if (currentFilter === "pending") {
      return tasks.filter(function (task) {
        return !task.completed;
      });
    }

    if (currentFilter === "completed") {
      return tasks.filter(function (task) {
        return task.completed;
      });
    }

    return tasks.slice();
  }

  function render() {
    var visible = getVisibleTasks();
    var completedCount = tasks.filter(function (task) {
      return task.completed;
    }).length;
    var pendingCount = tasks.length - completedCount;

    statsEl.textContent =
      "Total " +
      tasks.length +
      " · Pending " +
      pendingCount +
      " · Completed " +
      completedCount;

    clearButton.disabled = completedCount === 0;

    listEl.replaceChildren();

    if (visible.length === 0) {
      var emptyItem = document.createElement("li");
      emptyItem.className = "empty-wrap";
      emptyItem.appendChild(createEmptyState());
      listEl.appendChild(emptyItem);
      return;
    }

    visible.forEach(function (task) {
      listEl.appendChild(createTaskRow(task));
    });
  }

  function createEmptyState() {
    var message = document.createElement("p");
    message.className = "empty-state";

    if (tasks.length === 0) {
      message.innerHTML =
        "<strong>Your study list is empty</strong>Add a task above to start this session.";
    } else if (currentFilter === "pending") {
      message.innerHTML =
        "<strong>Nothing pending</strong>Every study task on this list is complete.";
    } else if (currentFilter === "completed") {
      message.innerHTML =
        "<strong>No completed tasks yet</strong>Check a task off when you finish it.";
    } else {
      message.innerHTML =
        "<strong>No tasks to show</strong>Try another filter.";
    }

    return message;
  }

  function createTaskRow(task) {
    var item = document.createElement("li");
    item.className = "task-item" + (task.completed ? " is-completed" : "");
    item.dataset.id = task.id;

    var checkboxId = "task-" + task.id;
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.id = checkboxId;
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark complete: " + task.text);
    checkbox.addEventListener("change", function () {
      toggleTask(task.id);
    });

    var label = document.createElement("label");
    label.className = "task-label";
    label.setAttribute("for", checkboxId);
    label.textContent = task.text;

    var deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "task-delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", "Delete task: " + task.text);
    deleteButton.addEventListener("click", function () {
      deleteTask(task.id);
    });

    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(deleteButton);
    return item;
  }

  function updateFilterButtons() {
    filterButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-filter") === currentFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function showError(message) {
    errorEl.hidden = false;
    errorEl.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function hideError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function createId() {
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function loadTasks() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map(function (item) {
          if (!item || typeof item !== "object") {
            return null;
          }

          var text = String(item.text || "").trim();
          if (!text) {
            return null;
          }

          return {
            id: item.id ? String(item.id) : createId(),
            text: text,
            completed: Boolean(item.completed),
          };
        })
        .filter(function (item) {
          return item !== null;
        });
    } catch (error) {
      return [];
    }
  }

  function saveTasks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      showError("Tasks could not be saved in this browser.");
    }
  }
})();
