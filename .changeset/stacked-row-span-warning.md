---
"@ionizeio/canvas": patch
---

A `span` on a child of a `Row stacks` no longer logs the development warning that the span does nothing while the Row is stacked. The span is still a Row child's, and it applies again as soon as the Row unstacks. To tell the two cases apart, the layout-axis context a stacked Row publishes (`useLayoutAxis()`) now carries `stacked: true`. The field is optional and absent everywhere else, so existing readers of the context see no change.
