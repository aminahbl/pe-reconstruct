type ReaderState = {
  language: "en" | "pli" | "both"
  showRefs: "true" | "false"
  showComments: "true" | "false"
  bilingualLayout: "split" | "stacked"
}

const getDocumentReaderState = () => {
  const root = document.documentElement
  const language = root.dataset.readerLanguage
  const bilingualLayout = root.dataset.readerBilingualLayout

  return {
    language: language === "pli" || language === "both" ? language : "en",
    showRefs: root.dataset.readerShowRefs === "true" ? "true" : "false",
    showComments: root.dataset.readerShowComments === "true" ? "true" : "false",
    bilingualLayout: bilingualLayout === "split" ? "split" : "stacked",
  }
}

const setDocumentReaderState = (state: ReaderState) => {
  const root = document.documentElement

  root.dataset.readerLanguage = state.language
  root.dataset.readerShowRefs = state.showRefs
  root.dataset.readerShowComments = state.showComments
  root.dataset.readerBilingualLayout = state.bilingualLayout
}

const syncReaderSearchParams = (state: ReaderState) => {
  const url = new URL(window.location.href)

  if (state.language === "en") {
    url.searchParams.delete("lang")
  } else {
    url.searchParams.set("lang", state.language)
  }

  if (state.showRefs === "false") {
    url.searchParams.delete("refs")
  } else {
    url.searchParams.set("refs", "true")
  }

  if (state.showComments === "false") {
    url.searchParams.delete("comments")
  } else {
    url.searchParams.set("comments", "true")
  }

  if (state.bilingualLayout === "stacked") {
    url.searchParams.delete("layout")
  } else {
    url.searchParams.set("layout", state.bilingualLayout)
  }

  window.history.replaceState(window.history.state, "", url)
}

const defineReaderControls = () => {
  class ReaderControlsElement extends HTMLElement {
    shortcutController?: AbortController

    disconnectedCallback() {
      this.shortcutController?.abort()
      this.shortcutController = undefined
    }

    connectedCallback() {
      this.shortcutController?.abort()
      const readerRoot = document.querySelector<HTMLElement>("[data-reader-root]")

      if (!readerRoot) {
        return
      }

      const languageInputs = this.querySelectorAll<HTMLInputElement>("[data-language-input]")
      const referenceInput = this.querySelector<HTMLInputElement>("[data-reference-input]")
      const commentInput = this.querySelector<HTMLInputElement>("[data-comment-input]")
      const layoutInput = this.querySelector<HTMLInputElement>("[data-layout-input]")
      const initialState = getDocumentReaderState()

      languageInputs.forEach((input) => {
        input.checked = input.value === initialState.language
      })

      if (referenceInput && !referenceInput.disabled) {
        referenceInput.checked = initialState.showRefs === "true"
      }

      if (commentInput && !commentInput.disabled) {
        commentInput.checked = initialState.showComments === "true"
      }

      if (layoutInput) {
        layoutInput.checked = initialState.bilingualLayout === "stacked"
      }

      const cycleLanguage = () => {
        const enabledInputs = Array.from(languageInputs)
        const currentIndex = enabledInputs.findIndex((input) => input.checked)
        const nextIndex =
          currentIndex === -1 || currentIndex === enabledInputs.length - 1 ? 0 : currentIndex + 1
        const nextInput = enabledInputs[nextIndex]

        if (!nextInput) {
          return
        }

        nextInput.checked = true
        nextInput.dispatchEvent(new Event("change", { bubbles: true }))
      }

      const toggleInput = (input?: HTMLInputElement | null) => {
        if (!input || input.disabled) {
          return
        }

        input.checked = !input.checked
        input.dispatchEvent(new Event("change", { bubbles: true }))
      }

      const updateState = (syncUrl: boolean) => {
        const selectedLanguage = this.querySelector<HTMLInputElement>("[data-language-input]:checked")
        const state: ReaderState = {
          language:
            selectedLanguage?.value === "pli"
              ? "pli"
              : selectedLanguage?.value === "both"
                ? "both"
                : "en",
          showRefs: referenceInput?.checked ? "true" : "false",
          showComments: commentInput?.checked ? "true" : "false",
          bilingualLayout: layoutInput?.checked ? "stacked" : "split",
        }

        readerRoot.dataset.language = state.language
        readerRoot.dataset.showRefs = state.showRefs
        readerRoot.dataset.showComments = state.showComments
        readerRoot.dataset.bilingualLayout = state.bilingualLayout
        setDocumentReaderState(state)

        if (syncUrl) {
          syncReaderSearchParams(state)
        }
      }
      const handleChange = () => {
        updateState(true)
      }

      languageInputs.forEach((input) => {
        input.addEventListener("change", handleChange)
      })
      referenceInput?.addEventListener("change", handleChange)
      commentInput?.addEventListener("change", handleChange)
      layoutInput?.addEventListener("change", handleChange)
      this.shortcutController = new AbortController()
      document.addEventListener(
        "keydown",
        (event) => {
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
            return
          }

          const activeElement = document.activeElement as HTMLElement | null
          const tagName = activeElement?.tagName.toLowerCase()
          const isEditable =
            activeElement?.isContentEditable ||
            tagName === "input" ||
            tagName === "textarea" ||
            tagName === "select" ||
            tagName === "button"

          if (isEditable) {
            return
          }

          const key = event.key.toLowerCase()

          if (key === "l") {
            event.preventDefault()
            cycleLanguage()
            return
          }

          if (key === "r") {
            event.preventDefault()
            toggleInput(referenceInput)
            return
          }

          if (key === "c") {
            event.preventDefault()
            toggleInput(commentInput)
            return
          }

          if (key === "v") {
            event.preventDefault()
            toggleInput(layoutInput)
          }
        },
        { signal: this.shortcutController.signal }
      )
      updateState(false)
    }
  }

  if (!customElements.get("reader-controls-panel")) {
    customElements.define("reader-controls-panel", ReaderControlsElement)
  }
}

defineReaderControls()
