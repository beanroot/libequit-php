import { ContentStructureError } from "./Application.js";
class TabbedView {
    constructor(elem) {
        this.container = null;
        this.tabSwitches = null;
        this.tabs = null;
        // could have nested TabbedView objects, so detect direct children only
        let tabSwitches = null;
        let tabs = null;
        for (let child of elem.children) {
            if (child.classList.contains(TabbedView.TabSwitchesHtmlClassName)) {
                if (tabSwitches) {
                    throw new ContentStructureError("too many tab switch containers found");
                }
                tabSwitches = child.children;
            }
            if (child.classList.contains(TabbedView.TabContentHtmlClassName)) {
                if (tabs) {
                    throw new ContentStructureError("too many tab content containers found");
                }
                tabs = child.children;
            }
        }
        if (null === tabSwitches) {
            throw new ContentStructureError("failed to locate container for tab switches");
        }
        if (null === tabs) {
            throw new ContentStructureError("failed to locate container for tab content");
        }
        this.container = elem;
        this.tabSwitches = tabSwitches;
        this.tabs = tabs;
        let onTabClicked = (ev) => {
            this.currentTab = ev.target.tabIndex;
        };
        let idx = 0;
        for (let tabSwitch of this.tabSwitches) {
            tabSwitch.tabIndex = idx;
            tabSwitch.addEventListener("click", onTabClicked);
            ++idx;
        }
        idx = 0;
        for (let tab of this.tabs) {
            tab.tabIndex = idx;
            ++idx;
        }
    }
    static initialise() {
        for (let elem of document.getElementsByClassName(TabbedView.HtmlClassName)) {
            try {
                new TabbedView(elem);
            }
            catch (err) {
                console.error("failed to initialise TabbedView " + elem + ": " + err);
            }
        }
    }
    get tabCount() {
        return Math.min(this.tabs.length, this.tabSwitches.length);
    }
    set currentTab(idx) {
        if (idx === this.currentTab) {
            return;
        }
        if (0 > idx || this.tabCount <= idx) {
            console.warn(`ignored attempt to set current tab to invalid index ${idx}`);
            return;
        }
        for (let tabSwitch of this.tabSwitches) {
            tabSwitch.classList.remove("selected");
        }
        for (let tab of this.tabs) {
            tab.classList.remove("selected");
        }
        this.tabSwitches[idx].classList.add("selected");
        this.tabs[idx].classList.add("selected");
    }
    get currentTab() {
        let n = this.tabs.length;
        for (let idx = 0; idx < n; ++idx) {
            if (this.tabs[idx].classList.contains("selected")) {
                return idx;
            }
        }
        n = this.tabSwitches.length;
        for (let idx = 0; idx < n; ++idx) {
            if (this.tabSwitches[idx].classList.contains("selected")) {
                return idx;
            }
        }
        console.warn("no current tab");
        console.warn(this.container);
        return -1;
    }
}
TabbedView.HtmlClassName = "eq-tabview";
TabbedView.TabSwitchesHtmlClassName = "eq-tabview-tabs";
TabbedView.TabContentHtmlClassName = "eq-tabview-content-container";
(function () {
    window.addEventListener("load", function () {
        TabbedView.initialise();
    });
}());
//# sourceMappingURL=TabbedView.js.map