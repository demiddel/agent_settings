# Documentation impact checks

The repository uses `.docs-map.yml` to connect code paths with the documentation that explains them. The map is intentionally small so this repository can demonstrate the pattern without copying a real application's structure.

When a pull request changes a mapped path, the pull request body should select exactly one Documentation impact option and list every expected document. The validator accepts an update when at least one mapped document changed, or a review declaration when the existing documentation remains accurate and the reason is explained.

The `apps/client` directory is dummy content used to make the example concrete. It is safe to replace or extend with other generic fixtures as the guidance collection grows.
