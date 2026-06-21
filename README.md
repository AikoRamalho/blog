# Blog — Event-Driven Microservices

A small blogging platform (create posts, comment on them, auto-moderate comments) built as a
distributed system to explore **event-driven microservices**, **CQRS**, and **Kubernetes**.

The application itself is intentionally simple — the value of this project is the *architecture*:
six independently deployable services that never call each other directly, coordinating entirely
through an asynchronous event bus, fronted by an Nginx Ingress and orchestrated locally with
Skaffold.

> **Scope note:** data is stored **in memory** in each service (no database). This is a deliberate
> simplification to keep the focus on inter-service communication, eventual consistency, and the
> deployment model rather than persistence.

---

## Architecture at a glance

```
                          ┌──────────────────────────────┐
                          │        Nginx Ingress         │   host: posts.com
                          │  (path-based routing)        │
                          └──────────────────────────────┘
            /  ┌───────────────┬──────────────┬───────────────────────┐
               │               │              │                       │
        /posts/create        /posts      /posts/:id/comments        /?(.*)
               │               │              │                       │
               ▼               ▼              ▼                       ▼
         ┌──────────┐    ┌──────────┐   ┌──────────┐          ┌──────────┐
         │  posts   │    │  query   │   │ comments │          │  client  │
         │  :4000   │    │  :4002   │   │  :4001   │          │ (React)  │
         └────┬─────┘    └────▲─────┘   └────┬─────┘          └──────────┘
              │ emits         │ projects     │ emits
              │ events        │ read model   │ events
              ▼               │              ▼
         ┌─────────────────────────────────────────────┐
         │                event-bus :4005               │  fan-out + event store
         └─────────────────────────────────────────────┘
              │                                  ▲
              │ CommentCreated                   │ CommentModerated
              ▼                                  │
         ┌──────────┐                            │
         │moderation│────────────────────────────┘
         │  :4003   │
         └──────────┘
```

Every service exposes a `POST /events` endpoint. When something happens, a service emits an event to
the **event-bus**, which persists it and **broadcasts** it to *all* services. Each service decides
which event types it cares about. No service holds a reference to another service's business logic —
they only share an event contract.

---

## Services

| Service       | Port  | Responsibility                                                                 |
|---------------|-------|--------------------------------------------------------------------------------|
| `client`      | 3000  | React UI (Create React App) — create posts, list posts with comments           |
| `posts`       | 4000  | Source of truth for posts; emits `PostCreated`                                  |
| `comments`    | 4001  | Source of truth for comments; emits `CommentCreated` / `CommentUpdated`         |
| `moderation`  | 4003  | Approves/rejects comments; emits `CommentModerated`                             |
| `query`       | 4002  | **Read model** — denormalized posts-with-comments view (CQRS)                   |
| `event-bus`   | 4005  | Receives events, stores them, fans them out to all services                    |

---

## Event flow

A comment going from creation to a moderated, queryable state crosses four services without any of
them calling each other directly:

1. **`CommentCreated`** — `comments` stores the comment with `status: 'pending'` and emits the event.
2. **`CommentModerated`** — `moderation` inspects the content (rejects anything containing the word
   `"orange"`) and emits the verdict (`approved` / `rejected`).
3. **`CommentUpdated`** — `comments` applies the moderation result to its own copy and re-emits a
   clean update event.
4. The **`query`** service projects `PostCreated`, `CommentCreated`, and `CommentUpdated` into its
   denormalized read model, which is what the client actually reads from.

```
comments ──CommentCreated──▶ bus ──▶ moderation ──CommentModerated──▶ bus ──▶ comments
                                                                                  │
                                                                          CommentUpdated
                                                                                  ▼
                                                                                 bus ──▶ query
```

---

## Architectural decisions

These are the choices the project was built to demonstrate, and the trade-offs behind them.

### 1. Event-driven communication over direct calls
Services communicate **asynchronously** through the event bus rather than via synchronous
service-to-service HTTP. This decouples producers from consumers: `posts` doesn't know `query`
exists, and a new consumer can be added without touching any existing service. The cost is **eventual
consistency** — the read model lags the write side by the time it takes an event to propagate.

### 2. CQRS — a dedicated query service
Reads and writes are separated. `posts` and `comments` own the **write** side (normalized, one
concern each); the `query` service maintains a **read-optimized**, denormalized "post with its
comments" projection. The client makes a single call to `query` instead of fanning out to `posts` and
`comments` and stitching the result together on the front end.

### 3. Event store + replay for catch-up
The event-bus keeps every event it has ever received and exposes `GET /events`. On startup the
`query` service **replays the full event history** to rebuild its in-memory projection. This is the
recovery story for a stateless read model: a service can crash, restart, or be introduced *after* the
fact and still converge to the correct state.

### 4. One service per domain concern
`posts`, `comments`, `moderation`, and `query` are split by responsibility, each independently
deployable with its own `Dockerfile` and `package.json`. Moderation in particular is isolated so the
(here trivial) policy can evolve without redeploying the comment write path.

### 5. Kubernetes networking: ClusterIP + Ingress
- Internal traffic uses **ClusterIP** services (`event-bus-srv`, `comments-srv`, `query-srv`,
  `moderation-srv`, `posts-clusterip-srv`) — stable in-cluster DNS names, not exposed publicly.
- A single **Nginx Ingress** is the only public entry point, routing by path:
  `/posts/create` → posts, `/posts` → query, `/posts/:id/comments` → comments, everything else →
  client. This keeps the front end talking to one origin and removes CORS/host sprawl.

### 6. Skaffold for the local dev loop
`skaffold.yaml` builds all six images and deploys the manifests in `infra/k8s/` with a single
`skaffold dev`, with **file sync** configured so source changes hot-reload into the running pods
instead of triggering a full image rebuild.

### 7. TypeScript on the back end
Every back-end service is written in TypeScript and compiled to `dist/` before running, giving typed
event payloads and request/response handling across the services.

---

## Tech stack

- **Back end:** Node.js, Express, TypeScript, Axios
- **Front end:** React (Create React App)
- **Messaging:** custom HTTP event bus (store + fan-out)
- **Containerization:** Docker (one image per service)
- **Orchestration:** Kubernetes (Deployments, ClusterIP Services, Nginx Ingress)
- **Dev workflow:** Skaffold with manual file sync

---

## Running locally

**Prerequisites:** Docker, a local Kubernetes cluster (e.g. Docker Desktop or Minikube), the
[Nginx Ingress controller](https://kubernetes.github.io/ingress-nginx/deploy/), and
[Skaffold](https://skaffold.dev/).

1. Map the Ingress host to localhost — add this line to `/etc/hosts`:
   ```
   127.0.0.1 posts.com
   ```
2. From the project root, start everything:
   ```bash
   skaffold dev
   ```
   This builds all six images, applies the manifests in `infra/k8s/`, and watches for changes.
3. Open **http://posts.com** in your browser.

> Try posting a comment containing the word **"orange"** — the moderation service will reject it, and
> you'll see the status propagate through the event chain to the UI.

---

## Project structure

```
.
├── client/           # React front end
├── posts/            # Posts write service (TS/Express)
├── comments/         # Comments write service (TS/Express)
├── moderation/       # Comment moderation service (TS/Express)
├── query/            # CQRS read model (TS/Express)
├── event-bus/        # Event store + fan-out (TS/Express)
├── infra/k8s/        # Kubernetes manifests (Deployments, Services, Ingress)
└── skaffold.yaml     # Local build + deploy orchestration
```

---

## Possible next steps

The in-memory, fire-and-forget design has clear evolution paths, each mapping to a real distributed-
systems concern:

- **Persistence** per service (e.g. MongoDB for the query read model) so state survives restarts.
- **A real message broker** (NATS / Kafka / RabbitMQ) in place of the HTTP event bus, for delivery
  guarantees, retries, and consumer offsets.
- **Idempotency / event ordering** handling, since the current fan-out is best-effort and unordered.
- **Health checks, resource limits, and multiple replicas** on the Deployments.
