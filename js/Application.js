import { ApiCallResponse } from "./ApiCallResponse.js";
export class LogicError extends Error {
}
export class InvalidArgumentError extends Error {
}
export class OutOfBoundsError extends Error {
}
export class ContentStructureError extends Error {
}
export class Application {
    constructor() {
        this.baseUrl = "";
        if (Application.m_instance) {
            throw new LogicError("An Application instance already exists and Application is a singleton.");
        }
        Application.m_instance = this;
    }
    static get instance() {
        return Application.m_instance;
    }
    /**
     * Present a pop-up message to the user on the current page.
     *
     * The provided content is added to the page and removed after a timeout. The message and its container are
     * appended to the end of the document body. If the content is a plain string, It is embedded in a <div> element
     * with the class toast. Each linefeed in the string is interpreted as the beginning of a new paragraph (i.e.
     * separate lines are wrapped in <p> elements). The text content is inserted as a text node using
     * _document.createTextNode_, so there is no need to escape the content.
     *
     * The toast goes through several stages that allow CSS transitions to be applied, making the appearance and
     * disappearance less jarring. When first created, the toast has the "appearing" class. Immediately after it is
     * added to the DOM tree, the "appearing" class is removed. After the timeout the "disappearing" class is added.
     * 1 second after that class is added, the toast element is removed from the DOM tree, at which point it no
     * longer exists and will not be visible. Stylesheets can use these classes to style the different phases of the
     * toast for example to fade in and out the toast.
     *
     * The following options are available:
     * - timeout: the timeout, in ms, for the toast
     * - closeButton: boolean indicating whether the toast should have a close button. The close button enables the
     *   user to close the toast early
     * - customButtons: array of ToastCustomButton objects defining custom buttons to show in the toast. Each object
     *   must have both _content_ and _fn_ properties. Content can be either a DOM HTMLElement or a plain string; fn
     *   is a callback that is called when the generated button is clicked.
     *
     * This function returns immediately, it does not wait until the toast has finished displaying. The created
     * toast is entirely self-managing.
     *
     * @param content HTMLElement|string The message to show. This can be a DOM HTMLElement or a plain string
     * @param options ToastOptions Optional options controlling how the toast operates.
     */
    toast(content, options = {}) {
        // for backward compatibility with old code - signature used to be toast(content, timeout)
        if ("number" == typeof options) {
            console.warn("passing timeout as argument to toast() is deprecated - pass an object with a timeout property instead");
            options = { "timeout": options };
        }
        let toastContainer = document.createElement("DIV");
        toastContainer.classList.add("toast", "appearing");
        Object.defineProperty(toastContainer, "close", {
            enumerable: true,
            configurable: false,
            writable: false,
            value: function () {
                toastContainer.dispatchEvent(new Event("close"));
                toastContainer.classList.add("disappearing");
                window.setTimeout(function () {
                    toastContainer.parentNode.removeChild(toastContainer);
                }, 1000);
            },
        });
        let toastContent;
        if ("string" === typeof content) {
            content = content.split("\n");
            toastContent = document.createElement("DIV");
            for (let i = 0; i < content.length; ++i) {
                let par = toastContent.appendChild(document.createElement("P"));
                par.appendChild(document.createTextNode(content[i]));
            }
        }
        else {
            toastContent = content;
        }
        Object.defineProperty(toastContent, "toast", { enumerable: true, configurable: false, writable: false, value: toastContainer });
        toastContainer.appendChild(toastContent);
        if ("number" !== typeof options.timeout || 0 > options.timeout) {
            options.timeout = Application.DefaultToastTimeout;
        }
        let controls = [];
        let createPushButton = function (buttonContent, fn) {
            let button = document.createElement("A");
            button.classList.add("pushbutton");
            if ("string" === typeof buttonContent) {
                buttonContent = document.createTextNode(buttonContent);
            }
            button.appendChild(buttonContent);
            button.addEventListener("click", fn);
            Object.defineProperty(button, "toast", {
                configurable: false,
                enumerable: true,
                writable: false,
                value: toastContainer,
            });
            return button;
        };
        if (options.closeButton) {
            controls.push(createPushButton("Close", function () {
                toastContainer.close();
            }));
        }
        if (options.customButtons) {
            for (let i = 0; i < options.customButtons.length; ++i) {
                controls.push(createPushButton(options.customButtons[i].content, options.customButtons[i].fn));
            }
        }
        if (0 < controls.length) {
            let ul = toastContainer.appendChild(document.createElement("UL"));
            ul.classList.add("pushbutton-group", "horizontal");
            for (let i = 0; i < controls.length; ++i) {
                let li = ul.appendChild(document.createElement("LI"));
                li.appendChild(controls[i]);
            }
        }
        document.body.appendChild(toastContainer);
        // After specified timeout, the "disappearing" class is added to the toast container. This can be used in CSS to
        // style a finished toast. One second after this, the toast element is removed from the DOM tree. This delay
        // allows CSS3 transitions some time to operate to add some bling to the removal. If no bling is required, just
        // style a finished toast with an opacity of 0 and a z-index below everything else on the page.
        window.setTimeout(function () {
            toastContainer.classList.remove("appearing");
            if (0 < options.timeout) {
                window.setTimeout(toastContainer.close, options.timeout);
            }
        }, 0);
        return toastContainer;
    }
    /**
     * Search for elements within a parent element that have the specified class as one of their classes.
     *
     * This is a pseudo polyfill for _element_.getElementsByClassName(). It is recommended that you use that
     * method for finding child elements by class name if it is available.
     *
     * The search is recursive, so it will return elements with the class name regardless of how far they are
     * embedded in the DOM branch that starts at _root_
     *
     * NOTE the MDS documentation for getElementsByClassName() suggests that method works the same way as this
     * function, but results in Chrome 29 don't appear to agree.
     *
     * @param root Element The root element within which to look for elements.
     * @param className string The class name to look for on child elements.
     *
     * @deprecated Use document.getElementsByClassName() instead.
     */
    static findElementsWithClass(root, className) {
        let ret = [];
        if (!root) {
            return ret;
        }
        if (root.classList) {
            for (let i = 0; i < root.children.length; ++i) {
                if (root.children[i].classList.contains(className)) {
                    ret.push(root.children[i]);
                }
                let children = Application.findElementsWithClass(root.children[i], className);
                for (let j = 0; j < children.length; ++j) {
                    ret.push(children[j]);
                }
            }
        }
        else {
            let rx = new RegExp("\\b" + className + "\\b");
            for (let i = 0; i < root.children.length; ++i) {
                if (root.children[i].className.match(rx)) {
                    ret.push(root.children[i]);
                }
                let children = Application.findElementsWithClass(root.children[i], className);
                for (let j = 0; j < children.length; ++j) {
                    ret.push(children[j]);
                }
            }
        }
        return ret;
    }
    /**
     *
     * @param object
     * @param event
     * @param callback
     * @param capture
     *
     * @deprecated use Object.addEventListener() instead.
     */
    static bindEvent(object, event, callback, capture = false) {
        if (object.addEventListener) {
            object.addEventListener(event, callback, capture);
            return true;
        }
        else if (object.attachEvent) {
            object.attachEvent(event, callback);
            return true;
        }
        return false;
    }
    openUrl(action, parameters, flags) {
        let url = this.baseUrl + "?action=" + encodeURIComponent(action);
        if ("object" == typeof parameters) {
            for (let pName in parameters) {
                if (!parameters.hasOwnProperty(pName)) {
                    continue;
                }
                url += "&" + encodeURIComponent(pName) + "=" + encodeURIComponent(parameters[pName]);
            }
        }
        if ("number" == (typeof flags) && (flags & Application.NewWindowFlag)) {
            window.open(url);
        }
        else {
            window.location.href = url;
        }
    }
    createValidationReportElement(report) {
        let container = document.createElement("DIV");
        container.classList.add("validation-report");
        let createHeading = function (txt) {
            let hdr = document.createElement("H3");
            hdr.appendChild(document.createTextNode(txt));
            return hdr;
        };
        let createSection = function (heading, items) {
            let container = document.createElement("DIV");
            container.classList.add("report-section");
            container.appendChild(createHeading(heading));
            let listElement = container.appendChild(document.createElement("UL"));
            listElement.classList.add("report-list");
            for (let fieldName in items) {
                if (!items.hasOwnProperty(fieldName)) {
                    continue;
                }
                for (let msg of items[fieldName]) {
                    listElement.appendChild(document.createElement("LI")).appendChild(document.createTextNode(msg));
                }
            }
            return container;
        };
        if (report.errors && 0 < Object.getOwnPropertyNames(report.errors).length) {
            container.appendChild(createSection("Errors", report.errors));
        }
        if (report.warnings && 0 < Object.getOwnPropertyNames(report.warnings).length) {
            container.appendChild(createSection("Warnings", report.warnings));
        }
        return container;
    }
    /**
     * @deprecated Use ApiCall object instead.
     *
     * @param action string The API call action.
     * @param parameters object The URL parameters for the API call.
     * @param data object The POST data for the API call.
     * @param options object The API call options.
     */
    doApiCall(action, parameters = null, data = null, options = null) {
        let call = new ApiCall(action, parameters, data, options);
        call.send();
    }
}
// this is temporarily forced to aio.php while migrating to ts
Application.baseUrl = "aio.php";
Application.DefaultToastTimeout = 2500;
Application.NewWindowFlag = 0x01;
Application.m_instance = null;
/**
 * Encapsulates a call to an API endpoint.
 */
export class ApiCall extends XMLHttpRequest {
    constructor(action, parameters = null, data = null, options = null) {
        super();
        this.m_action = action;
        this.m_parameters = parameters;
        this.m_data = data;
        this.m_options = options;
    }
    get action() {
        return this.m_action;
    }
    set action(action) {
        if ("" == action) {
            throw new TypeError("action must not be empty");
        }
        this.m_action = action;
    }
    get options() {
        return this.m_options;
    }
    set options(options) {
        this.m_options = options;
    }
    get parameters() {
        return this.m_parameters;
    }
    set parameters(parameters) {
        this.m_parameters = parameters;
    }
    get data() {
        return this.m_data;
    }
    set data(data) {
        this.m_data = data;
    }
    onApiCallLoad() {
        if (!this.options) {
            return;
        }
        let response = new ApiCallResponse(this.responseText);
        if (this.options.onFinished) {
            this.options.onFinished(response);
        }
        if (200 <= this.status && 299 >= this.status) {
            if (this.options.onSuccess) {
                this.options.onSuccess(response);
            }
        }
        else if (this.options.onFailure) {
            this.options.onFailure(response);
        }
    }
    onApiCallAbort() {
        if (this.options && this.options.onAbort) {
            this.options.onAbort();
        }
    }
    onApiCallError() {
        if (!this.options) {
            return;
        }
        let response = new ApiCallResponse(this.responseText);
        if (this.options && this.options.onFinished) {
            this.options.onFinished(response);
        }
        if (this.options && this.options.onFailure) {
            this.options.onFailure(response);
        }
    }
    send() {
        let url = Application.instance.baseUrl + "?action=" + encodeURIComponent(this.action);
        this.addEventListener("load", () => {
            this.onApiCallLoad();
        }, true);
        this.addEventListener("abort", () => {
            this.onApiCallAbort();
        }, true);
        this.addEventListener("error", () => {
            this.onApiCallError();
        }, true);
        if (this.parameters) {
            for (let pName in this.parameters) {
                if (!this.parameters.hasOwnProperty(pName)) {
                    continue;
                }
                url += "&" + encodeURIComponent(pName) + "=" + encodeURIComponent(this.parameters[pName]);
            }
        }
        // if we have data, POST it ...
        if (this.data) {
            let body = "";
            let boundary = "-o-o-o-bndy" + Date.now().toString(16) + "-o-o-o-";
            this.open("POST", url, true);
            this.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + boundary);
            for (let dName in this.data) {
                if (!this.data.hasOwnProperty(dName)) {
                    continue;
                }
                /* if the data is an array, send each element with the same name */
                let actualData = this.data[dName];
                if (!Array.isArray(actualData)) {
                    actualData = [actualData];
                }
                actualData.forEach(function (v) {
                    body += "--" + boundary + "\r\nContent-Type: text/plain\r\nContent-Disposition: form-data; name=\"" + dName + "\"\r\n\r\n" + v + "\r\n";
                });
            }
            body += "--" + boundary + "--\r\n";
            super.send(body);
        }
        else {
            // ... otherwise just GET the response
            this.open("GET", url, true);
            super.send();
        }
    }
}
(function () {
    // create a stub for the console object if it's not available
    if (!window.console) {
        Object.defineProperty(window, "console", {
            enumerable: true,
            configurable: false,
            writable: false,
            value: {
                log: function (msg) { },
                error: function (msg) { },
                warn: function (msg) { },
            },
        });
    }
    // minimal polyfill for reading _HTMLElement.dataset_
    //
    // - Does not update if more "data-" attrs are added;
    // - Only contains the data that were present in original HTML or were added before the first use of .dataset
    if (!HTMLElement.prototype.hasOwnProperty("dataset")) {
        let descriptor = {
            enumerable: true,
            configurable: false,
            get: function () {
                if (!this.xDatasetReadDone) {
                    let data = {};
                    if (this.hasAttributes()) {
                        let attrs = this.attributes;
                        for (let i = attrs.length - 1; i >= 0; --i) {
                            if ("data-" === attrs[i].name.substr(0, 5)) {
                                data[attrs[i].name.substr(5)] = attrs[i].value;
                            }
                        }
                    }
                    Object.defineProperty(this, "xDatasetReadDone", { enumerable: false, writable: false, configurable: false, value: true });
                    Object.defineProperty(this, "xDataset", { enumerable: false, writable: false, configurable: false, value: data });
                }
                return this.xDataset;
            }
        };
        Object.defineProperty(HTMLElement.prototype, "dataset", descriptor);
    }
    /**
     * Apply a function as a polyfill for a static method (if the method does not already exist).
     *
     * @param classObject The class object to which to polyfill the static method.
     * @param methodName string The name of the methd to polyfill.
     * @param fn The function to use for the polyfill.
     */
    function applyStaticPolyfill(classObject, methodName, fn) {
        if (!classObject.hasOwnProperty(methodName)) {
            Object.defineProperty(classObject, methodName, {
                enumerable: true,
                configurable: false,
                writable: false,
                value: fn,
            });
        }
    }
    /**
     * Apply a function as a polyfill for a method (if the method does not already exist).
     *
     * @param classObject The class object to which to polyfill the method.
     * @param methodName string The name of the methd to polyfill.
     * @param fn The function to use for the polyfill.
     */
    function applyPolyfill(classObject, methodName, fn) {
        applyStaticPolyfill(classObject.prototype, methodName, fn);
    }
    /**
     * Array.indexOf() is missing in IE 6, 7, 8
     *
     * slightly modified from Mozilla, May 2014
     */
    applyPolyfill(Array, "indexOf", function (value, fromIndex) {
        if (undefined === this || null === this) {
            throw new TypeError("method invoked on null or undefined 'array'");
        }
        let len = this.length >>> 0; // Hack to convert object.length to a UInt32
        fromIndex = +fromIndex || 0;
        if (Math.abs(fromIndex) === Infinity) {
            fromIndex = 0;
        }
        if (0 > fromIndex) {
            fromIndex += len;
            if (0 > fromIndex) {
                fromIndex = 0;
            }
        }
        for (; fromIndex < len; ++fromIndex) {
            if (value === this[fromIndex]) {
                return fromIndex;
            }
        }
        return -1;
    });
    applyStaticPolyfill(Array, "isArray", function (arr) {
        return (arr instanceof Array);
    });
    applyPolyfill(Array, "contains", function (value) {
        return -1 !== this.indexOf(value);
    });
    applyStaticPolyfill(Number, "isFinite", function (value) {
        return "number" === (typeof value) && isFinite(value);
    });
    applyStaticPolyfill(Number, "isNaN", function (value) {
        return "number" === (typeof value) && isNaN(value);
    });
    applyStaticPolyfill(Number, "isInteger", function (value) {
        return "number" === (typeof value) && isFinite(value) && Math.floor(value) === value;
    });
    applyStaticPolyfill(Number, "parseInt", parseInt);
    applyStaticPolyfill(Number, "parseFloat", parseFloat);
})();
//# sourceMappingURL=Application.js.map