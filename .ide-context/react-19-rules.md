# React 19 Actionable Development Rules

## 1. Core Hooks & APIs

### `useActionState` (Formerly `useFormState`)
* **Purpose**: Manages Action state (error, data, pending status) in form submissions.
* **Signature**:
  ```javascript
  const [state, formAction, isPending] = useActionState(fn, initialState, permalink?);
  ```
* **Key Rules**:
  1. The handler function `fn` receives `(previousState, formData)` as arguments and must return the new state.
  2. `isPending` automatically indicates whether the async action is currently executing.
  3. Replace the deprecated `useFormState` (from React Canary) with `useActionState`.

### `useFormStatus`
* **Purpose**: Allows child components within a `<form>` to access the parent form's submission status without prop drilling.
* **Signature**:
  ```javascript
  const { pending, data, method, action } = useFormStatus();
  ```
* **Key Rules**:
  1. Must be called in a component that is rendered *inside* a `<form>`. It will not read status if called in the component that renders the `<form>` itself.
  2. Works like a context reader for the nearest parent form.

### `useOptimistic`
* **Purpose**: Performs immediate, optimistic UI updates while an async mutation is ongoing.
* **Signature**:
  ```javascript
  const [optimisticState, setOptimisticState] = useOptimistic(state, updateFn);
  ```
* **Key Rules**:
  1. `state` is the source of truth value (e.g. `currentName`).
  2. `updateFn(currentState, optimisticValue)` defines how to merge the optimistic change.
  3. Trigger `setOptimisticState(optimisticValue)` immediately inside the action/transition before awaiting the API call. React automatically reverts to `state` if the action fails or finishes.

### `use`
* **Purpose**: Reads resource values (Promises or Context) inline during rendering.
* **Signature**:
  ```javascript
  const value = use(resource);
  ```
* **Key Rules**:
  1. **Conditional Call**: Unlike other hooks, `use` can be called conditionally or inside loops.
  2. **No Render Promises**: `use` does **not** support promises created within the render function. Promises must be created outside, cached/memoized, or passed from Server Components.
  3. **Suspense**: If the promise is pending, the component suspends and displays the nearest `<Suspense>` fallback.

---

## 2. Actions & Async Transitions

* **Definition**: Any function that performs an async mutation and runs inside a React transition (e.g., via `startTransition`).
* **Form Action Integration**:
  - React 19 natively supports passing functions directly to the `action` and `formAction` props on `<form>`, `<input>`, and `<button>`.
  ```jsx
  <form action={submitAction}>
  ```
* **Automatic Reset**: Form elements automatically reset for uncontrolled components upon a successful Action execution.
* **Manual Reset**: Use `requestFormReset()` from `react-dom` if a manual form reset is required.
* **Transition Scope**: Actions run in a transition, setting `isPending` to `true` instantly and keeping the interface responsive during long network calls.

---

## 3. Document Metadata Support

* **Native Hoisting**: Document metadata tags (`<title>`, `<meta>`, `<link>`) can be declared anywhere in the component tree.
* **Deduplication**: React automatically moves these tags to the `<head>` of the document and deduplicates identical tags.
* **Usage**:
  ```jsx
  function BlogPost({ post }) {
    return (
      <article>
        <h1>{post.title}</h1>
        <title>{post.title}</title>
        <meta name="description" content={post.excerpt} />
      </article>
    );
  }
  ```

---

## 4. Stylesheets & Preloading Resources

### Stylesheet Priority (`precedence`)
* If you provide a `precedence` prop to a `<link rel="stylesheet">`, React manages its insertion order and guarantees the stylesheet is loaded before rendering dependent content.
  ```jsx
  <link rel="stylesheet" href="styles.css" precedence="high" />
  ```
* Valid values: `default`, `high`, `low`, etc. React deduplicates stylesheets so they are only loaded once.

### Resource Preloading APIs
Import from `react-dom` to tell the browser about resources eagerly:
* `prefetchDNS(href)`: Resolves hostnames.
* `preconnect(href)`: Warms up connection handshakes.
* `preload(href, { as })`: Preloads high-priority assets (e.g., fonts, stylesheets).
* `preinit(href, { as: 'script' })`: Loads and executes external scripts eagerly.

---

## 5. React Server Components (RSC) Rules

* **Client Actions vs. Server Actions**:
  - **Server Actions**: Defined with `"use server"`. Executed on the server. Can be called from both Client and Server Components.
  - **Client Actions**: Standard javascript functions that run on the client, often calling a Server Action via fetch/RPC.
* **Component Serialization**: Arguments passed to Server Actions from Client Components must be serializable (no functions, raw DOM nodes, or complex classes).
* **Pre-warming**: Suspended trees are pre-warmed on the client during concurrent transitions.
