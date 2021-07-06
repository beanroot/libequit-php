import { ApiCall } from "./ApiCall.js";
import { Application } from "./Application.js";
export class InlineTextEdit {
    constructor(edit) {
        this.m_submitting = false;
        let internalEditor = edit.getElementsByClassName(InlineTextEdit.InternalEditorHtmlClassName);
        if (!internalEditor || 1 !== internalEditor.length) {
            throw new Error("failed to find text edit element for inline text edit");
        }
        if (!(internalEditor[0] instanceof HTMLInputElement)) {
            throw new TypeError("text edit for inline text edit is not of correct type");
        }
        let displayElement = edit.getElementsByClassName(InlineTextEdit.InternalDisplayElementHtmlClassName);
        if (!displayElement || 1 !== displayElement.length) {
            throw new Error("failed to find display element for inline text edit");
        }
        if (!(displayElement[0] instanceof HTMLSpanElement)) {
            throw new TypeError("display element for inline text edit is not of correct type");
        }
        let apiFnName = edit.dataset.apiFunctionName;
        if (undefined == apiFnName) {
            throw new Error("failed to find API function name for inlne text edit");
        }
        let apiParamName = edit.dataset.apiFunctionContentParameterName;
        if (undefined == apiParamName) {
            throw new Error("failed to find API parameter name for inline text edit");
        }
        let otherArgs = {};
        for (let paramName in edit.dataset) {
            let result = paramName.match(/^apiFunctionParameter([a-zA-Z][a-zA-Z0-9_]+)$/);
            if (!result) {
                continue;
            }
            otherArgs[result[1]] = edit.dataset[paramName];
        }
        this.container = edit;
        this.internalEditor = internalEditor[0];
        this.internalDisplay = displayElement[0];
        this.submitApiFunction = apiFnName;
        this.submitApiParameterName = apiParamName;
        this.submitApiOtherArguments = otherArgs;
        this.m_oldValue = this.value;
        // these are readonly in the interface, so we cheat to set them. it's OK, because these are interfaces we "own"
        Object.defineProperty(edit, "inlineTextEdit", this.objectDescriptor);
        Object.defineProperty(this.internalEditor, "inlineTextEdit", this.objectDescriptor);
        Object.defineProperty(this.internalDisplay, "inlineTextEdit", this.objectDescriptor);
        this.internalEditor.addEventListener("keypress", (ev) => {
            this.onKeyPress(ev);
        });
        this.internalEditor.addEventListener("keydown", (ev) => {
            this.onKeyDown(ev);
        });
        this.internalEditor.addEventListener("blur", () => {
            this.onFocusOut();
        });
        this.internalDisplay.addEventListener("click", () => {
            this.showEditor();
            this.internalEditor.focus();
        });
        this.hideEditor();
    }
    static bootstrap() {
        if (InlineTextEdit.bootstrap.hasOwnProperty("success")) {
            return InlineTextEdit.bootstrap["success"];
        }
        for (let editor of document.querySelectorAll(`.${InlineTextEdit.HtmlClassName}`)) {
            if (!(editor instanceof HTMLDivElement)) {
                console.warn("ignored invalid element type with " + InlineTextEdit.HtmlClassName + " class");
                continue;
            }
            try {
                new InlineTextEdit(editor);
            }
            catch (err) {
                console.error("failed to initialise AdvancedSearchForm " + editor + ": " + err);
            }
        }
        Object.defineProperty(InlineTextEdit.bootstrap, "success", {
            enumerable: false,
            configurable: false,
            writable: false,
            value: true,
        });
        return InlineTextEdit.bootstrap["success"];
    }
    showEditor() {
        this.internalEditor.style.display = "";
        this.internalDisplay.style.display = "none";
    }
    hideEditor() {
        this.internalEditor.style.display = "none";
        this.internalDisplay.style.display = "";
    }
    accept() {
        if (this.m_submitting) {
            return;
        }
        if (this.value == this.m_oldValue) {
            this.hideEditor();
            return;
        }
        this.submitText();
    }
    cancel() {
        this.value = this.m_oldValue;
        this.hideEditor();
    }
    syncDisplayWithEditor() {
        while (this.internalDisplay.firstChild) {
            this.internalDisplay.removeChild(this.internalDisplay.firstChild);
        }
        this.internalDisplay.appendChild(document.createTextNode(this.value));
    }
    onSubmitSucceeded(response) {
        if (0 === response.code) {
            this.m_oldValue = this.value;
            this.syncDisplayWithEditor();
            this.hideEditor();
            return;
        }
        let msg = document.createElement("div");
        msg.appendChild(document.createTextNode(response.message));
        let toast = Application.instance.toast(msg, {
            "timeout": 0,
            "closeButton": true,
            "customButtons": [
                {
                    "content": "Forget changes",
                    "fn": () => {
                        this.cancel();
                        toast.close();
                    },
                },
            ]
        });
    }
    onSubmitFailed(response) {
        let msg = document.createElement("div");
        msg.appendChild(document.createTextNode("The API call failed: " + response.message));
        let toast = Application.instance.toast(msg, {
            "timeout": 0,
            "closeButton": true,
            "customButtons": [
                {
                    "content": "Forget changes",
                    "fn": () => {
                        this.cancel();
                        toast.close();
                    },
                },
            ]
        });
    }
    submitText() {
        if (!this.submitApiFunction) {
            this.syncDisplayWithEditor();
            this.hideEditor();
        }
        this.m_submitting = true;
        let params = this.submitApiOtherArguments;
        params[this.submitApiParameterName] = this.value;
        let apiCall = new ApiCall(this.submitApiFunction, params, null, {
            "onSuccess": (response) => {
                this.onSubmitSucceeded(response);
                this.m_submitting = false;
            },
            "onFailure": (response) => {
                this.onSubmitFailed(response);
                this.m_submitting = false;
            },
        });
        apiCall.send();
    }
    onFocusOut() {
        this.accept();
    }
    onKeyPress(ev) {
        switch (ev.key) {
            case "Enter":
                this.accept();
                // remove focus now, while it will be ignored, otherwise the toast might steal focus later and trigger
                // another attempted updated after we've unset the ignore flag
                this.internalEditor.blur();
                break;
        }
    }
    onKeyDown(ev) {
        switch (ev.key) {
            case "Escape":
                this.cancel();
                break;
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
        this.syncDisplayWithEditor();
    }
    get placeholder() {
        return this.internalEditor.placeholder;
    }
    set placeholder(value) {
        this.internalEditor.placeholder = value;
    }
}
InlineTextEdit.HtmlClassName = "eq-inline-text-edit";
InlineTextEdit.InternalEditorHtmlClassName = InlineTextEdit.HtmlClassName + "-editor";
InlineTextEdit.InternalDisplayElementHtmlClassName = InlineTextEdit.HtmlClassName + "-display";
(function () {
    window.addEventListener("load", function () {
        InlineTextEdit.bootstrap();
    });
})();
//# sourceMappingURL=InlineTextEdit.js.map