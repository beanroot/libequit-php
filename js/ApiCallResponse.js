export class ApiCallResponse {
    constructor(responseBody) {
        this.code = NaN;
        this.message = "";
        this.data = "";
        let lines = responseBody.split("\n");
        let codeLine = lines[0].match(/^([0-9]+)(?: (.*))?$/);
        if (!codeLine || 3 !== codeLine.length) {
            console.warn("invalid response: first line must contain response code and optional message");
            return;
        }
        this.code = parseInt(codeLine[1]);
        this.message = codeLine[2];
        if ("string" !== typeof this.message) {
            this.message = "";
        }
        lines.shift();
        this.data = lines.join("\n");
    }
    isValid() {
        return !isNaN(this.code);
    }
}
//# sourceMappingURL=ApiCallResponse.js.map