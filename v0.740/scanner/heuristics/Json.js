/**
 * Copyright 2011 Google Inc. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 *  
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
DOMSnitch.Heuristics.Json = function() {
  document.addEventListener("Eval", this._handleEval.bind(this), true);
  this._htmlElem = document.documentElement;
}

DOMSnitch.Heuristics.Json.prototype = {
  _checkJsonValidity: function(recordInfo) {
    if(!recordInfo.jsData) {
      return;
    }
    
    var code = 0; // None
    var notes = "";
   
    var jsData = recordInfo.jsData;
    var canParse = true;
    var hasCode = false;
    
    if(jsData[0] == "(" && jsData[jsData.length - 1] == ")") {
      jsData = jsData.substring(1, jsData.length - 1);
    }

    //var seemsJSON = /^\{.+\}$/.test(jsData) || /^\[.+\]$/.test(jsData);
    //seemsJSON = /this\.[\w_\s]+=['"\w\s]+;/.test(jsData) ? false : seemsJSON;

    if(this._isJson(jsData)) {
      try {
        JSON.parse(jsData);
      } catch (e) {
        canParse = false;
      }
      
      jsData = jsData.replace(/,\]/g, ",null]");
      jsData = jsData.replace(/\[,/g, "[null,");
      jsData = jsData.replace(/,,/g, ",null,");
      jsData = jsData.replace(/,,/g, ",null,");
      jsData = jsData.replace(/{([\w_]+):/g, "{\"$1\":");
      jsData = jsData.replace(/,([\w_]+):/g, ",\"$1\":");
      jsData = jsData.replace(/'(\w+)'/g, "\"$1\"");
      
      try {
        JSON.parse(jsData);
      } catch (e) {
        hasCode = true;
      }

      if(!canParse) {
        code = 2; // Medium
        notes += "Malformed JSON object.\n";
      }
      
      if(!canParse && hasCode) {
        code = 3; // High
        notes += "Found code in JSON object.\n";
      }
    }
    
    if(code > 1) {
      var data = "JSON object:\n" + recordInfo.jsData;
      var record = {
        documentUrl: location.href,
        type: recordInfo.type,
        data: data,
        callStack: [],
        gid: recordInfo.globalId,
        env: {
          location: document.location.href,
          referrer: document.referrer
        },
        scanInfo: {code: code, notes: notes}
      };
                        
      this._report(record);
    }    
  },
  
  _handleEval: function(event) {
    var args = JSON.parse(this._htmlElem.getAttribute("evalArgs"));
    var code = args[0];
    var globalId = this._htmlElem.getAttribute("evalGid");
    
    this._htmlElem.removeAttribute("evalArgs");
    this._htmlElem.removeAttribute("evalGid");
    
    window.setTimeout(
      this._checkJsonValidity.bind(
        this, 
        {jsData: code, globalId: globalId, type: "Invalid JSON"}
      ),
      10
    );
  },
  
  _isJson: function(jsData) {
    var seemsJson = /\{.+\}/.test(jsData);
    seemsJson = seemsJson || /\[.+\]/.test(jsData);
    seemsJson = seemsJson && !(/(function|while|if)[\s\w]*\(/.test(jsData));
    seemsJson = seemsJson && !(/(try|else)\s*\{/.test(jsData));
    
    return seemsJson;
  },
  
  _report: function(obj) {
    chrome.extension.sendRequest({type: "log", record: obj});
  }  
}