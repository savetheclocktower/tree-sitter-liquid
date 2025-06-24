package tree_sitter_liquid_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_liquid "github.com/savetheclocktower/tree-sitter-liquid/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_liquid.Language())
	if language == nil {
		t.Errorf("Error loading Liquid grammar")
	}
}
