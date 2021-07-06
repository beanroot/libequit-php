import { ApiCall } from "./ApiCall.js";
export class AutocompleteTextEdit {
    constructor(edit) {
        let internalEditor = edit.getElementsByClassName(AutocompleteTextEdit.InternalEditorHtmlClassName);
        if (!internalEditor || 1 !== internalEditor.length) {
            throw new Error("failed to find text edit element for autocomplete text edit");
        }
        if (!(internalEditor[0] instanceof HTMLInputElement)) {
            throw new TypeError("text edit for autocomplete text edit is not of correct type");
        }
        let suggestionsList = edit.getElementsByClassName(AutocompleteTextEdit.SuggestionsListHtmlClassName);
        if (!suggestionsList || 1 !== suggestionsList.length) {
            throw new Error("failed to find suggestions list element for autocomplete text edit");
        }
        if (!(suggestionsList[0] instanceof HTMLUListElement)) {
            throw new TypeError("suggestions list for autocomplete text edit is not of correct type");
        }
        let apiFnName = edit.dataset.apiFunctionName;
        if (undefined == apiFnName) {
            throw new Error("failed to find API function name for autocomplete text edit");
        }
        let apiParamName = edit.dataset.apiFunctionContentParameterName;
        if (undefined == apiParamName) {
            throw new Error("failed to find API parameter name for autocomplete text edit");
        }
        let otherArgs = {};
        for (let paramName in edit.dataset) {
            // noinspection JSUnfilteredForInLoop
            let result = paramName.match(/^apiFunctionParameter([a-zA-Z][a-zA-Z0-9_]+)$/);
            if (!result) {
                continue;
            }
            // noinspection JSUnfilteredForInLoop
            otherArgs[result[1]] = edit.dataset[paramName];
        }
        this.container = edit;
        this.internalEditor = internalEditor[0];
        this.suggestionsList = suggestionsList[0];
        this.suggestionsApiFunction = apiFnName;
        this.suggestionsApiParameterName = apiParamName;
        this.suggestionsApiOtherArguments = otherArgs;
        // these are readonly in the interface, so we cheat to set them. it's OK, because these are interfaces we "own"
        Object.defineProperty(edit, "autocompleteTextEdit", this.objectDescriptor);
        Object.defineProperty(this.internalEditor, "autocompleteTextEdit", this.objectDescriptor);
        Object.defineProperty(this.suggestionsList, "autocompleteTextEdit", this.objectDescriptor);
        Object.defineProperty(this.suggestionsList, "currentIndex", {
            configurable: false,
            enumerable: true,
            writable: true,
            value: -1,
        });
        if (edit.dataset.apiFunctionResponseProcessor) {
            if (!edit.dataset.apiFunctionResponseProcessor.match(/^[a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9_]$/)) {
                console.error("failed to initialise AdvancedSearchForm " + edit);
            }
            else {
                this.customResponseProcessor = new Function("responseData", "return " + edit.dataset.apiFunctionResponseProcessor + "(responseData);");
            }
        }
        this.internalEditor.addEventListener("keydown", function (ev) {
            // noinspection JSPotentiallyInvalidUsageOfClassThis (explicityly bound to suggestionItem)
            this.onKeyDown(ev);
        }.bind(this));
        this.internalEditor.addEventListener("keypress", function (ev) {
            // noinspection JSPotentiallyInvalidUsageOfClassThis (explicityly bound to suggestionItem)
            this.onKeyPress(ev);
        }.bind(this));
        this.internalEditor.addEventListener("keyup", function (ev) {
            // noinspection JSPotentiallyInvalidUsageOfClassThis (explicityly bound to this)
            this.onKeyUp(ev);
        }.bind(this));
        this.hideSuggestions();
    }
    static bootstrap() {
        if (AutocompleteTextEdit.bootstrap.hasOwnProperty("success")) {
            return AutocompleteTextEdit.bootstrap["success"];
        }
        let editors = document.getElementsByClassName(AutocompleteTextEdit.HtmlClassName);
        for (let idx = 0; idx < editors.length; ++idx) {
            if (!(editors[idx] instanceof HTMLDivElement)) {
                console.warn("ignored invalid element type with " + AutocompleteTextEdit.HtmlClassName + " class");
                continue;
            }
            try {
                new AutocompleteTextEdit(editors[idx]);
            }
            catch (err) {
                console.error("failed to initialise AdvancedSearchForm " + editors[idx]);
            }
        }
        Object.defineProperty(AutocompleteTextEdit.bootstrap, "success", {
            enumerable: false,
            configurable: false,
            writable: false,
            value: true,
        });
        return AutocompleteTextEdit.bootstrap["success"];
    }
    onKeyDown(ev) {
        switch (ev.key) {
            case "Escape":
                this.hideSuggestions();
                break;
            case " ":
                /* NOTE alt-space is sometimes swallowed by OS/browser */
                if (ev.altKey) {
                    /* alt-space opens suggestions list */
                    this.showSuggestions();
                    ev.preventDefault();
                    ev.stopPropagation();
                }
                break;
            case "ArrowUp":
                this.showSuggestions();
                this.previousSuggestion();
                ev.preventDefault();
                ev.stopPropagation();
                break;
            case "ArrowDown":
                this.showSuggestions();
                this.nextSuggestion();
                ev.preventDefault();
                ev.stopPropagation();
                break;
            case "Enter":
                if (this.suggestionsVisible()) {
                    let value = this.currentSuggestion;
                    this.currentIndex = -1;
                    this.hideSuggestions();
                    if ("undefined" != typeof value) {
                        this.value = value;
                    }
                    ev.preventDefault();
                    ev.stopPropagation();
                }
                break;
        }
    }
    onKeyPress(ev) {
        if ("Delete" === ev.key || "Backspace" === ev.key) {
            if (this.m_timerId) {
                window.clearTimeout(this.m_timerId);
                this.m_timerId = 0;
            }
        }
        if ("" === this.value) {
            this.clear();
            this.hideSuggestions();
        }
        else if (this.value !== this.m_oldValue) {
            // if user doesn't type for 0.5s, fetch suggestions
            this.m_timerId = window.setTimeout(() => {
                this.fetchSuggestions();
            }, 500);
            this.m_oldValue = this.value;
        }
    }
    onKeyUp(ev) {
        /* 8 = backspace; 46 = delete */
        if ("Delete" === ev.key || "Backspace" === ev.key) {
            //			if (8 === ev.keyCode || 46 === ev.keyCode) {
            this.onKeyPress(ev);
        }
    }
    get objectDescriptor() {
        return {
            enumerable: true,
            configurable: false,
            writable: false,
            value: this,
        };
    }
    processResponse(responseData) {
        if (this.customResponseProcessor) {
            return this.customResponseProcessor(responseData);
        }
        // default response processor
        let items = responseData.split(/\n/);
        let suggestions = [];
        for (let item of items) {
            suggestions.push({
                "value": item,
                "label": item,
            });
        }
        return suggestions;
    }
    clear() {
        while (this.suggestionsList.firstChild) {
            this.suggestionsList.removeChild(this.suggestionsList.firstChild);
        }
    }
    /**
     * Add a suggestion to the list.
     *
     * Suggestions have a value and display label. The value is what is set and displayed in the editor when the
     * suggestion is selected; the display label is what is shown in the list of suggestions. This enables context
     * to be shown in the list of suggestions to disambiguate suggestions with the same value.
     *
     * The display label is optional - if omitted, the value will be used for display in the suggestions list.
     *
     * @param value The value for the suggestion.
     * @param label The display label for the suggestion.
     */
    add(value, label) {
        let suggestionItem = document.createElement("LI");
        if (!label) {
            label = value;
        }
        let display;
        if ("string" === typeof label) {
            display = document.createTextNode(label);
        }
        else {
            display = label;
        }
        if ("object" !== typeof display || !display.nodeName) {
            console.warn("invalid display object for suggestion - using value instead");
            display = document.createTextNode(value);
        }
        suggestionItem.setAttribute("class", "autocomplete-suggestion");
        suggestionItem.appendChild(display);
        Object.defineProperty(suggestionItem, "suggestion", { "configurable": false, "enumerable": false, "writable": false, "value": value });
        Object.defineProperty(suggestionItem, "autocompleteTextEdit", this.objectDescriptor);
        this.suggestionsList.appendChild(suggestionItem);
        suggestionItem.addEventListener("click", function () {
            // noinspection JSPotentiallyInvalidUsageOfClassThis (explicityly bound to suggestionItem)
            this.autocompleteTextEdit.value = this.suggestion;
            this.autocompleteTextEdit.hideSuggestions();
        }.bind(suggestionItem));
    }
    fetchSuggestions() {
        // no API function = no suggestions
        if ("" == this.suggestionsApiFunction) {
            return;
        }
        if (0 <= this.currentIndex) {
            let item = this.suggestionsList.children[this.currentIndex];
            item.classList.remove("current");
        }
        this.currentIndex = -1;
        let self = this;
        let params = this.suggestionsApiOtherArguments;
        params[this.suggestionsApiParameterName] = this.value;
        let successFn = (response) => {
            if (0 === response.code) {
                let items = self.processResponse(response.data);
                let count = 0;
                for (let item of items) {
                    if ("object" !== typeof item || !item.value) {
                        console.warn("skipped invalid item found in API call response");
                        continue;
                    }
                    // noinspection JSPotentiallyInvalidUsageOfClassThis (explicityly bound to this)
                    this.add(item.value, item.label);
                    ++count;
                }
                if (0 === count) {
                    let item = document.createElement("LI");
                    item.setAttribute("class", "autocomplete-no-suggestions-message");
                    item.appendChild(document.createTextNode("No suggestions..."));
                    self.suggestionsList.appendChild(item);
                }
            }
            this.currentIndex = -1;
            this.showSuggestions();
        };
        this.clear();
        let apiCall = new ApiCall(this.suggestionsApiFunction, params, null, { onSuccess: successFn });
        apiCall.send();
    }
    showSuggestions() {
        this.suggestionsList.style.display = "";
    }
    hideSuggestions() {
        this.suggestionsList.style.display = "none";
    }
    suggestionsVisible() {
        return !this.suggestionsList.style.display || "" === this.suggestionsList.style.display;
    }
    get name() {
        return this.internalEditor.name;
    }
    set name(value) {
        this.internalEditor.name = value;
    }
    get value() {
        return this.internalEditor.value;
    }
    set value(val) {
        this.internalEditor.value = val;
    }
    get placeholder() {
        return this.internalEditor.placeholder;
    }
    set placeholder(value) {
        this.internalEditor.placeholder = value;
    }
    get disabled() {
        return this.internalEditor.disabled;
    }
    set disabled(val) {
        this.internalEditor.disabled = val;
    }
    get style() {
        return this.container.style;
    }
    get dataset() {
        return this.container.dataset;
    }
    get currentIndex() {
        return this.suggestionsList.currentIndex;
    }
    set currentIndex(idx) {
        if (idx === this.suggestionsList.currentIndex) {
            return;
        }
        if (-1 > idx) {
            idx = -1;
        }
        let n = this.suggestionsList.children.length;
        if (1 === n && this.suggestionsList.children[0].classList.contains("autocomplete-no-suggestions-message")) {
            n = 0;
        }
        if (idx < -1 || idx >= n) {
            console.log(`invalid index: ${idx}`);
            return;
        }
        if (0 <= this.suggestionsList.currentIndex) {
            let item = this.suggestionsList.children[this.suggestionsList.currentIndex];
            item.classList.remove("current");
        }
        this.suggestionsList.currentIndex = idx;
        if (-1 < this.suggestionsList.currentIndex) {
            let item = this.suggestionsList.children[this.suggestionsList.currentIndex];
            item.classList.add("current");
        }
        if (this.internalEditor) {
            this.syncToCurrentSuggestion();
        }
    }
    get suggestionCount() {
        return this.suggestionsList.children.length;
    }
    get currentSuggestion() {
        return this.suggestion(this.currentIndex);
    }
    nextSuggestion() {
        ++this.currentIndex;
        if (-1 < this.currentIndex && Element.prototype.scrollIntoView) {
            this.suggestionsList.children[this.currentIndex].scrollIntoView(false);
        }
    }
    previousSuggestion() {
        if (0 < this.currentIndex) {
            --this.currentIndex;
            if (-1 < this.currentIndex && Element.prototype.scrollIntoView) {
                this.suggestionsList.children[this.currentIndex].scrollIntoView(false);
            }
        }
    }
    suggestion(idx) {
        if (idx >= 0 && idx < this.suggestionsList.children.length) {
            let item = this.suggestionsList.children[idx];
            return item.suggestion;
        }
        console.warn(`invalid index: ${idx}`);
        return undefined;
    }
    syncToSuggestion(idx) {
        this.internalEditor.value = this.suggestion(idx);
    }
    syncToCurrentSuggestion() {
        this.syncToSuggestion(this.suggestionsList.currentIndex);
    }
}
AutocompleteTextEdit.HtmlClassName = "autocomplete-text-edit";
AutocompleteTextEdit.InternalEditorHtmlClassName = "autocomplete-text-edit-editor";
AutocompleteTextEdit.SuggestionsListHtmlClassName = "autocomplete-text-edit-suggestions";
(function () {
    window.addEventListener("load", function () {
        AutocompleteTextEdit.bootstrap();
    });
})();
//# sourceMappingURL=AutocompleteTextEdit.js.map