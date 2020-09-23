/**
 * Author: Hurray
 * Date: 2017.01.22
 * Update: 2019.06.06 16:41:54
 * HowToUse: 
 *     var parser = new Markdown2HTML();
 *     var html = parser.md2html(md);
 *     alert(html);
 **/
var Markdown2HTML = function() {
  var setLineBr = true;
  //// [TOC]
  var _TOCStack = new Array();
	this.md2html = function md2html(md) {
		return md2html_complex2(md);
	}

	function md2html_complex2(md) {
		// console.log("============== START ============");
		var tagStack = new Array();
		var contentStack = new Array();
		var escapeStack = new Array();

		// pretreat
		//// code division
		var tmp = md;
    _TOCStack = new Array();
		tmp = tmp.replace(/\3/mg, "");
		var codeSplit = tmp.split(/^\s*```/mg);
		var codeDivStack = new Array();
		var s = "";
		for (var i = 0; i < codeSplit.length; i++) {
			if (i % 2 == 0) s += codeSplit[i];
			else {
				if (i + 1 < codeSplit.length) {
					s += "\n\3\n";
					codeDivStack.push(codeSplit[i]);
				} else {
					s += "```" + codeSplit[i];
				}
			}
		}
		//// links & img
		s = doLinkAndImg(s);


		lines = s.split("\n");
		var type = null;
		var lastType = null;
		var lastNotBlankType = null;
		lastLine = "";

		for (var i = 0; i < lines.length; i++) {
			// console.log("---------- LINE " + i + " ------------");
			// console.log("tagStack:\n" + tagStack);
			// get line type
			type = getType(lines[i]);

			// handle
			handle(lastType, lines[i], type, tagStack, contentStack, false, lastNotBlankType);

			lastLine = lines[i];
			lastType = type;
			lastNotBlankType = (type == "blank" ? lastNotBlankType : type);
		}
		// console.log("---------- COMPLETE ------------");
		// console.log("tagStack:\n" + tagStack);

		divCompletion(tagStack, contentStack);

		s = printStack(contentStack);

		// lasttreat
		tmp = lastTreat(s);
		var s = "";
		for (var i = 0, j = 0; i < tmp.length; i++) {
      if (tmp[i] != '\3') s += tmp[i];
			else {
        result = doCodeDiv(codeDivStack[j++]);
				if(result['type']) {
          s = s.substring(0, s.length - 1) + " class='"+ result['type'] + "'>"
        }
        s += result['code'];
      }
    }

    // handle [TOC]
    var reTOC=/\n?\s*\[TOC\]\s*\n?/;
    if (reTOC.exec(md)) {
      var tochtml = getTOC(s);
      s = tochtml + s;
    }

    // console.log("finalStr:\n" + s);
    // console.log("============== END ============");

    return s;
  }

  function getTOC(str) {
    var s = _TOCStack;
    var res = "";
    var height = 0;
    var stack = new Array();
    var largestH = 9999;
    
    for (var i = 0; i < s.length; i++) {
      largestH = largestH <= s[i][2] ? largestH : s[i][2];
    }

    for(var i = 0; i < s.length; i++) {
      h = s[i][2] - largestH + 1;
      if (h > height) {
        for (var j = height; j < h; j++) {
          res += "<ul>";
          stack.push("</ul>");
        }
      } else {
        for (var j = height; j > h; j--) {
          var t = stack.pop();
          if (t) res += t;
        }
      }
      res += "<li><a href='#"+ s[i][1] +"'>" + s[i][0] + "</a></li>";
      height = h;
    }
    for (var j = height; j > 0; j--) {
      var t = stack.pop();
      if (t) res += t;
    }
    return res;
  }

function doLinkAndImg(s) {
  var linkStack = s.match(/^\s*\[(.*)\]:\s*(\S*)(\s*"(.*)"\s*)?$/mg);
  if (linkStack == null) {
    linkStack = new Array();
  }
  var linkStackDetail = new Array();
  for (var ii = 0; ii < linkStack.length; ii++) {
    linkStack[ii].replace(/^\s*\[(.*)\]:\s*(\S*)(\s*"(.*)"\s*)?$/, function($1, $2, $3, $4, $5) {
      linkStackDetail.push([$1, $2, $3, $5]);			
    });	
  }
  // console.debug(linkStackDetail);
  s = s.replace(/^\s*\[(.*)\]:\s*(\S*)(\s*"(.*)"\s*)?$/mg, "\n");

  s = s.replace(/\[([^\]]+)\]\s*\[([^\]]+)\]/mg, function($0, $1, $2) {
    for (var ii = 0; ii < linkStackDetail.length; ii++) {
      if ($2.toLowerCase() == linkStackDetail[ii][1].toLowerCase()) {
        if (linkStackDetail[ii][3] == null)
          return ("[" + $1 + "](" + linkStackDetail[ii][2] + ")");
        else
          return ("[" + $1 + "](" + linkStackDetail[ii][2] + " \""+ linkStackDetail[ii][3] +"\"" + ")");
      }
    }
    return "[" + $1 + "][" + $2 + "]";
  });

  s = s.replace(/\[([^\]]+)\]\s*\[\]/mg, function($0, $1) {
    for (var ii = 0; ii < linkStackDetail.length; ii++) {
      if ($1.toLowerCase() == linkStackDetail[ii][1].toLowerCase()) {
        if (linkStackDetail[ii][3] == null)
          return ("[" + $1 + "](" + linkStackDetail[ii][2] + ")");
        else
          return ("[" + $1 + "](" + linkStackDetail[ii][2] + " \""+ linkStackDetail[ii][3] +"\"" + ")");
      }
    }
    return "[" + $1 + "][]";
  });

  s = s.replace(/<([^\s]*:\/\/[^\s]*)>/mg, "<a href=\"$1\"\4>$1\4</a>");
  s = s.replace(/<([^\s]*@[^\s]*)>/mg, "<a href=\"mailto:$1\"\4>$1\4</a>");
  s = s.replace(/!\[([^\]]*)\]\(\s*([^\"\'\)\s]*)\s*"([^"]*)"\)/mg, "<img src=\"$2/blog\"\4 alt=\"$1\"\4 title=\"$3\"\4>");
		s = s.replace(/!\[([^\]]*)\]\(\s*([^\"\'\)\s]*)\s*'([^']*)'\)/mg, "<img src=\"$2/blog\"\4 alt=\"$1\"\4 title=\"$3\"\4>");
		s = s.replace(/!\[([^\]]*)\]\(\s*([^\"\'\)\s]*)\s*\)/mg, "<img src=\"$2/blog\"\4 alt=\"$1\"\4>");
		s = s.replace(/\[([^\]]*)\]\(\)/mg, "<a href=\"$1\"\4>$1\4</a>");
		s = s.replace(/\[([^\]]*)\]\(\s*([^\"\'\)\s]*)\s*\)/mg, "<a href=\"$2\"\4>$1\4</a>");
		s = s.replace(/\[([^\]]*)\]\(\s*([^\"\'\)\s]*)\s*"([^"]*)"\)/mg, "<a href=\"$2\"\4 title=\"$3\"\4>$1\4</a>");
		s = s.replace(/\[([^\]]*)\]\(\s*([^\"\'\)\s]*)\s*'([^']*)'\)/mg, "<a href=\"$2\"\4 title=\"$3\"\4>$1\4</a>");

		// ruby
		s = s.replace(/\[([^\]]+)\]\^\(([^\)]+)\)/mg, function($0, $1, $2) {
			res = "";
			var buf = $2.split(" ");
			if ($1.length == buf.length) {
				for (var ii = 0; ii < $1.length; ii++) {
					res += "<ruby>"+ $1[ii] +"<rp>（</rp><rt>"+ buf[ii] +"</rt><rp>）</rp></ruby>";
				}
			} else {
				var rb = $1.split(" ")
				if (rb.length == buf.length) {
					for (var ii = 0; ii < rb.length; ii++) {
						res += "<ruby>"+ rb[ii] +"<rp>（</rp><rt>"+ buf[ii] +"</rt><rp>）</rp></ruby>";
					}
				} else {
					res += "<ruby>"+ $1 +"<rp>（</rp><rt>"+ $2 +"</rt><rp>）</rp></ruby>";
				}
			}
			return res;
		});

		return s;
	}

	function doCodeDiv(code) { // @Todo Highlight
		type = code.split('\n')[0]
		code = code.replace(/^[^\n]*\n(.*)/, "$1");
		code = code.replace(/&/g, "&amp;");
		code = code.replace(/</g, "&lt;");
		code = code.replace(/>/g, "&gt;");
		// console.log(code);
		return {"code": code, "type": type};
	}

	function lastTreat(s) {
		var tmp = s;

		var escapeStack = new Array();
		tmp = pretreatEscapeChar(tmp, escapeStack);

		tmp = lasttreatEscapeChar(tmp, escapeStack);

		return tmp;
	}

	function findDotChar(s, start) {
		if (start < 0) return -999;
		for (var jj = start; jj < s.length; jj++) {
			if (s.charAt(jj) == '`' && s.charAt(jj-1) != '\\') return jj;
		}
		return -999;
	}

	function findDoubleDotChar(s, start) {
		if (start < 0) return -999;
		var a = findDotChar(s, start);
		while (a > 0 && a != s.length - 1) {
			if (s.charAt(a+1) == '`') {
				return a;
			} else {
				a = findDotChar(s, a+1);
			}
		} 
		return -999;
	}

	function getStrBetween(s, start, end) {
		var t = "";
		for (var jj = start; jj <= end; jj++) {
			t += s.charAt(jj);
		}
		return t;
	}

	function treatCodeStack(s, codeStack) {
		var t = "";
		for (var jj = 0, kk = 0; jj < s.length; jj++) {
			if (s.charAt(jj) != '\2') t += s.charAt(jj);
			else {
				for (var n = 0; n < codeStack[kk].length; n ++) {
					if (codeStack[kk].charAt(n) == '\\') t += "\\\\";
					else t += codeStack[kk].charAt(n);
				}
				kk++;
			}
		}
		return t;
	}

	function codeEscape(s) {
		s = s.replace(/&/g, "&amp;");
		s = s.replace(/</g, "&lt;");
		s = s.replace(/>/g, "&gt;");
		return s;
	}

	function spanStyle(s) {
		// ` && ``
		s = s.replace(/\2/, ""); //lazy
		var tmp = "";
		var codeStack = new Array();
		for (var ii = 0; ii < s.length;) {
			var a = findDotChar(s, ii);
			tmp += getStrBetween(s, ii, a - 1);
			if (a >= 0) {
				if (s.charAt(a + 1) == '`') {
					var b = findDoubleDotChar(s, a+3);
					if (b > 0) {
						ii = b + 2;
						codeStack.push(codeEscape(getStrBetween(s, a+2, b-1)));
						tmp += "<code>" + "\2" + "</code>";
					} else {
						b = findDotChar(s, a+3);
						if (b > 0) {
							ii = b + 1;
							codeStack.push(codeEscape(getStrBetween(s, a+1, b-1)));
							tmp += "<code>" + '\2' + "</code>";
						} else {
							tmp += getStrBetween(s, a, s.length - 1);
							break;
						}
					}
				} else {
					var b = findDotChar(s, a + 2); // lazy
					if (b > 0) {
						ii = b + 1;
						codeStack.push(codeEscape(getStrBetween(s, a+1, b-1)));
						tmp += "<code>" + '\2' + "</code>";
					} else {
						tmp += getStrBetween(s, a, s.length - 1);
						break;
					}
				}
			} else {
				tmp += getStrBetween(s, ii, s.length - 1);
				break;
			}
		}
		s = tmp;
		var escapeStack = new Array();
		s = pretreatEscapeChar(tmp, escapeStack);

		s = s.replace(/__([^_\4]+)__/g, "<strong>$1</strong>");
		s = s.replace(/(?!\\)\*\*([^\*\4]+)\*\*/g, "<strong>$1</strong>");
		s = s.replace(/(?!\\)_([^_\4]+)_/g, "<em>$1</em>");
		s = s.replace(/(?!\\)\*([^\*\4]+)\*/g, "<em>$1</em>");
		s = s.replace(/~~([^~\4]+)~~/g, "<del>$1</del>");
		
		s = lasttreatEscapeChar(s, escapeStack);
		s = treatCodeStack(s, codeStack);
		return s;
	}

	function printStack(stack) {
		var s = "";
		for (var ii = 0; ii < stack.length; ii++) {
			s += stack[ii][0];
		}
		return s;
	}

	function getOpsTag(tag) {
		switch (tag) {
			case "<p>": return "</p>";
			case "<ul>": return "</ul>";
			case "<li>": return "</li>";
			case "<ol>": return "</ol>";
			case "<blockquote>": return "</blockquote>";
			case "<pre>": return "</pre>";
			case "<code>": return "</code>";
			case "<table>": return "</table>";
			case "<tbody>": return "</tbody>";
		}
	}

	function divCompletion(tagStack, contentStack) {
		var temp;
		for (var ii = tagStack.length - 1; ii >= 0; ii--) {
			temp = tagStack.pop();
			switch (temp[0]) {
				case "<p>": contentStack.push(["</p>", "tag"]); break;
				case "<ul>": contentStack.push(["</ul>", "tag"]); break;
				case "<li>": contentStack.push(["</li>", "tag"]); break;
				case "<ol>": contentStack.push(["</ol>", "tag"]); break;
				case "<blockquote>": contentStack.push(["</blockquote>", "tag"]); break;
				case "<pre>": contentStack.push(["</pre>", "tag"]); break;
				case "<code>": contentStack.push(["</code>", "tag"]); break;
				case "<tbody>": contentStack.push(["</tbody>", "tag"]); break;
				case "<table>": contentStack.push(["</table>", "tag"]); break;
				// default: console.error("Error! " + temp[0]); break;
			}
		}
	}

	function spanCompletion(tagStack, contentStack) {
		var temp;
		var op = false;
		for (var ii = tagStack.length - 1; ii >= 0; ii--) {
			item = tagStack[ii][0];
			if (item == "<li>") {
				op = true;
				tagStack.pop();
				contentStack.push(["</li>", "tag"]);
			} else if (item == "<p>") {
				op = true;
				tagStack.pop();
				contentStack.push(["</p>", "tag"]);
			} else {
				return op;
			}
		}
	}

	function handleTitle(lastType, line, tagStack, contentStack, lastNotBlankType, isInline) {
		// div completion
		if (!isInline && lastType == "blank") {
			divCompletion(tagStack, contentStack);
		}

		num = line.replace(/^\s*(#+).*$/, "$1").split('#').length - 1;
		num = num > 6 ? 6 : num;
		tmp = line.replace(/^\s*#+((.*[^#])#*)?$/, "$2");

    // header id
    hid = spanStyle(tmp); // handle markdown tag
    hid.replace(/<[^>]*>/g, ''); // exclude HTML tag
    hid = hid.trim();
    hcontent = hid;
    hid.replace(/\ /g, '-'); // change space to -
    hid.replace(/\./g, ''); // delete .


		contentStack.push(["<h" + num + " id='"+ hid +"'>" + spanStyle(tmp) + "</h" + num + ">", "title"]);

    _TOCStack.push([hcontent, hid, num]);
		// recursion: none
	}

	function hasRecursionType(inline) {
		inType = getType(inline);
		if (inType == "title" || inType == "quote" || inType == "listul" ||
			inType == "listol" || inType == "quote") {
			// console.log("Has Recursion");
			return inType;
		} else {
			return null;
		}
	}

	function handleAddTitle(addNum, tagStack, contentStack, lastNotBlankType) {
		// console.log("Handle: AddTitle");
		if (contentStack.length == 0) {
			contentStack += "<h"+ addNum +"></h"+ addNum +">";
		} else if (contentStack[contentStack.length - 1][1] == "title") {
			contentStack += "<h"+ addNum +"></h"+ addNum +">";
		} else {
			for (var ii = contentStack.length - 1; ii >= 0; ii++) {
				item = contentStack[ii];
				if (item[1] == "content") {
          // header id
          hid = spanStyle(item[0]); // handle markdown tag
          hid.replace(/<[^>]*>/g, ''); // exclude HTML tag
          hid = hid.trim();
          hcontent = hid;
          hid.replace(/\ /g, '-'); // change space to -
          hid.replace(/\./g, ''); // delete .
					item[0] = "<h"+ addNum +" id='"+ hid +"'>"+ item[0] +"</h"+ addNum +">";
					item[1] = "title";
          _TOCStack.push([hcontent, hid, addNum]);
				}
				break;
			}
		}
	}

	function handleBlank(lastType, tagStack, contentStack, lastNotBlankType) {
		// console.log("Handle: Blank");

		if (lastType == "blank" && (lastNotBlankType == "listul" || lastNotBlankType == "listol")) {
			divCompletion(tagStack, contentStack);
		}

		if (tagStack.length != 0) {
			// if (tagStack[tagStack.length - 1][0] == "<li>") {
			// 	var TF = false;
			// 	// console.info("contentStack:\n" + contentStack);
			// 	var tmp = contentStack.pop();
			// 	// console.info("tmp:" + tmp);
			// 	while (true) {
			// 		var t = contentStack.pop();
			// 		if (t[1] == "content") tmp[0] = t[0] + tmp[0];
			// 		else {
			// 			if (t[0] != "<p>") {
			// 				contentStack.push(t);
			// 			} else {
			// 				contentStack.push(t);
			// 				TF = true;
			// 			}
			// 			break;
			// 		}
			// 	}
			// 	if (!TF) {
			// 		tagStack.push(["<p>", null, "blank"]);
			// 		contentStack.push(["<p>", "tag"]);
			// 	}
			// 	contentStack.push(tmp);
			// }

			// var tag = tagStack[tagStack.length - 1][0];
			var op = spanCompletion(tagStack, contentStack);
			// quoteBlank(tagStack, contentStack);
			// divCompletion(tagStack, contentStack);
			
		}
		contentStack.push(["", "content"]);
	}

	function countStackTag(stack, tag) {
		var count = 0;
		for (var ii = 0; ii < stack.length; ii++) {
			if (stack[ii][0] == tag)
				count ++;
		}
		return count;
	}

	function quoteBlank(tagStack, contentStack) {
		var stackQuoteDeep = countStackTag(tagStack, "<blockquote>");

		var temp;
		while (stackQuoteDeep > 1) {
			temp = tagStack.pop();
			temp = temp[0];
			if (temp == "<blockquote>") {
				stackQuoteDeep--;
				contentStack.push(["</blockquote>", "tag"]);
			} else {
				contentStack.push([getOpsTag(temp), "tag"]);
			}
		}
	}

	function countTagDeep(tag, tagStack) {
		var count = 0;
		for (var ii = 0; ii < tagStack.length; ii++) {
			if (tagStack[ii][0] == tag) count++;
		}
		return count;
	}

	function handleQuote(line, tagStack, contentStack, lastNotBlankType, lastType, isInline) {
		// console.log("Handle: Quote");
		var inline = line.replace(/^(\s*>)+(.*)/, "$2");
		var rec = hasRecursionType(inline);
		var recCode = (line.search(/^(\s*>)+(\ *\t|\s{4})/) != -1);
		var quoteDeep = 0; // calculate latter
		var tagStackDeep = countTagDeep("<blockquote>", tagStack);
		var isBlank = (line.search(/^\s*>\s*$/) != -1);

		// quoteDeep
		for (var ii = 0; ii < line.length; ii++) {
			if (line.charAt(ii) == ' ') continue;
			else if (line.charAt(ii) == ">") quoteDeep ++;
			else break;
		}
		// console.log("QuoteDeep = " + quoteDeep + "\nTagStackDeep = " + tagStackDeep);

		// last Not blank line recursion
		if (lastType == "blank") {
			var TF = false;
			for (var ii = tagStack.length - 1; ii >= 0; ii--) {
				if (tagStack[ii][2] != "line") continue;
				else {
					if (tagStack[ii][0] == "<blockquote>") {
						TF = true;
						break;
					} else {
						continue;
					}
				}
			}

			if (TF == true) {
				var tmpDeep = tagStackDeep - quoteDeep;
				spanCompletion(tagStack, contentStack);
				for (var ii = tagStack.length - 1; ii >= 0; ii--) {
					if (tagStack[ii][2] != "line" && tagStack[ii][0] != "<blockquote>") {
						var t = tagStack.pop();
						contentStack.push([getOpsTag(t[0]), "tag"]);
					}
					else {
						if (tmpDeep > 0) {
							tmpDeep --;
							var t = tagStack.pop();
							contentStack.push([getOpsTag(t[0]), "tag"]);
						} else {
							break;
						}
					}
				}
			} else {
				divCompletion(tagStack, contentStack);
			}
		}

		tagStackDeep = countTagDeep("<blockquote>", tagStack);

		// </ul></ol>
		var lastTag = tagStack[tagStack.length - 1];
		if (tagStack.length > 0) {
			while (rec != "<ul>" && rec != "<ol>" && 
				(lastTag[0] == "<ul>" || lastTag[0] == "<ol>") ) {
				contentStack.push([getOpsTag(lastTag[0]), "tag"]);
				tagStack.pop();
				if (tagStack.length >0) {
					lastTag = tagStack[tagStack.length - 1];
				} else {
					break;
				}
			}
		}

		// handle tags
		if (isBlank) {
			spanCompletion(tagStack, contentStack);

			// decrease block deep to 1
			if (tagStackDeep > 1) {
				var num = tagStackDeep - 1;
				for (var ii = tagStack.length - 1; ii >= 0 && num > 0; ii--) {
					var item = tagStack.pop();
					if (item[0] == "<blockquote>") {
						contentStack.push(["</blockquote>", "tag"]);
						num--;
					} else {
						contentStack.push([getOpsTag(item[0]), "tag"]);
					}
				}
			}
		} else if (quoteDeep == 1) {
			if (tagStackDeep == 0) {
				contentStack.push(["<blockquote>", "tag"]);
				tagStack.push(["<blockquote>", null, isInline?"inline" : "line"]);
			}

			if (rec == null) {
				if (tagStack.length != 0) {
					if (tagStack[tagStack.length - 1][0] != "<p>" && lastType != "quote") {
						spanCompletion(tagStack, contentStack);
						contentStack.push(["<p>", "tag"]);
						tagStack.push(["<p>", null, isInline?"inline" : "line"]);
					}
				}
			}
		} else {
			if (quoteDeep == tagStackDeep) {
				if (rec == null) {
					if (tagStack[tagStack.length - 1][0] != "<p>" && lastType != "quote") {
						spanCompletion(tagStack, contentStack);
						contentStack.push(["<p>", "tag"]);
						tagStack.push(["<p>", null, isInline?"inline" : "line"]);
					}
				}
			} else if (quoteDeep > tagStackDeep) {
				spanCompletion(tagStack, contentStack);
				for (var ii = tagStackDeep; ii < quoteDeep; ii++) {
					contentStack.push(["<blockquote>", "tag"]);
					tagStack.push(["<blockquote>", null, isInline?"inline" : "line"]);
				}
				if (rec == null && lastType != "quote") {
					spanCompletion(tagStack, contentStack);
					contentStack.push(["<p>", "tag"]);
					tagStack.push(["<p>", null, isInline?"inline" : "line"]);
				}
			} else { // quoteDeep < tagStackDeep
				spanCompletion(tagStack, contentStack);
				var num = tagStackDeep - quoteDeep;
				for (ii = tagStack.length - 1; ii > 0 && num > 0; ii--) {
					var item = tagStack.pop();
					item = item[0];
					if (item == "<blockquote>") {
						contentStack.push(["</blockquote>", "tag"]);
						num--;
					} else {
						contentStack.push([getOpsTag(item), "tag"]);
					}
				}
				if (rec == null && lastType != "quote") {
					spanCompletion(tagStack, contentStack);
					contentStack.push(["<p>", "tag"]);
					tagStack.push(["<p>", null, isInline?"inline" : "line"]);
				}
			}
		}

		// console.info("contentStack:\n" + contentStack);
		// some data for latter use
		var lastContentIsBlank = false;
		for (var ii = contentStack.length - 1; ii >= 0; ii--) {
			if (contentStack[ii][1] == "content") {
				lastContentIsBlank = (contentStack[ii][0].search(/^\s*$/) != -1 ? true : false);
				break;
			}
		}

		// content
		if (rec != null) {
			handle(null, inline, rec, tagStack, contentStack, true, lastNotBlankType);
		} else if (recCode != false && (lastType != "quote" || lastType == "quote" && lastContentIsBlank) ) {
			handle(null, inline, "code", tagStack, contentStack, true, lastNotBlankType);
		} else {
			contentStack.push([spanStyle(inline), "content"]);
		}
	}

	function handleTable(lastType, line, tagStack, contentStack, lastNotBlankType) {
		var initial = false;
		if (lastType != "table") {
			divCompletion(tagStack, contentStack);
			initial = true;
		}

		if (initial) {
			tagStack.push(["<table>", null, "line"]);
			contentStack.push(["<table>", "tag"]);
			contentStack.push([line, "temp"]); // temp save
		} else {
			// |--------|-------|...|
			if (line.search(/^\|(\s*-+\s*\|)+$/) != -1) {
				temp = contentStack.pop();
				if (temp[1] == "temp") {
					contentStack.push(["<thead>", "tag"]);
					contentStack.push(["<tr>", "tag"]);
					line2 = spanStyle(temp[0])
					var num_tr = line2.split('|').length - 2;
					trs = line2.split('|')
					for (ii = 0; ii < num_tr; ii++) {
						contentStack.push(["<th>", "tag"]);
						contentStack.push([trs[ii+1], "content"]);
						contentStack.push(["</th>", "tag"]);
					}
					contentStack.push(["</tr>", "tag"]);
					contentStack.push(["</thead>", "tag"]);
					tagStack.push(["<tbody>", null, "line"]);
					contentStack.push(["<tbody>", "tag"]);
				} else {
					contentStack.push(temp);
					tagStack.push(["<tbody>", null, "line"]);
					contentStack.push(["<tbody>", "tag"]);
				}
			} else {
				// last line
				temp = contentStack.pop();
				if (temp[1] == "temp") {
					contentStack.push(["<tr>", "tag"]);
					line2 = spanStyle(temp[0])
					var num_tr = line2.split('|').length - 2;
					trs = line2.split('|')
					for (ii = 0; ii < num_tr; ii++) {
						contentStack.push(["<th>", "tag"]);
						contentStack.push([trs[ii+1], "content"]);
						contentStack.push(["</th>", "tag"]);
					}
					contentStack.push(["</tr>", "tag"]);
				} else {
					contentStack.push(temp);
				}

				// this line
				contentStack.push(["<tr>", "tag"]);
				line2 = spanStyle(line);
				var num_tr = line2.split('|').length - 2;
				trs = line2.split('|')
				for (ii = 0; ii < num_tr; ii++) {
					contentStack.push(["<th>", "tag"]);
					contentStack.push([trs[ii+1], "content"]);
					contentStack.push(["</th>", "tag"]);
				}
				contentStack.push(["</tr>", "tag"]);
			}
		}
	}

	function handleNormal(lastType, line, tagStack, contentStack, lastNotBlankType) {
    // remove [TOC]
    line = line.replace(/^\s*\[TOC\]\s*$/, '');

		// console.log("lastType:\n" + lastType + "\n");
		if (lastType == "blank") {
			// if (tagStack.length > 0) {
			// 	var lastTag = tagStack[tagStack.length - 1];
			// 	while (lastTag[0] == "<ul>" || lastTag[0] == "<ol>" || lastTag[0] == "<blockquote>") {
			// 		contentStack.push([getOpsTag(lastTag[0]), "tag"]);
			// 		tagStack.pop();
			// 		if (tagStack.length >0) {
			// 			lastTag = tagStack[tagStack.length - 1];
			// 		} else {
			// 			break;
			// 		}
			// 	}
			// }
			divCompletion(tagStack, contentStack);
		} else if (lastType == "quote") {
			if (tagStack.length > 0) {
				var lastTag = tagStack[tagStack.length - 1];
				while (lastTag[0] == "<ul>" || lastTag[0] == "<ol>") {
					contentStack.push([getOpsTag(lastTag[0]), "tag"]);
					tagStack.pop();
					if (tagStack.length >0) {
						lastTag = tagStack[tagStack.length - 1];
					} else {
						break;
					}
				}
			}
		}

		if (tagStack.length > 0) {
			if (tagStack[tagStack.length - 1][0] == "<code>") {
				divCompletion(tagStack, contentStack);
			}
		}


		// tag <p>
		var TF = false;
		if (tagStack.length > 0) {
			if (tagStack[tagStack.length - 1][0] != "<p>" && tagStack[tagStack.length - 1][0] != "<li>") {
				for (var ii = tagStack.length - 1; ii >= 0; ii--) {
					var item = tagStack[ii][0];
					if (item == "<ul>" || item == "ol") {
						tagStack.push(["<li>", null, "line"]);
						contentStack.push(["<li>", "tag"]);
						TF = true;
					}
				}
				if (!TF) {
					tagStack.push(["<p>", null, "line"]);
					contentStack.push(["<p>", "tag"]);
				}
			}
		} else {
			tagStack.push(["<p>", null, "line"]);
			contentStack.push(["<p>", "tag"]);
		}

    var _line = spanStyle(line)
    if (lastType == "normal") {
      if (_line.trim() != "<br>") _line = "<br>" + _line;
    } else {
      _line = " " + _line
    }
		contentStack.push([_line, "content"]);
	}

	function handleList(isUl, lastType, line, tagStack, contentStack, lastNotBlankType, isInline) {
		var latterList = countStackTag(tagStack, "<ul>") + countStackTag(tagStack, "<ol>");

		var inline = line.replace(/^(\s*)(\*|\+|\-|[0-9]+\.)(\s.*)$/, "$1$3");
		var rec = hasRecursionType(inline);
		var listDeep = (latterList == 0 ? 0 : countFrontSpaces(line));
		var tag = isUl ? "<ul>" : "<ol>";
		var lastBlank = (lastType == "blank");

		var lastListDeep = -1;

		var noListBefore = true;
		for (var ii = tagStack.length - 1; ii >= 0; ii--) {
			if (tagStack[ii][0] == "<ul>" || tagStack[ii][0] == "<ol>") {
				noListBefore = false;break;
			}
		}

		if (lastNotBlankType != "listul" && lastNotBlankType != "listol" && lastType == "blank" && noListBefore) {
			divCompletion(tagStack, contentStack);
		}
		else if (!isInline) {
			// lastNotBlankLineType
			var TF = false;
			for (var ii = tagStack.length - 1; ii >= 0; ii--) {
				if (tagStack[ii][2] != "line") continue;
				else {
					if (tagStack[ii][0] == "<li>") continue;
					if (tagStack[ii][0] == "<ul>" || tagStack[ii][0] == "<ol>") {
						TF = true; break;
					}
				}
			}

			if (TF) {
				spanCompletion(tagStack, contentStack);
				for (var ii = tagStack.length - 1; ii >= 0; ii--) {
					if (tagStack[ii][2] != "line") {
						var t = tagStack.pop();
						contentStack.push([getOpsTag(t[0]), "tag"]);
					} else {
						break;
					}
				}
			} else {
				divCompletion(tagStack, contentStack);
			}
		}

		while (tagStack.length > 0) {
			lastTag = tagStack[tagStack.length - 1][0];

			// <code>
			if (lastTag == "<code>" && (lastType == "code" || lastType == "blank")) {
				divCompletion(tagStack, contentStack);
				break;
			} 
			// <blockquote>
			else if (lastTag == "<blockquote>" && lastType == "blank") {
				divCompletion(tagStack, contentStack);
				break;
			}
			// <p>
			else if (lastTag == "<p>") {
				tagStack.pop();
				contentStack.push(["</p>", "tag"]);
			} else {
				break;
			}
		}

		// <ul>/<ol>tags
		var TF = false;
		if (tagStack.length > 0) {
			for (var ii = tagStack.length - 1; ii >= 0; ii--) {
				var item = tagStack[ii];
				if (item[0] == "<ul>" || item[0] == "<ol>") {
					TF = true;
					lastListDeep = item[1];
					if (lastListDeep > listDeep) {
						contentStack.push([getOpsTag(item[0]), "tag"]);
						tagStack.pop();
					} else if (lastListDeep == listDeep) {
						spanCompletion(tagStack, contentStack);
						break;
					} else { // lastListDeep < listDeep
						tagStack.push([tag, listDeep, isInline ? "inline" : "line"]);
						contentStack.push([tag, "tag"]);
						break;
					}
				} else if (item[0] == "<li>") { 
					TF = true;
					lastListDeep = item[1];
					if (lastListDeep >= listDeep) {
						contentStack.push([getOpsTag(item[0]), "tag"]);
						tagStack.pop();
					} else {
						continue;
					}
				} else {
					// console.error("Oooops!");
					break;
				}
			}
		} else {
			TF = true;
			tagStack.push([tag, listDeep, isInline ? "inline" : "line"]);
			contentStack.push([tag, "tag"]);
		}

		if (TF == false) {
			tagStack.push([tag, listDeep, isInline ? "inline" : "line"]);
			contentStack.push([tag, "tag"]);
		}

		tagStack.push(["<li>", listDeep, isInline ? "inline" : "line"]);
		contentStack.push(["<li>", "tag"]);

		// if (lastBlank) {
		// 	tagStack.push(["<p>", null, isInline ? "inline" : "line"]);
		// 	contentStack.push(["<p>", "tag"]);
		// }

		if (rec != null) {
			handle(null, inline, rec, tagStack, contentStack, true, lastNotBlankType);
		} else {
			contentStack.push([" " + spanStyle(inline), "content"]); // add a space to latter use
		}
	}

	function handleCode(lastType, line, tagStack, contentStack, isInline, lastNotBlankType) {
		var isCode = false;
		var isLatterCode = (countStackTag(tagStack, "<code>") > 0);
		var isLatterList = (countStackTag(tagStack, "<ul>") + countStackTag(tagStack, "<ol>") > 0)
		var spNum = countFrontSpaces(line);
		var lastTag;
		var str = line.replace(/^\s*(.*)$/, "$1");
		for (var ii = 0; ii < (spNum - 4); ii++) 
			str = " " + str;
		if (tagStack.length == 0) {
			lastTag = null;
		} else {
			lastTag = tagStack[tagStack.length - 1][0];
		}

		// if (!isInline && lastTag != "<code>") {
		// 	divCompletion(tagStack, contentStack);
		// }

		if (!isLatterCode && !isLatterList && !isInline) {
			tagStack.push(["<pre>", null, isInline ? "inline" : "line"]);
			tagStack.push(["<code>", null, isInline ? "inline" : "line"]);
			contentStack.push(["<pre>", "tag"]);
			contentStack.push(["<code>", "tag"]);
			isCode = true;
		} else if (isLatterCode) {
			contentStack.push(["\n", "content"]);
			isCode = true;
		} else { // isLatterList
			if (isInline) {
				tagStack.push(["<pre>", null, isInline ? "inline" : "line"]);
				tagStack.push(["<code>", null, isInline ? "inline" : "line"]);
				contentStack.push(["<pre>", "tag"]);
				contentStack.push(["<code>", "tag"]);
				isCode = true;
			} else {
				isCode = false;
			}
		}

		// console.info(isCode);

		if (!isCode && lastType == "blank") {
			spanCompletion(tagStack, contentStack);
		}

		if (!isCode && line.search(/^\s*$/) != -1) {
			handle(null, line, "blank", tagStack, contentStack, false, lastNotBlankType);
		}

		if ((lastNotBlankType == "listul" || lastNotBlankType == "listol") || !isCode && lastNotBlankType == "code") {
			// console.info("contentStack: " + contentStack);
			if (lastType == "blank") {
				var blockNum = 0;

				for (var ii = contentStack.length - 1; ii >= 0; ii--) {
					if (contentStack[ii][0] == "") {
						blockNum ++;
					} else if (contentStack[ii][0] == "</li>") {
						break;
					}
				}

				// console.info("blockNum = " + blockNum);
				if (blockNum == 1) {
					if (tagStack.length > 0) {
					var t1 = contentStack.pop(); // ""
					var t2 = contentStack.pop(); // </li>
					if (t1[0] != "" || t2[0] != "</li>") {
						contentStack.push(t2);
						contentStack.push(t1);
					} else {
						if (contentStack[contentStack.length - 2][0].search(/^\s*$/) != -1) {
							/* 1.
						 
						     aoeu
						     */
						   contentStack.pop();
						   contentStack.pop();
						   tagStack.push(["<p>", null, isInline ? "inline" : "line"]);
						 } else {
						 	tagStack.push(["<li>", null, isInline ? "inline" : "line"]);
						 	tagStack.push(["<p>", null, isInline ? "inline" : "line"]);
						 	contentStack.push(["<p>", "tag"]);
						 }
						}
					}
				} else {
					tagStack.push(["<pre>", null, isInline ? "inline" : "line"]);
					tagStack.push(["<code>", null, isInline ? "inline" : "line"]);
					contentStack.push(["<pre>", "tag"]);
					contentStack.push(["<code>", "tag"]);
					isCode = true;
				}
			} else { // lastType != "blank"
				// isCode = false;
				
			}
		}

		if (isCode) {
			var count = 0;
			for (var ii = contentStack.length - 1; ii >= 0; ii--) {
				var item = contentStack[ii][0];
				if (item == "\n") continue;
				else if (item == "") {
					contentStack[ii][0] = "\n";
				} else {
					break;
				}
			}

			str = str.replace("&", "&amp;");
			str = str.replace("<", "&lt;");
			str = str.replace(">", "&gt;");
			contentStack.push([str, "content"]);
		} else {

			var ans = getType(str);
			if (ans != "addTitle1" && ans != "addTitle2" && ans != "blank" && ans != "normal") {
				handle(null, str, ans, tagStack, contentStack, true, lastNotBlankType);
			} else {
				str = " " + str;
				contentStack.push([spanStyle(str), "content"]);
			}
		}
	}

	function handleHr(lastType, line, tagStack, contentStack, lastNotBlankType) {
		// add Title2
		if (line.search(/^((\s*\-\s*){3,})$/) != -1 && lastType != "blank" && lastType != null) {
			handle(lastType, line, "addTitle2", tagStack, contentStack, false, lastNotBlankType);
			return;
		}

		divCompletion(tagStack, contentStack);
		contentStack.push(["<hr>", "tag"]);
	}

	function handleCodeDiv(tagStack, contentStack) {
		divCompletion(tagStack, contentStack);
		contentStack.push(["<pre><code>\3</code></pre>", "codeDiv"]);
	}

	function handle(lastType, line, type, tagStack, contentStack, isInline, lastNotBlankType) {
		// console.log("func: handle " + type);

		switch (type) {
			case "title" : {
				handleTitle(lastType, line, tagStack, contentStack, lastNotBlankType, isInline);
				return;
			}

			case "addTitle1" : {
				handleAddTitle(1, tagStack, contentStack, lastNotBlankType);
				return;
			}

			case "addTitle2" : {
				handleAddTitle(2, tagStack, contentStack, lastNotBlankType);
				return;
			}

			case "code" : {
				handleCode(lastType, line, tagStack, contentStack, isInline, lastNotBlankType); 
				return;
			}

			case "blank" : {
				handleBlank(lastType, tagStack, contentStack, lastNotBlankType);
				return;
			}

			case "quote" : {
				handleQuote(line, tagStack, contentStack, lastNotBlankType, lastType, isInline);
				return;
			}

			case "listul" : {
				handleList(true, lastType, line, tagStack, contentStack, lastNotBlankType, isInline);
				return;
			}

			case "listol" : {
				handleList(false, lastType, line, tagStack, contentStack, lastNotBlankType, isInline);
				return;
			}

			case "hr" : {
				handleHr(lastType, line, tagStack, contentStack, lastNotBlankType);
				return;
			}

			case "normal" : {
				handleNormal(lastType, line, tagStack, contentStack, lastNotBlankType);
				return;
			}

			case "codeDiv" : {
				handleCodeDiv(tagStack, contentStack);
				return;
			}

			case "table" : {
				handleTable(lastType, line, tagStack, contentStack, lastNotBlankType);
				return;
			}
		}
	}

	function countFrontSpaces(s) {
		sp = 0;
		turn = 0;
		for (ii = 0; ii < s.length; ii++) {
			if (s.charAt(ii) == ' ') sp++;
			else if(s.charAt(ii) == '\t') turn++;
			else break;
		}
		return 4*turn + sp;
	}

	function getType(s) {
		if (s.search(/^\3/) != -1) {
			return "codeDiv";
		} else if (s.search(/^\s*#/) != -1) {
			return "title";
		} else if (s.search(/^(\s*(\*|\-)\s*){3,}$/) != -1) {
			return "hr";
		} else if (s.search(/^((\s*=\s*){3,})$/) != -1) {
			return "addTitle1";
		} else if (s.search(/^((\s*-\s*){3,})$/) != -1) {
			return "addTitle2";
		} else if (s.search(/^\s*$/) != -1) {
			return "blank";
		} else if (s.search(/^(\ *\t\s*|\s{4})/) != -1) {
			return "code";
		} else if (s.search(/^\s*(\s*>)+/) != -1) {
			return "quote";
		} else if (s.search(/^\s*(\*|\+|\-)\s+/) != -1) {
			return "listul";
		} else if (s.search(/^\s*([0-9]+\.)\s+/) != -1) {
			return "listol";
		} else if (s.search(/^\|.*\|$/) != -1) {
			return "table";
		} else {
			return "normal";
		}
	}

	function lasttreatEscapeChar(finalStr, escapeStack) {
		var s = "";
		for (var iii = 0, j = 0; iii < finalStr.length; iii++) {
			if (finalStr.charAt(iii) == '\1') {
				s += escapeStack[j++];
			} else {
				s += finalStr.charAt(iii);
			}
		}
		return s;
	}

	function pretreatEscapeChar(md, escapeStack) {
		var s = "";
		for (var iii = 0, j = 0, k = 0; iii < md.length; iii++) {
			if (md.charAt(iii) == '\1') {
				escapeStack[j++] = '\1';
				s = s + '\1';
			}
			else if (md.charAt(iii) == '\\') {
				if (iii + 1 < md.length) {
					var a = md.charAt(iii);
					var b = md.charAt(++iii);
					if(b.search(/[^a-zA-Z0-9]/) != -1) {
						escapeStack[j++] = b;
						s = s + '\1';
					} else {
						s = s + '\\';
						s = s + b;
					}
				} else {
					s = s + '\\';
				}
			}
			else {
				s = s + md.charAt(iii);
			}
		}
		return s;
	} 


	function getContent(s, type) {
		var content;
		switch (type) {
			case "title": {
				num = s.replace(/^(#+).*$/, "$1").split('#').length - 1;
				num = num > 6 ? 6 : num;
				tmp = s.replace(/^#+((.*[^#])#*)?$/, "$2");
			}
		}
	}
}
