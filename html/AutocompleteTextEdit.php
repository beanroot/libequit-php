<?php

/**
* Defines the AutocompleteTextEdit class.
*
* ### Dependencies
* - Equit\AppLog
* - Equit\TextEdit
*
* ### Changes
* - (May 2017) Updated documentation. API function parameter name now
*   has a default value and setAutocompleteApiFunction() can now be
*   called without one.
* - (May 2014) First version of this file.
*
* @file AutocompleteTextEdit.php
* @author Darren Edale
* @version 1.1.2
* @date Jan 2018
* @package libequit
*/

namespace Equit\Html;

use Equit\AppLog;

/**
 * A text edit widget that can provide suggestions for auto-completion.
 *
 * This works much like a normal single-line text edit, but it can provide suggestions based on the user's current
 * input. Suggestions are retrieved using an API function provided by the application. This is set using the
 * _setAutocompleteApiFunction()_ method. When the user pauses typing for a given duration, the API function is called
 * and the results are used to display suggestions. The suggestions appear in a pop-up section immediately below the
 * text input box. The user can click on a suggestion to place it in the text input box, or can navigate the suggestions
 * using the up and down arrow keys, and the return or enter key to select a suggestion. The _escape_ key closes the
 * list of suggestions. _Alt + space_ will open it, but some OSes and/or browsers will intercept this keystroke and not
 * pass it to the widget.
 *
 * The text box hints to the browser that the browser's built-in autocomplete features should be disabled. This helps
 * ensure that the pop-up list of API-generated suggestions is not obfuscated by the browser's own.
 *
 *
 *
 * The API function is called using the _Application.doApiCall()_ javascript method, and should provide a standard API
 * response. If the response code is 0, the response data is expected to be a list of suggestions separated by linefeeds
 * (i.e. one suggestion per line). It should accept one argument which will be provided as an URL parameter, and whose
 * value will be the content of the text input box. The name can be set to whatever named URL parameter the API function
 * is expecting. It should be set with the _setAutocompleteApiFunction()_ method.
 *
 * Instances of this class can only use the single-line types, and cannot use the _Password_ type.
 *
 * Objects of this class depend on runtime javascript code which must be included in the HTML page for any page that
 * uses one. The URL for this script is provided by the _runtimeScriptUrl()_ method. You should add this to your page,
 * using _Page::addScriptUrl()_ (assuming you are using the built-in LibEquit\Page class to build the HTML page).
 *
 * ### Actions
 * This module does not support any actions.
 *
 * ### API Functions
 * This module does not provide any AIO API functions.
 *
 * ### Events
 * This module does not emit any events.
 *
 * ### Connections
 * This module does not connect to any events.
 *
 * ### Settings
 * This module does not read any settings.
 *
 * ### Session Data
 * This module does not create a session context.
 *
 * @actions _None_
 * @aio-api _None_
 * @events _None_
 * @connections _None_
 * @settings _None_
 * @session _None_
 *
 * @class AutocompleteTextEdit
 * @author Darren Edale
 * @package libequit
 */
class AutocompleteTextEdit extends TextEdit {
	/** @var string The name of the API function that will provide suggestions. */
	private $m_apiFn = null;

	/** @var string The name of the URL parameter that will provide the user's input to the API function. */
	private $m_apiParamName = "value";

	/** @var array The other arguments to provide to the API function. */
	private $m_otherArgs = [];

	/** @var string|null The runtime js callable that will process the results of the API call and provide content
	 * for the suggestions list.
	 */
	private $m_resultProcessor = null;

	/**
	 * Create a new text edit widget.
	 *
	 * By default, a widget with no ID is created.
	 *
	 * @param $type int _optional_ The type of widget to create.
	 * @param $id string _optional_ The ID of the text edit widget.
	 */
	public function __construct(int $type = TextEdit::SingleLine, ?string $id = null) {
		parent::__construct($type, $id);
	}

	/** Set the type of the autocomplete text edit widget.
	 *
	 * The type must be one of SingleLine, Email, Url or Search. Anything else is considered an error. Specifically,
	 * autocomplete edits cannot be _Password_ or _MultiLine_ types.
	 *
	 * @param $type int The widget type.
	 *
	 * @return bool _true_ if the type was set, _false_ otherwise.
	 */
	public function setType(int $type): bool {
		if($type == self::SingleLine || $type == self::Email || $type == self::Url || $type == self::Search) {
			return parent::setType($type);
		}

		AppLog::error("invalid type", __FILE__, __LINE__, __FUNCTION__);
		return false;
	}

	/**
	 * Set the API call that the text edit uses to fetch suggestions.
	 *
	 * If **$parameterName** is not given, or is _null_, the current parameter name will be retained. It is initially
	 * set to "value".
	 *
	 * The API function will be called repeatedly as the user types to fetch suggestions for what the user might be
	 * typing. The API call will be provided with one URL parameter, named with the given parameter name, which will
	 * receive the current value of the text edit.
	 *
	 * The API function will be called using the _Application.doApiCall()_ function. The function is expected to provide
	 * a list of options in the response body, one per line.
	 *
	 * @param $fn string The name of the API function.
	 * @param $contentParameterName string _optional_ The name of the URL parameter to use to provide the user's
	 * current input to the API function.
	 * @param $otherArgs array _optional_ An associative array (_string_ => _string_) of other parameters for the
	 * API function call. Keys must start with an alpha char and be composed entirely of alphanumeric chars and
	 * underscores.
	 *
	 * @return bool _true_ if the API function was set successfully, _false_ otherwise.
	 */
	public function setAutocompleteApiCall(string $fn, ?string $contentParameterName = null, array $otherArgs = []): bool {
		$isValidName = function(string $name) {
			return false !== preg_match("/^[a-z][a-z0-9-_]+$/i", $name);
		};

		$doName = isset($contentParameterName);

		if($doName && !$isValidName($contentParameterName)) {
			AppLog::error("invalid API function parameter name", __FILE__, __LINE__, __FUNCTION__);
			return false;
		}

		foreach($otherArgs as $key => $value) {
			if(!is_string($key)) {
				AppLog::error("invalid additional API function call parameter name", __FILE__, __LINE__, __FUNCTION__);
				return false;
			}

			if(!$isValidName($key)) {
				AppLog::error("invalid additional API function call parameter name \"$key\"", __FILE__, __LINE__, __FUNCTION__);
				return false;
			}

			if((!isset($value) && !is_string($value))) {
				AppLog::error("invalid additional API function call argument for parameter \"$key\"", __FILE__, __LINE__, __FUNCTION__);
				return false;
			}
		}

		$this->m_apiFn = $fn;

		if($doName) {
			$this->m_apiParamName = $contentParameterName;
		}

		$this->m_otherArgs = $otherArgs;

		return true;
	}

	/**
	 * @param string|null $fn The runtime callable that will process the result of the API call for the edit.
	 *
	 * The callable must understand the output of the API function call that returns the suggestions and must
	 * produce a js array of objects with the following properties:
	 * - value: `string` the value that the suggestion represents. This is the value that will be placed in the editor if the
	 *   user selects the suggestion.
	 * - display: `string|DOM object` the content to display. This is the content that will appear in the
	 *   suggestions list for the suggestion.
	 *
	 * It is recommended that the value and display don't diverge too much. The intention in separating them is to
	 * provide the ability to annotate suggestions where appropriate.
	 *
	 * @return bool `true` if the processor was set, `false`  if not.
	 */
	public function setAutocompleteApiResultProcessor(?string $fn): bool {
		// TODO how can this be validated?
		$this->m_resultProcessor = $fn;
		return true;
	}

	/**
	 * Fetch the URLs of the runtime support javascript modules.
	 *
	 * @return array[string] The support javascript URLs.
	 */
	public static function runtimeScriptUrls(): array {
		/** @noinspection SpellCheckingInspection */
		return ["js/AutocompleteTextEdit.js"];
//		return ["js/autocompletetextedit.js"];
	}

	/**
	 * Generate the HTML for the widget.
	 *
	 * This method generates UTF-8 encoded XHTML5.
	 *
	 * @return string The HTML.
	 */
	public function html(): string {
		$classNames = $this->classNames();
		$id         = $this->id();

		if(empty($id)) {
			$id = self::generateUid();
		}

		$hasClass = is_array($classNames) && in_array("autocomplete-text-edit", $classNames);

		if(!$hasClass) {
			$this->addClassName("autocomplete-text-edit");
		}

		$apiFn        = html($this->m_apiFn ?? "");
		$apiParamName = html($this->m_apiParamName ?? "");
		$classNames   = $this->classNamesString();
		$placeholder  = $this->placeholder();
		$name         = $this->name();
		$value        = $this->text();
		$tt           = $this->tooltip();

		$ret = "<div id=\"" . html($id) . "\" class=\"" . html($classNames) . "\" data-api-function-name=\"$apiFn\" data-api-function-content-parameter-name=\"$apiParamName\"";

		foreach($this->m_otherArgs as $paramName => $paramValue) {
			$ret .= " data-api-function-parameter-" . html($paramName) . "=\"" . html($paramValue) . "\"";
		}

		if(isset($this->m_resultProcessor)) {
			$ret .= " data-api-function-response-processor=\"" . html($this->m_resultProcessor) . "\"";
		}

		$ret .= "><input class=\"autocomplete-text-edit-editor\" type=\"";

		switch($this->type()) {
			/* type = MultiLine and type=Password are not supported with autocomplete
			 * edits */
			default:
			case TextEdit::SingleLine:
				$ret .= "text";
				break;

			case TextEdit::Email:
				$ret .= "email";
				break;

			case TextEdit::Url:
				$ret .= "url";
				break;

			case TextEdit::Search:
				$ret .= "search";
				break;
		}

		// hint the browser not to do its own auto-completion
		$ret .= "\" autocomplete=\"off\" ";

		if(!empty($placeholder)) {
			$ret .= "placeholder=\"" . html($placeholder) . "\" ";
		}

		if(!empty($name)) {
			$ret .= "name=\"" . html($name) . "\" ";
		}

		if(!empty($value)) {
			$ret .= "value=\"" . html($value) . "\" ";
		}

		if(!empty($tt)) {
			$ret .= "title=\"" . html($tt) . "\" ";
		}

		$ret .= "/><ul class=\"autocomplete-text-edit-suggestions\"></ul></div>";

		if(!$hasClass) {
			$this->removeClassName("autocomplete-text-edit");
		}

		return $ret;
	}
}