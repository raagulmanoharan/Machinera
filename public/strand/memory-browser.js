import {
  memoryName,
  nameCharacters,
  variationAvailable,
  currentCandidate,
  prepareVariation,
} from "./memory-exploration.js?v=199";

// One dialog, one candidate and a small ephemeral thumbnail cache. No image is
// written to storage; every preview comes from a derived woven entry.
export function createMemoryBrowser({
  getArchive,
  getSelected = () => getArchive()?.entries.at(-1),
  isBusy,
  thumbnail,
  jump,
  save,
  rename,
  add,
  onDialog,
}) {
  const dialog = document.querySelector("#memoriesDialog"),
    open = document.querySelector("#browseMemories"),
    list = document.querySelector("#memoryList"),
    detail = document.querySelector("#memoryDetail"),
    message = document.querySelector("#memoryMessage"),
    title = document.querySelector("#memoriesTitle"),
    back = document.querySelector("#memoriesBack"),
    nameForm = document.querySelector("#memoryNameForm"),
    nameField = document.querySelector("#memoryName"),
    count = document.querySelector("#memoryNameCount"),
    nameStatus = document.querySelector("#memoryNameStatus"),
    variant = document.querySelector("#variantPreview"),
    variantImage = document.querySelector("#variantImage"),
    variantStatus = document.querySelector("#variantStatus"),
    another = document.querySelector("#variantAnother"),
    accept = document.querySelector("#variantAdd"),
    weave = document.querySelector("#memoryWeaveAgain");
  const cache = new Map(),
    pendingImages = new WeakSet();
  const keyFor = (entry) =>
    entry.metadata?.memoryId ?? `${entry.end}:${entry.plan.id}`;
  let token = 0,
    selected = null,
    candidate = null,
    candidateURL = null,
    working = false,
    observer = null,
    queue = [],
    draining = false,
    returnFocus = null;
  const clearCandidate = () => {
    candidate = null;
    if (candidateURL) URL.revokeObjectURL(candidateURL);
    candidateURL = null;
    variantImage.removeAttribute("src");
    variantImage.hidden = true;
    accept.disabled = true;
  };
  const invalidate = () => {
    token++;
    observer?.disconnect();
    observer = null;
    queue = [];
    clearCandidate();
  };
  const report = (text = "") => {
    message.textContent = text;
    message.hidden = !text;
  };
  function refresh() {
    const entries = getArchive()?.entries ?? [];
    open.hidden = !entries.length;
    open.disabled = isBusy();
  }
  function controls() {
    const busy = working || isBusy();
    dialog.setAttribute("aria-busy", String(working));
    another.disabled = busy;
    accept.disabled = busy || !currentCandidate(candidate, getArchive());
    weave.disabled = busy;
    document.querySelector("#memoryView").disabled = busy;
    document.querySelector("#memoryRename").disabled = busy;
    document.querySelector("#memoryNameSave").disabled = busy;
    document.querySelector("#memoryExport").disabled = busy;
    back.disabled = working;
  }
  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        const job = queue.shift();
        try {
          if (
            job.token !== token ||
            !dialog.open ||
            !job.image.closest(".memory-item")?._visible
          )
            continue;
          const url = await thumbnail(job.entry);
          if (job.token !== token || !dialog.open) {
            URL.revokeObjectURL(url);
            continue;
          }
          const key = keyFor(job.entry);
          if (cache.has(key)) URL.revokeObjectURL(cache.get(key));
          cache.set(key, url);
          while (cache.size > 16) {
            const oldest = cache.keys().next().value;
            URL.revokeObjectURL(cache.get(oldest));
            cache.delete(oldest);
          }
          if (job.image.closest(".memory-item")?._visible) {
            job.image.src = url;
            job.image.hidden = false;
            job.placeholder.hidden = true;
          }
        } catch {
          job.placeholder.textContent = "Preview unavailable";
        } finally {
          pendingImages.delete(job.image);
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    } finally {
      draining = false;
    }
  }
  function enqueue(entry, image, placeholder) {
    const url = cache.get(keyFor(entry));
    if (url) {
      image.src = url;
      image.hidden = false;
      placeholder.hidden = true;
      return;
    }
    if (pendingImages.has(image)) return;
    pendingImages.add(image);
    queue.push({ entry, image, placeholder, token });
    drain();
  }
  function overview() {
    const remembered = selected?.entry ?? getSelected();
    invalidate();
    selected = null;
    working = false;
    list.replaceChildren();
    list.hidden = false;
    detail.hidden = true;
    back.hidden = true;
    title.textContent = "Memories";
    report();
    const archive = getArchive();
    if (!archive?.entries.length) {
      dialog.close();
      return;
    }
    observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          const item = record.target,
            image = item.querySelector("img"),
            placeholder = item.querySelector(".memory-placeholder");
          item._visible = record.isIntersecting;
          if (record.isIntersecting) enqueue(item._entry, image, placeholder);
          else {
            image.removeAttribute("src");
            image.hidden = true;
            placeholder.hidden = false;
          }
        }
      },
      { root: list, rootMargin: "100px" },
    );
    archive.entries.forEach((entry, index) => {
      const item = document.createElement("button");
      item.className = "memory-item";
      item.type = "button";
      item._entry = entry;
      const image = document.createElement("img");
      image.hidden = true;
      image.alt = "";
      image.width = 90;
      image.height = 160;
      const placeholder = document.createElement("span");
      placeholder.className = "memory-placeholder";
      placeholder.textContent = "Woven memory";
      const label = document.createElement("span");
      label.className = "memory-item-label";
      label.textContent = `Memory ${String(index + 1).padStart(2, "0")}${entry.metadata?.name ? " · " + entry.metadata.name : ""}${entry.saveState === "unsaved" ? " · Not saved" : ""}`;
      item.append(image, placeholder, label);
      item.onclick = () => showDetail(entry, index);
      list.append(item);
      observer.observe(item);
    });
    const version = token;
    requestAnimationFrame(() => {
      if (version !== token || !dialog.open) return;
      const item = [...list.children].find(
        (item) => item._entry === remembered,
      );
      if (item)
        list.scrollTop = Math.max(
          0,
          item.offsetTop -
            list.offsetTop -
            list.clientHeight / 2 +
            item.clientHeight / 2,
        );
    });
    if (dialog.open) title.focus({ preventScroll: true });
  }
  function showDetail(entry, index) {
    invalidate();
    selected = { entry, index };
    working = false;
    list.hidden = true;
    detail.hidden = false;
    back.hidden = false;
    back.textContent = "Back";
    title.textContent = `Memory ${String(index + 1).padStart(2, "0")}`;
    report(
      entry.saveState === "unsaved"
        ? "This memory is available in this session only. Download it before closing."
        : "",
    );
    document.querySelector("#memoryDetailName").textContent =
      entry.metadata?.name ?? "";
    document.querySelector("#memoryDetailWeave").textContent =
      entry.plan.motif?.family?.replaceAll("-", " ") ?? entry.plan.draft.name;
    nameForm.hidden = true;
    variant.hidden = true;
    weave.hidden =
      !variationAvailable(entry) || entry !== getArchive().entries.at(-1);
    controls();
    title.focus({ preventScroll: true });
  }
  async function generate() {
    if (working || !selected || isBusy()) return;
    working = true;
    const version = ++token,
      prior = candidate;
    nameForm.hidden = true;
    variant.hidden = false;
    variantStatus.textContent = "Making another weave…";
    controls();
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const next = prepareVariation(getArchive(), selected.entry, {
        previous: prior,
      });
      const url = await thumbnail(next.entry, next.archive);
      if (version !== token || !dialog.open) {
        URL.revokeObjectURL(url);
        return;
      }
      clearCandidate();
      candidate = next;
      candidateURL = url;
      variantImage.src = url;
      variantImage.hidden = false;
      variantStatus.textContent = "Same colours. Adds a new memory.";
    } catch (error) {
      if (version === token)
        variantStatus.textContent =
          (error.message || "Could not make another weave. Try again.") +
          (prior ? " Your previous preview is still available." : "");
    } finally {
      if (version === token) {
        working = false;
        controls();
        another.focus({ preventScroll: true });
      }
    }
  }
  open.onclick = () => {
    if (isBusy()) return;
    returnFocus = open;
    overview();
    dialog.style.setProperty(
      "--camera-paper",
      document
        .querySelector("#capture")
        .style.getPropertyValue("--camera-paper"),
    );
    dialog.showModal();
    title.focus({ preventScroll: true });
    onDialog(true);
  };
  document.querySelector("#memoriesClose").onclick = () => {
    if (working && accept.dataset.committing === "true") return;
    dialog.close();
  };
  dialog.addEventListener("cancel", (event) => {
    if (accept.dataset.committing === "true") event.preventDefault();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") event.stopPropagation();
  });
  dialog.addEventListener("close", () => {
    invalidate();
    selected = null;
    working = false;
    onDialog(false);
    returnFocus?.focus({ preventScroll: true });
  });
  back.onclick = () => {
    if (working) return;
    if (!variant.hidden) {
      clearCandidate();
      variant.hidden = true;
      variantStatus.textContent = "";
    } else if (!nameForm.hidden) {
      nameForm.hidden = true;
      document.querySelector("#memoryRename").focus();
    } else overview();
  };
  document.querySelector("#memoryView").onclick = () => {
    if (!selected || working) return;
    const entry = selected.entry;
    dialog.close();
    jump(entry);
  };
  document.querySelector("#memoryExport").onclick = () => {
    if (!selected || working) return;
    const value = selected;
    dialog.close();
    save(value);
  };
  weave.onclick = generate;
  another.onclick = generate;
  accept.onclick = async () => {
    if (working || !currentCandidate(candidate, getArchive()) || isBusy())
      return;
    working = true;
    accept.dataset.committing = "true";
    const version = token;
    controls();
    variantStatus.textContent = "Adding this weave…";
    try {
      await add(candidate);
      if (version === token) dialog.close();
    } catch (error) {
      if (version === token)
        variantStatus.textContent =
          error.message || "Could not add this weave. Try again.";
    } finally {
      accept.dataset.committing = "false";
      working = false;
      if (dialog.open) controls();
    }
  };
  document.querySelector("#memoryRename").onclick = () => {
    if (working) return;
    clearCandidate();
    variant.hidden = true;
    nameForm.hidden = false;
    nameField.value = selected.entry.metadata?.name ?? "";
    nameStatus.textContent = "";
    updateCount();
    nameField.focus();
  };
  function updateCount() {
    count.textContent = `${nameCharacters(nameField.value)} / 40`;
    nameField.setAttribute(
      "aria-invalid",
      String(nameCharacters(nameField.value) > 40),
    );
  }
  let composing = false;
  nameField.addEventListener("compositionstart", () => {
    composing = true;
  });
  nameField.addEventListener("compositionend", () => {
    composing = false;
    updateCount();
  });
  nameField.addEventListener("input", updateCount);
  document.querySelector("#memoryNameCancel").onclick = () => {
    if (!working) {
      nameForm.hidden = true;
      document.querySelector("#memoryRename").focus();
    }
  };
  nameForm.onsubmit = async (event) => {
    event.preventDefault();
    if (working || !selected || event.isComposing || composing) return;
    let name;
    try {
      name = memoryName(nameField.value);
    } catch (error) {
      nameStatus.textContent = error.message;
      return;
    }
    working = true;
    const version = token;
    controls();
    nameStatus.textContent = "Saving name…";
    try {
      await rename(selected.entry, name);
      if (version !== token) return;
      document.querySelector("#memoryDetailName").textContent = name;
      nameForm.hidden = true;
      report();
    } catch (error) {
      if (version === token)
        nameStatus.textContent =
          error.message || "Name was not saved. Try again.";
    } finally {
      if (version === token) {
        working = false;
        controls();
        if (nameForm.hidden) document.querySelector("#memoryRename").focus();
      }
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && dialog.open && accept.dataset.committing !== "true")
      dialog.close();
  });
  refresh();
  return {
    refresh,
    get open() {
      return dialog.open;
    },
    close() {
      dialog.close();
    },
    dispose() {
      invalidate();
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    },
  };
}
