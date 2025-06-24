# tree-sitter-liquid

A [Tree-sitter][] parser for [Liquid templates][Liquid].

Nominally based on [`adamazing/tree-sitter-liquid`](git@github.com:savetheclocktower/tree-sitter-liquid.git), but with vast modifications.

## What’s supported?

Nearly anything documented on either [Shopify’s Liquid site][Liquid] or the [LiquidJS site][LiquidJS].

## What isn’t (yet) supported?

* [Jekyll’s custom tags](https://jekyllrb.com/docs/liquid/tags/) are not implemented. Custom tags are annoying because it’s impossible to know how to highlight them; there is no standard for the content after the tag name. I’ll eventually add these and also add some sort of fallback mode for tags that aren’t recognized but seem valid.
* [Jekyll-like filenames](https://liquidjs.com/tags/render.html#Jekyll-like-Filenames) in `render` tags.
* Escape sequences are properly recognized within strings, but [Liquid within Liquid strings](https://liquidjs.com/tags/render.html#Outputs-amp-Filters) is not parsed or highlighted. It’s parsed as an ordinary string value with no special meaning.
* [Liquid Drops](https://liquidjs.com/tutorials/drops.html) have no special meaning — not even the ones that are active by default. They’ll all be interpreted as ordinary identifiers (as they would be if the drop were not active). If you want special syntax highlighting, you can likely highlight them in your editor of choice via a `#match?` query.

[Tree-sitter]: https://tree-sitter.github.io/tree-sit
[Liquid]: https://shopify.github.io/liquid/
[LiquidJS]: https://liquidjs.com/index.html
