import { ApiCallResponse } from "./ApiCallResponse.js";
import { Application } from "./Application.js";
/**
 * Encapsulates a call to an API endpoint.
 *
 * At present, the API endpoint is not customisable, only the URL parameters that are provided to that API call.
 */
export class ApiCall {
    constructor(action, parameters = null, data = null, options = null) {
        this.m_xhr = new XMLHttpRequest();
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
        return this.m_parameters;
    }
    set data(data) {
        this.m_data = data;
    }
    get status() {
        return this.m_xhr.status;
    }
    get responseText() {
        return this.m_xhr.responseText;
    }
    onApiCallLoad() {
        if (!this.options) {
            return;
        }
        let response = new ApiCallResponse(this.responseText);
        console.debug(this.responseText);
        if (this.options.onFinished) {
            this.options.onFinished(response);
        }
        if (200 <= this.m_xhr.status && 299 >= this.status) {
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
        this.m_xhr.addEventListener("load", () => {
            this.onApiCallLoad();
        }, true);
        this.m_xhr.addEventListener("abort", () => {
            this.onApiCallAbort();
        }, true);
        this.m_xhr.addEventListener("error", () => {
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
            this.m_xhr.open("POST", url, true);
            this.m_xhr.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + boundary);
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
            this.m_xhr.send(body);
        }
        else {
            // ... otherwise just GET the response
            this.m_xhr.open("GET", url, true);
            this.m_xhr.send();
        }
    }
}
//# sourceMappingURL=ApiCall.js.map