[
  "for" "endfor" "in"
  "if" "endif" "elsif" "else"
  "unless" "endunless"
  "case" "endcase" "when"
  "capture" "endcapture"
  "comment" "endcomment"
  "raw" "endraw"
  "tablerow" "endtablerow"
  "layout"
] @keyword

[
  "assign"
  "render"
  "liquid"
  "increment"
  "decrement"
  "echo"
] @keyword.control.directive._TYPE_.liquid

(string) @string
(number) @constant.numeric
(boolean) @constant.language

(filter_expression name: (_) @function)

(render_parameter key:(_) @property)
(include_parameter key:(_) @property)
