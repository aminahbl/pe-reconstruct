const defineReaderControls = () => {
  class ReaderControlsElement extends HTMLElement {
    connectedCallback() {
      const readerRoot = document.querySelector<HTMLElement>("[data-reader-root]")

      if (!readerRoot) {
        return
      }

      const languageInputs = this.querySelectorAll<HTMLInputElement>("[data-language-input]")
      const referenceInput = this.querySelector<HTMLInputElement>("[data-reference-input]")
      const commentInput = this.querySelector<HTMLInputElement>("[data-comment-input]")
      const layoutInput = this.querySelector<HTMLInputElement>("[data-layout-input]")
      const updateState = () => {
        const selectedLanguage = this.querySelector<HTMLInputElement>("[data-language-input]:checked")
        readerRoot.dataset.language = selectedLanguage?.value ?? "en"
        readerRoot.dataset.showRefs = referenceInput?.checked ? "true" : "false"
        readerRoot.dataset.showComments = commentInput?.checked ? "true" : "false"
        readerRoot.dataset.bilingualLayout = layoutInput?.checked ? "stacked" : "split"
      }

      languageInputs.forEach((input) => {
        input.addEventListener("change", updateState)
      })
      referenceInput?.addEventListener("change", updateState)
      commentInput?.addEventListener("change", updateState)
      layoutInput?.addEventListener("change", updateState)
      updateState()
    }
  }

  if (!customElements.get("reader-controls-panel")) {
    customElements.define("reader-controls-panel", ReaderControlsElement)
  }
}

defineReaderControls()
