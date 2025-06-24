import XCTest
import SwiftTreeSitter
import TreeSitterLiquid

final class TreeSitterLiquidTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_liquid())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Liquid grammar")
    }
}
