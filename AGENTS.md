# Project Conventions

## Testing & DOM Selectors
When writing tests or E2E simulations (e.g., using `Simulator.ts`), **NEVER** use brittle CSS selectors like `.classname`, `div:has-text()`, or index-based paths.
You **MUST** use `data-testid` attributes on interactive or queryable HTML elements.
*   **Good**: `data-testid="my-button"`
*   **Bad**: `className="my-button"`, `> div > span`

Always update the React components to include `data-testid` attributes before trying to target them in tests.
