#include "tree_sitter/parser.h"
#include <string.h>
#include <wctype.h>
#include <stdio.h>

#define DEBUG 0

#if DEBUG == 1
#define PRINTF(...) printf(__VA_ARGS__)
#else
#define PRINTF(...)
#endif

typedef enum TokenType {
  RAW_CONTENT,
  BLOCK_COMMENT_CONTENT,
  LINE_COMMENT,
  LINE_COMMENT_IN_COMMENT_DIRECTIVE,
  ERROR_SENTINEL
} TokenType;

void *tree_sitter_liquid_external_scanner_create() { return NULL; }
void tree_sitter_liquid_external_scanner_destroy(void *p) {}
void tree_sitter_liquid_external_scanner_reset(void *p) {}
unsigned tree_sitter_liquid_external_scanner_serialize(void *p, char *buffer) { return 0; }
void tree_sitter_liquid_external_scanner_deserialize(void *p, const char *b, unsigned n) {}

static void skip_initial_whitespace(TSLexer *lexer) {
  while (iswspace(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }
}

static void skip_internal_whitespace(TSLexer *lexer) {
  while (iswspace(lexer->lookahead)) {
    lexer->advance(lexer, false);
  }
}

static bool scan_for_opening_tag(TSLexer *lexer) {
  skip_initial_whitespace(lexer);
  if (lexer->eof(lexer) || lexer->lookahead != '{') {
    return false;
  }
  lexer->advance(lexer, false);
  if (lexer->eof(lexer) || lexer->lookahead != '%') {
    return false;
  }
  lexer->advance(lexer, false);
  if (!iswspace(lexer->lookahead)) {
    return false;
  }
  return true;
}

static bool scan_for_closing_tag(TSLexer *lexer) {
  skip_initial_whitespace(lexer);
  if (lexer->lookahead != '%') {
    return false;
  }
  lexer->advance(lexer, false);
  if (lexer->lookahead != '}') {
    return false;
  }
  lexer->advance(lexer, false);
  return true;
}

static bool scan_for_directive(TSLexer *lexer, const char *directive_name) {
  PRINTF("scan_for_directive character: [%c]\n", lexer->lookahead);
  skip_initial_whitespace(lexer);
  if (!scan_for_opening_tag(lexer)) {
    return false;
  }

  skip_internal_whitespace(lexer);

  PRINTF("checking that the next sequence of characters matches: [%s]\n", directive_name);
  for (int i = 0; i < strlen(directive_name); i++) {
    if (lexer->eof(lexer)) {
      return false;
    }
    if (lexer->lookahead != directive_name[i]) {
      PRINTF("Bailed! Character [%c] does not equal desired character [%c]\n", lexer->lookahead, directive_name[i]);
      return false;
    }
    lexer->advance(lexer, false);
  }
  PRINTF("Success! This is the correct directive name! Continuing…\n");

  skip_internal_whitespace(lexer);

  while (lexer->lookahead) {
    if (lexer->eof(lexer)) {
      return false;
    }
    if (lexer->lookahead == '%') {
      if (scan_for_closing_tag(lexer)) {
        PRINTF("Got through closing tag!\n");
        return true;
      }
    } else {
      lexer->advance(lexer, false);
    }
  }
  return true;
}

static bool scan_for_line_comment(TSLexer *lexer, bool enforce_new_line) {
  PRINTF("In scan_for_line_comment\n");
  if (enforce_new_line) {
    // Advance to the start of the next line…
    while (!lexer->eof(lexer) && lexer->get_column(lexer) != 0) {
      // …but if we encounter any non-whitespace along the way, bail.
      if (!iswspace(lexer->lookahead)) {
        return false;
      }
      lexer->advance(lexer, true);
    }
    // Also, if we stopped because we're at EOL, bail.
    if (lexer->eof(lexer)) return false;

    // Now we're at the start of the line.
  }

  PRINTF("Advancing through whitespace…\n");
  while (iswspace(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }
  PRINTF("Next character: %c\n", lexer->lookahead);
  if (lexer->lookahead != '#') {
    return false;
  }
  // A `#` is the first non-whitespace character on this line. Hence this
  // entire line is a line comment!
  lexer->advance(lexer, false);
  while (!lexer->eof(lexer) && lexer->get_column(lexer) != 0) {
    if (lexer->lookahead == '%') {
      PRINTF("Might be end tag…\n");
      // A closing tab (`%}`) would mean we should end the comment before the
      // tag. Mark it at this point just to play it safe.
      lexer->mark_end(lexer);
      if (scan_for_closing_tag(lexer)) {
        PRINTF("…it is!\n");
        return true;
      }
    }
    lexer->advance(lexer, false);
  }
  // If we get this far, we're at either the end of the line or the end of the
  // file.
  lexer->mark_end(lexer);
  return true;
}

static bool scan_for_unparsed_content(TSLexer *lexer, const char *end_directive_name) {
  bool did_match = false;
  PRINTF(
    "scan_for_unparsed_content character: [%c] col: (%d)\n",
    lexer->lookahead,
    lexer->get_column(lexer)
  );
  if (lexer->lookahead != '{') {
    did_match = true;
  } else if (scan_for_directive(lexer, end_directive_name)) {
    // We had an immediate `{` and we wanted to figure out whether it was the
    // start of `{% endraw %}` or just a stray brace. In this code path, we had
    // an immediate `{% endraw %}`, so there is no content block yet. Hence
    // we return `false`.
    return false;
  }
  // But if we get this far, we know there's at least one character of raw
  // content. Inch forward, moving the ending bound of the range as you
  // progress; only stop moving the bound once you hit a brace, and then only
  // until you can confirm whether or not this person is your nemesis.
  lexer->mark_end(lexer);
  while (lexer->lookahead) {
    PRINTF("Considering [%c]\n", lexer->lookahead);
    if (lexer->eof(lexer)) {
      return false;
    }
    if (lexer->lookahead == '{') {
      PRINTF("Found a maybe-directive…\n");
      if (scan_for_directive(lexer, end_directive_name)) {
        // We had a whole `{% endraw %}` directive at the end. We looked ahead
        // only as far as we needed to in order to confirm that. But we marked
        // a position before this directive even started. That's the end of
        // this node.
        PRINTF("It's an ACTUAL directive!\n");
        return true;
      } else {
        lexer->mark_end(lexer);
      }
    } else {
      lexer->mark_end(lexer);
    }
    lexer->advance(lexer, false);
  }
  return false;
}

bool tree_sitter_liquid_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  PRINTF(
    "SCAN character: [%c] col: (%d) validity: %i, %i, %i, %i, %i\n",
    lexer->lookahead,
    lexer->get_column(lexer),
    valid_symbols[RAW_CONTENT],
    valid_symbols[BLOCK_COMMENT_CONTENT],
    valid_symbols[LINE_COMMENT],
    valid_symbols[LINE_COMMENT_IN_COMMENT_DIRECTIVE],
    valid_symbols[ERROR_SENTINEL]
  );

  if (valid_symbols[LINE_COMMENT_IN_COMMENT_DIRECTIVE]) {
    if (scan_for_line_comment(lexer, false)) {
      PRINTF("Matched LINE_COMMENT_IN_COMMENT_DIRECTIVE!\n\n\n");
      lexer->result_symbol = LINE_COMMENT_IN_COMMENT_DIRECTIVE;
      return true;
    }
  }

  if (valid_symbols[LINE_COMMENT]) {
    if (scan_for_line_comment(lexer, true)) {
      PRINTF("Matched LINE_COMMENT!\n\n\n");
      lexer->result_symbol = LINE_COMMENT;
      return true;
    }
  }

  // We might want more nuanced behavior here in the future, but for now we'll
  // simply decline to use the external scanner during error recovery.
  if (valid_symbols[ERROR_SENTINEL]) return false;

  if (valid_symbols[RAW_CONTENT]) {
    if (scan_for_unparsed_content(lexer, "endraw")) {
      PRINTF("Matched RAW_CONTENT!\n\n\n");
      lexer->result_symbol = RAW_CONTENT;
      return true;
    }
  }

  if (valid_symbols[BLOCK_COMMENT_CONTENT]) {
    if (scan_for_unparsed_content(lexer, "endcomment")) {
      PRINTF("Matched BLOCK_COMMENT_CONTENT!\n\n\n");
      lexer->result_symbol = BLOCK_COMMENT_CONTENT;
      return true;
    }
  }


  return false;
}
