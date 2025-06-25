# tree-sitter-liquid

A [Tree-sitter][] parser for [Liquid templates][Liquid].

Nominally based on [`adamazing/tree-sitter-liquid`](git@github.com:savetheclocktower/tree-sitter-liquid.git), but with vast modifications.

## What’s supported?

Nearly anything documented on either [Shopify’s Liquid site][Liquid] or the [LiquidJS site][LiquidJS].

## What isn’t (yet) supported?

* [Jekyll’s custom tags](https://jekyllrb.com/docs/liquid/tags/) are not specifically implemented. Custom tags in general are supported, but this parser cannot reasonably know which custom tags are “paired” (like `{% highlight %}`/`{% endhighlight %}`) and which are “unpaired” (like `{% link news/index.html %}`, which has no corresponding `{% endlink %}` later in the file).

    That means that built-in blocks — `for`, `if`, `unless`, etc. — are structured more usefully in the output than custom paired tags. The hypothetical `{% highlight %}` and `{% endhighlight %}` will each be recognized as its own unpaired tag, and they will have no formal or structured relationship to one another in the parse tree.

* [Jekyll-like filenames](https://liquidjs.com/tags/render.html#Jekyll-like-Filenames) in `render` tags are not supported, nor are any other unquoted strings in tags.

* Escape sequences are properly handled within strings, but [Liquid within Liquid strings](https://liquidjs.com/tags/render.html#Outputs-amp-Filters) is not parsed or highlighted. It’s parsed as an ordinary string value with no special meaning.

* [Liquid Drops](https://liquidjs.com/tutorials/drops.html) are given no special meaning or node type — not even the ones that are active by default, like the special `forloop` identifier within a `{% for %}` block. They’ll all be interpreted as ordinary `identifier`s. If you want special syntax highlighting, you can likely highlight them in your editor of choice via a `#match?` query.

[Tree-sitter]: https://tree-sitter.github.io/tree-sit
[Liquid]: https://shopify.github.io/liquid/
[LiquidJS]: https://liquidjs.com/index.html
