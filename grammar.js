function block ($, start, end) {
  return seq(
    start,
    repeat($._any),
    end
  );
}

function directive (middle) {
  return seq(
    choice("{%", "{%-"),
    middle,
    choice("%}", "-%}")
  );
}

module.exports = grammar({
  name: 'liquid',

  extras: _ => [/\s+/],

  externals: ($) => [
    $._raw_content,
    $._block_comment_content,
    $._error_sentinel
  ],

  word: $ => $.identifier,

  rules: {
    template: $ => repeat(
      $._any,
    ),

    _any: $ => choice(
      $.content,
      $.for_block,
      $.if_block,
      $.unless_block,
      $.case_block,
      $.liquid_directive,
      $.assign_directive,
      $.output_directive,
      $.capture_directive,
      $.raw_block,
      $.comment_block,
      $.directive
    ),

    _any_liquid_statement: $ => choice(
      alias($._assign_statement, $.liquid_assign_statement),
      alias($._increment_statement, $.liquid_increment_statement),
      // alias($._decrement_statement, $.liquid_decrement_statement),
      $.liquid_for_block,
      // $.liquid_case_block,
      // $.liquid_if_block,
      $.liquid_unless_block
    ),

    directive: $ => directive(
      optional($._code),
    ),

    assign_directive: $ => directive($._assign_statement),

    _assign_statement: $ => seq(
      "assign",
      $.assignment_expression
    ),

    increment_directive: $ => directive($._increment_statement),

    _increment_statement: $ => seq(
      "increment",
      // Operates in a separate namespace from other variables, so this can
      // only ever be an identifier.
      $.identifier
    ),


    decrement_directive: $ => directive($._decrement_statement),

    _decrement_statement: $ => seq(
      "decrement",
      $.identifier
    ),

    // Any external document content. This is an injection target.
    content: _ => prec.right(repeat1(/[^{]+/)),

    // FOR

    for_block: $ => prec.left(seq(
      $.for_directive,
      repeat($._any),
      optional(
        seq(
          $.else_directive,
          repeat($._any)
        )
      ),
      $.endfor_directive
    )),

    for_directive: $ => directive(
      $._for_statement
    ),

    endfor_directive: _ => directive("endfor"),

    _for_statement: $ => seq(
      "for",
      field('left', $.identifier),
      "in",
      field('right', $._iterable_value),
      // optional("reversed")
    ),

    liquid_for_block: $ => prec.left(seq(
      $._for_statement,
      repeat($._any_liquid_statement),
      optional(
        seq(
          "else",
          repeat($._any_liquid_statement),
        )
      ),
      "endfor"
    )),

    // CASE

    case_block: $ => seq(
      $.case_directive,
      prec.right(1, repeat(
        seq(
          $.when_directive,
          prec.left(1, repeat($._any)),
        )
      )),
      optional(
        seq(
          $.else_directive,
          repeat($._any),
        )
      ),
      $.endcase_directive
    ),

    case_directive: $ => directive($._case_statement),

    _case_statement: $ => seq(
      "case",
      $.identifier
    ),

    when_directive: $ => directive($._when_statement),

    _when_statement: $ => seq(
      "when",
      $._literal,
      repeat(
        seq(
          ",",
          $._literal
        )
      )
    ),

    endcase_directive: _ => directive("endcase"),

    liquid_case_block: $ => seq(
      $._case_statement,
      prec.right(1, repeat(
        seq(
          $._when_statement,
          prec.left(1, repeat($._any_liquid_statement)),
        )
      )),
      optional(
        seq(
          "else",
          repeat($._any_liquid_statement)
        )
      ),
      "endcase"
    ),

    // IF

    if_block: $ => seq(
      $.if_directive,
      repeat($._any),
      repeat(
        seq(
          $.elsif_directive,
          optional($._any),
        )
      ),
      repeat(
        seq(
          $.else_directive,
          optional($._any)
        )
      ),
      $.endif_directive
    ),

    if_directive: $ => directive($._if_statement),

    _if_statement: $ => seq(
      "if",
      $._expression
    ),

    elsif_directive: $ => directive($._elsif_statement),

    _elsif_statement: $ => seq(
      "elsif",
      $._expression
    ),

    else_directive: _ => directive("else"),
    endif_directive: _ => directive("endif"),

    liquid_if_block: $ => seq(
      $._if_statement,
      repeat($._any_liquid_statement),
      repeat(
        seq(
          $._elsif_statement,
          optional($._any_liquid_statement)
        )
      ),
      optional(
        seq(
          "else",
          optional($._any_liquid_statement)
        )
      ),
      "endif"
    ),

    // UNLESS

    unless_block: $ => seq(
      $.unless_directive,
      repeat($._any),
      repeat(
        seq(
          $.elsif_directive,
          optional($._any),
        )
      ),
      repeat(
        seq(
          $.else_directive,
          optional($._any)
        )
      ),
      $.endunless_directive
    ),

    unless_directive: $ => directive($._unless_statement),

    _unless_statement: $ =>  seq(
      "unless",
      $._expression
    ),

    endunless_directive: _ => directive("endunless"),

    liquid_unless_block: $ => seq(
      $._unless_statement,
      repeat($._any_liquid_statement),
      repeat(
        seq(
          $._elsif_statement,
          optional($._any_liquid_statement)
        )
      ),
      optional(
        seq(
          "else",
          optional($._any_liquid_statement)
        )
      ),
      "endunless"
    ),

    // CAPTURE
    // (Probably not valid in a `liquid` directive)
    capture_directive: $ => directive($._capture_statement),

    _capture_statement: $ => seq(
      "capture",
      $.identifier
    ),

    endcapture_directive: _ => directive("endcapture"),

    // TABLEROW

    // tablerow_block: $ => prec.left(seq(
    //   $.tablerow_directive,
    //   repeat($._any),
    //   optional(
    //     seq(
    //       $.else_directive,
    //       repeat($._any)
    //     )
    //   ),
    //   $.endtablerow_directive
    // )),
    //
    // tablerow_directive: $ => directive(
    //   seq(
    //     "tablerow",
    //     field('left', $.identifier),
    //     "in",
    //     field('right', $._iterable_value),
    //     optional($.tablerow_parameters)
    //   )
    // ),
    //
    // tablerow_parameters: $ => {
    //   repeat1(
    //     seq(
    //       $.identifier,
    //       ':',
    //       $._value
    //     )
    //   )
    // },
    //
    // endtablerow_directive: _ => directive("endtablerow"),

    // TODO: This one is also tricky. It can span multiple lines as long as
    // each line begins with `#`. Scanner candidate.
    line_comment: _ => directive(
      seq(
        "#",
        /[^}]+/
      )
    ),

    // RAW
    // (Probably not valid in a `liquid` directive)
    raw_block: $ => seq(
      $.raw_directive,
      optional(alias($._raw_content, $.content)),
      // repeat($._any), // TODO: Scanner
      $.endraw_directive
    ),

    raw_directive: _ => directive("raw"),
    endraw_directive: _ => directive("endraw"),

    // COMMENT
    // (Probably not valid in a `liquid` directive)

    comment_block: $ => seq(
      $.comment_directive,
      optional(alias($._block_comment_content, $.comment)),
      $.endcomment_directive
    ),

    comment_directive: _ => directive("comment"),
    endcomment_directive: _ => directive("endcomment"),

    // LIQUID

    liquid_directive: $ => directive(
      seq(
        "liquid",
        // "foo"
        optional($._liquid_block_content),
      )
    ),

    _liquid_block_content: $ => repeat1($._any_liquid_statement),

    _liquid_directive_content: $ => choice(
      alias($._assign_statement, $.liquid_assign_statement),
      alias($._increment_statement, $.liquid_increment_statement),
      alias($._decrement_statement, $.liquid_decrement_statement),
      // TODO: Echo
    ),

    // OUTPUT

    output_directive: $ => seq(
      choice("{{", "{{-"),
      optional($._code),
      choice("}}", "-}}")
    ),

    comment: _ => token(choice(
      seq("{%", /\s#/, /[^%-]+/,),
    )),

    _code: $ => repeat1(
      choice(
        $._expression
      )
    ),

    // control_code: _ => choice(
    //   ""
    // ),

    _literal: $ => choice(
      $.string,
      $.number,
      $.boolean,
      $.empty
    ),

    string: _ => choice(
      seq("'", /[^']*/, "'"),
      seq('"', /[^"]*/, '"')
    ),

    number: $ => choice(
      $._integer,
      $._float
    ),

    _integer: _ => /-?\d+/,
    _float: _ => /-?\d+\.\d+/,

    boolean: _ => choice('true', 'false'),

    empty: _ => "empty",

    _value: $ => prec(2, choice(
      $._variable,
      $._literal,
    )),

    _iterable_value: $ => choice(
      $._variable,
      $.range_expression
    ),

    _variable: $ => choice(
      $.identifier,
      $.selector_expression,
    ),

    _expression: $ => choice(
      $.identifier,
      $.include_expression,
      $.render_expression,
      $.selector_expression,
      $.binary_expression,
      $._filter_expressions,
      $._literal
      // TODO: add more expression types
    ),

    _filter_expressions: $ => choice(
      alias($._simple_filter, $.filter_expression),
      $.filter_expression
    ),

    _simple_filter: $ => seq(
      "|",
      field('name', $.identifier)
    ),

    filter_expression: $ => seq(
      "|",
      field('name', $.identifier),
      ":",
      field('parameter', $._value),
      repeat(
        seq(
          ",",
          field('parameter', $._value),
        )
      )
    ),

    selector_expression: $ => choice(
      prec(1, seq(
        field('operand', $.identifier),
        repeat1(
          seq(
            '.',
            field('field', $.identifier)
          )
        )
      )
    )),

    range_expression: $ => seq(
      '(',
      field('start', choice(
        $._variable,
        alias($._integer, $.number)
      )),
      token.immediate('..'),
      field('end', choice(
        $._variable,
        alias($._integer, $.number)
      )),
      ')'
    ),

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    _binary_operator: _ => choice(
      "==",
      "!=",
      ">",
      "<",
      ">=",
      "<=",
      "or",
      "and",
    ),

    // special case binary operator
    _contains_operator: _ => "contains",

    _assignment_operator: _ => "=",

    include_expression: $ => seq(
      "include",
      field('file', $.string)
    ),

    render_expression: $ => prec.left(seq(
      "render",
      field('file', $.string),
      optional(
        choice(
          field('parameters', $.render_parameters),
          $._render_with_as,
          $._render_for_as
        )
      ))
    ),

    render_parameters: $ => repeat1($.render_parameter),

    render_parameter: $ => seq(
      ',',
      field('key', $.identifier),
      ':',
      field('value', $._value)
    ),

    _render_with_as: $ => seq(
      "with",
      $._variable,
      "as",
      $.identifier
    ),

    _render_for_as: $ => seq(
      "for",
      $._variable,
      "as",
      $.identifier
    ),

    binary_expression: $ => choice(
      prec.right(1, seq(
        field('left', $._expression),
        $._binary_operator,
        field('right', $._expression)
      )),
      prec.right(1, seq(
        field('left', $._expression),
        $._contains_operator,
        field('left', $.string)
      ))
    ),

    assignment_expression: $ => prec.right(1,
      seq(
        field('left', $.identifier),
        "=",
        field('right', $._value),
        optional($._code)
      ),
    ),

  }
});
