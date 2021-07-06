export class Popup {
    constructor(container) {
        this.m_popupIsVisible = false;
        this.m_container = null;
        this.m_anchor = null;
        this.m_content = null;
        if (!container.dataset.triggers) {
            throw new Error("failed to find required data attribute 'triggers'");
        }
        let anchorElements = container.getElementsByClassName(Popup.AnchorHtmlClassName);
        if (!anchorElements || 1 !== anchorElements.length || !(anchorElements[0] instanceof HTMLElement)) {
            throw new Error("failed to find popup's anchor element");
        }
        let contentElements = container.getElementsByClassName(Popup.ContentHtmlClassName);
        if (!contentElements || 1 !== contentElements.length || !(contentElements[0] instanceof HTMLElement)) {
            throw new Error("failed to find popup's content element");
        }
        this.m_container = container;
        this.m_anchor = anchorElements[0];
        this.m_content = contentElements[0];
        let descriptor = {
            enumerable: true,
            writable: false,
            configurable: false,
            value: this,
        };
        Object.defineProperty(container, "popup", descriptor);
        Object.defineProperty(this.m_anchor, "popup", descriptor);
        Object.defineProperty(this.m_content, "popup", descriptor);
        // extract and validate the triggers
        let triggers = container.dataset.triggers.split("|").filter(function (val) {
            return -1 !== Popup.ValidTriggers.indexOf(val);
        });
        // set to default if no valid triggers found
        if (0 === triggers.length) {
            triggers = [Popup.DefaultTrigger];
        }
        if (-1 !== triggers.indexOf("click")) {
            this.m_anchor.addEventListener("click", () => {
                this.togglePopup();
            });
        }
        if (-1 !== triggers.indexOf("hover")) {
            container.addEventListener("mouseover", () => {
                this.showPopup();
            });
            container.addEventListener("mouseout", () => {
                this.hidePopup();
            });
        }
        this.hidePopup();
    }
    static initialise() {
        for (let popup of document.getElementsByClassName(Popup.HtmlClassName)) {
            if (!(popup instanceof HTMLElement)) {
                continue;
            }
            new Popup(popup);
        }
    }
    togglePopup() {
        if (this.popupIsVisible) {
            this.hidePopup();
        }
        else {
            this.showPopup();
        }
    }
    showPopup() {
        this.m_content.classList.add("visible");
        this.m_popupIsVisible = true;
    }
    hidePopup() {
        this.m_content.classList.remove("visible");
        this.m_popupIsVisible = false;
    }
    get popupIsVisible() {
        return this.m_popupIsVisible;
    }
}
Popup.HtmlClassName = "equit-popup";
Popup.AnchorHtmlClassName = "popup-anchor";
Popup.ContentHtmlClassName = "popup-content";
Popup.ValidTriggers = ["click", "hover"];
Popup.DefaultTrigger = "click";
(function () {
    window.addEventListener("load", function () {
        Popup.initialise();
    });
})();
//# sourceMappingURL=Popup.js.map