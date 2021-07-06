import { LogicError, ContentStructureError } from "./Application.js";
import { AutocompleteTextEdit } from "./AutocompleteTextEdit.js";
function toArray(collection) {
    let n = collection.length;
    let ret = [];
    for (let idx = 0; idx < n; ++idx) {
        ret.push(collection[idx]);
    }
    return ret;
}
export class ListEdit {
    constructor(edit) {
        let findChildElement = (element, propertyName) => {
            let elems = edit.getElementsByClassName("eq-listedit-" + element);
            if (1 != elems.length) {
                console.log("invalid listedit - found != 1 eq-listedit-" + element + " child element");
                return false;
            }
            let elem = elems[0];
            // this is readonly in the interface, so we cheat to set it. it's OK, because it's an interface we "own"
            Object.defineProperty(elem, "listEdit", this.objectDescriptor);
            this[`m_${propertyName}`] = elem;
            return true;
        };
        // this is readonly in the interface, so we cheat to set it. it's OK, because it's an interface we "own"
        Object.defineProperty(edit, "listEdit", this.objectDescriptor);
        // find the child widgets and set the properties on the main edit widget
        if (!findChildElement("data", "dataWidget")) {
            throw new ContentStructureError("could not find ListEdit's data widget");
        }
        if (!findChildElement("itemedit", "textEdit")) {
            throw new ContentStructureError("could not find ListEdit's text edit widget");
        }
        if (!findChildElement("display", "displayWidget")) {
            throw new ContentStructureError("could not find ListEdit's display widget");
        }
        if (!findChildElement("add", "addButton")) {
            throw new ContentStructureError("could not find ListEdit's add button");
        }
        if (!findChildElement("remove", "removeButton")) {
            throw new ContentStructureError("could not find ListEdit's remove button");
        }
        if (!AutocompleteTextEdit) {
            throw new Error("Failed to load AutocompleteTextEdit module");
        }
        if (!this.textEdit.autocompleteTextEdit) {
            throw new Error("AutocompleteTextEdit for ListEdit " + edit + " was not initialised, ListEdit cannot be initialised");
        }
        this.m_addButton.addEventListener("click", () => {
            if (this.addItem(this.textEdit.autocompleteTextEdit.value)) {
                this.textEdit.autocompleteTextEdit.value = "";
                this.synchroniseAddButtonState();
                this.textEdit.autocompleteTextEdit.internalEditor.focus();
            }
        });
        this.m_removeButton.addEventListener("click", () => {
            let idx = this.selectedIndex;
            if (-1 < idx) {
                this.removeItem(idx);
            }
        });
        // for convenience, some properties/methods on root container are proxies for ListEdit properties/methods
        Object.defineProperty(edit, "value", {
            enumerable: true,
            configurable: false,
            get: () => { return this.value; },
            set: (val) => { this.value = val; },
        });
        Object.defineProperty(edit, "selectedIndex", {
            enumerable: true,
            configurable: false,
            get: () => { return this.selectedIndex; },
            set: (val) => { this.selectedIndex = val; },
        });
        Object.defineProperty(edit, "selectedItem", {
            enumerable: true,
            configurable: false,
            get: () => { return this.selectedItem; },
        });
        Object.defineProperty(edit, "addItem", {
            enumerable: true,
            configurable: false,
            writable: false,
            value: (item) => { this.addItem(item); },
        });
        Object.defineProperty(edit, "removeItem", {
            enumerable: true,
            configurable: false,
            writable: false,
            value: (idx) => { this.removeItem(idx); },
        });
        // add event method to keep add button in sync with (non-)empty state of text edit
        this.textEdit.autocompleteTextEdit.internalEditor.addEventListener("keyup", () => {
            this.synchroniseAddButtonState();
        });
        // for all existing displayed items, add the onClick event listener
        for (let item of toArray(this.displayWidget.children)) {
            item.addEventListener("click", (ev) => {
                this.onItemClicked(ev);
            });
        }
        // ensure the buttons are initially in the correct state
        this.synchroniseAddButtonState();
        this.synchroniseRemoveButtonState();
    }
    get objectDescriptor() {
        return {
            enumerable: true,
            configurable: false,
            writable: false,
            value: this,
        };
    }
    get value() {
        if ("" == this.dataWidget.value) {
            return [];
        }
        return this.dataWidget.value.split("\n");
    }
    set value(val) {
        this.dataWidget.value = val.join("\n");
        this.resynchroniseDisplayWidget();
        this.synchroniseRemoveButtonState();
    }
    get name() {
        return this.m_dataWidget.name;
    }
    set name(name) {
        this.m_dataWidget.name = name;
    }
    get selectedIndex() {
        for (let idx = this.displayWidget.children.length - 1; idx >= 0; --idx) {
            if (this.displayWidget.children[idx].classList.contains("selected")) {
                return idx;
            }
        }
        return -1;
    }
    set selectedIndex(idx) {
        if (idx > this.displayWidget.children.length) {
            console.error(`invalid index ${idx}`);
            return;
        }
        let currentIndex = this.selectedIndex;
        if (idx == currentIndex) {
            return;
        }
        if (-1 < currentIndex) {
            this.displayWidget.children[currentIndex].classList.remove("selected");
        }
        if (idx > -1) {
            this.displayWidget.children[idx].classList.add("selected");
        }
    }
    get selectedItem() {
        let idx = this.selectedIndex;
        if (-1 < idx) {
            return this.value[idx];
        }
        return "";
    }
    get addButton() {
        return this.m_addButton;
    }
    get removeButton() {
        return this.m_removeButton;
    }
    get dataWidget() {
        return this.m_dataWidget;
    }
    get textEdit() {
        return this.m_textEdit;
    }
    get displayWidget() {
        return this.m_displayWidget;
    }
    synchroniseAddButtonState() {
        this.addButton.disabled = ("" == this.textEdit.autocompleteTextEdit.value);
    }
    synchroniseRemoveButtonState() {
        this.removeButton.disabled = (-1 == this.selectedIndex);
    }
    addItem(item) {
        if ("" == item) {
            console.error("can't add an empty item to the list");
            return false;
        }
        if ("" == this.dataWidget.value) {
            this.dataWidget.value = item;
        }
        else {
            this.dataWidget.value += "\n" + item;
        }
        this.addItemToDisplayWidget(item);
        return true;
    }
    removeItem(idx) {
        let isInt = function (val) {
            if (isNaN(val)) {
                return false;
            }
            let floatVal = parseFloat(`${val}`);
            return (floatVal | 0) === floatVal;
        };
        if (!isInt(idx)) {
            console.error(`invalid index ${idx}`);
            return false;
        }
        if (0 > idx || this.value.length <= idx) {
            console.error(`invalid index ${idx}`);
            return false;
        }
        let selectedIndex = this.selectedIndex;
        this.displayWidget.removeChild(this.displayWidget.children[idx]);
        let arr = this.value;
        arr.splice(idx, 1);
        this.dataWidget.value = arr.join("\n");
        if (idx == selectedIndex) {
            if (selectedIndex >= this.value.length) {
                --selectedIndex;
            }
            if (0 <= selectedIndex) {
                this.selectedIndex = selectedIndex;
            }
        }
        this.synchroniseRemoveButtonState();
        return true;
    }
    onItemClicked(ev) {
        let clickedItem = ev.target;
        if (clickedItem.classList.contains("selected")) {
            clickedItem.classList.remove("selected");
            this.synchroniseRemoveButtonState();
            return;
        }
        let ul = clickedItem.parentElement;
        for (let itemElement of toArray(ul.children)) {
            itemElement.classList.remove("selected");
        }
        clickedItem.classList.add("selected");
        this.synchroniseRemoveButtonState();
    }
    /* internal method used whenever an item needs to be added to the
     * display widget */
    addItemToDisplayWidget(itemValue) {
        let addedItem = document.createElement("LI");
        /* ensure that the <li> height is not 0 when an empty item is added
         * (ensuring that empty items can be selected and therefore removed) */
        // \u00a0 is &nbsp;
        itemValue = itemValue || "\u00a0";
        addedItem.appendChild(document.createTextNode(itemValue));
        addedItem.addEventListener("click", (ev) => {
            this.onItemClicked(ev);
        });
        this.displayWidget.appendChild(addedItem);
    }
    /* clear the display and reinitialise it with the current items in
     * the data widget */
    resynchroniseDisplayWidget() {
        while (this.displayWidget.firstChild) {
            this.displayWidget.removeChild(this.displayWidget.firstChild);
        }
        this.value.forEach((v) => { this.addItemToDisplayWidget(v); });
    }
    static bootstrap() {
        if (ListEdit.bootstrap.hasOwnProperty("done")) {
            throw new LogicError("can't bootstrap ListEdit objects more than once");
        }
        Object.defineProperty(ListEdit.bootstrap, "done", {
            enumerable: false,
            configurable: false,
            writable: false,
            value: true,
        });
        let edits = document.getElementsByClassName("eq-listedit");
        for (let edit of toArray(edits)) {
            if (!(edit instanceof HTMLElement)) {
                console.log("skipped non-HTMLElement: " + edit);
                continue;
            }
            try {
                new ListEdit(edit);
            }
            catch (err) {
                console.error("failed to initialise ListEdit " + edit + ": " + err);
            }
        }
    }
}
(function (window) {
    /* find and initialise all ListEdit objects once the page has
     * fully loaded */
    window.addEventListener("load", function () {
        ListEdit.bootstrap();
    });
})(window);
//# sourceMappingURL=ListEdit.js.map