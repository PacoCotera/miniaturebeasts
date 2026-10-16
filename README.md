# Work queue

Tickets are self-contained work orders. Any worker that can run git (this pool, another pool, a local agent on a local model) can take them by following WORKER.md. State is the folder a ticket sits in: ready → claimed → review → done, or parked. The programme lead writes tickets, reviews results, merges by PR and moves tickets to done. Reviews (art sign-off, creative gate) are tickets too.
